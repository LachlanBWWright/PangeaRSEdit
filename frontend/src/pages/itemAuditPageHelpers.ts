import { Group } from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { ResultAsync } from "neverthrow";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import { mapErr } from "@/utils/mapErr";
import {
  buildItemAuditEntries,
  type ItemAuditDecision,
} from "./itemAuditUtils";
import { importedDecisionSchema } from "@/schemas/common";

export const PARAM_KEYS: ("p0" | "p1" | "p2" | "p3")[] = [
  "p0",
  "p1",
  "p2",
  "p3",
];

export function extractSubgroupByIndex(
  gltf: GLTF,
  modelIndex: number,
  groupSize: number,
): Group | null {
  const groupsContainer =
    gltf.scene.children && gltf.scene.children.length > 0
      ? gltf.scene.children[0]
      : null;
  if (!groupsContainer) return null;
  if (modelIndex < 0 || modelIndex >= groupsContainer.children.length)
    return null;

  const endIndex = Math.min(
    modelIndex + groupSize,
    groupsContainer.children.length,
  );
  const extracted = new Group();
  for (let index = modelIndex; index < endIndex; index++) {
    const child = groupsContainer.children[index];
    if (child) extracted.add(child.clone(true));
  }
  return extracted.children.length > 0 ? extracted : null;
}

export function isEntryFullyRated(entry: ItemAuditDecision): boolean {
  return (
    entry.modelStatus !== "unknown" &&
    entry.paramStatus.p0 !== "unknown" &&
    entry.paramStatus.p1 !== "unknown" &&
    entry.paramStatus.p2 !== "unknown" &&
    entry.paramStatus.p3 !== "unknown"
  );
}

export function parseImportedDecisions(
  entriesValue: unknown[],
): Record<number, ItemAuditDecision> {
  const nextDecisions: Record<number, ItemAuditDecision> = {};
  for (const entry of entriesValue) {
    const result = importedDecisionSchema.safeParse(entry);
    if (!result.success) {
      continue;
    }
    nextDecisions[result.data.itemType] = result.data.decision;
  }
  return nextDecisions;
}

export function firstIncompleteIndex(
  entries: ReturnType<typeof buildItemAuditEntries>,
): number {
  const index = entries.findIndex(
    (entry) => !isEntryFullyRated(entry.decision),
  );
  return index === -1 ? 0 : index;
}

interface PreviewMapping {
  modelFile?: string;
  modelPath?: string;
  modelIndex?: number;
  groupSize?: number;
  scale?: number;
  scaleXZ?: number;
  scaleY?: number;
  rotationY?: number;
  positionOffset?: [number, number, number];
}

interface PreviewConfig {
  basePath: string;
}

interface PreviewEntry {
  modelIndex?: number;
  modelGroupSize: number;
}

export async function loadPreviewScene(
  currentEntry: PreviewEntry | null,
  currentConfig: PreviewConfig | undefined,
  previewMapping: PreviewMapping | undefined,
): Promise<{ scene: Group | null; error: string | null }> {
  const worker = new BG3DGltfWorker();
  const finish = (scene: Group | null, error: string | null) => {
    worker.terminate();
    return { scene, error };
  };
  if (
    !currentEntry ||
    !currentConfig ||
    !previewMapping?.modelFile ||
    !previewMapping?.modelPath
  ) {
    return finish(null, null);
  }

  const modelUrl = `${currentConfig.basePath}/${previewMapping.modelPath}/${previewMapping.modelFile}`;
  const responseResult = await ResultAsync.fromPromise(fetch(modelUrl), mapErr);
  if (responseResult.isErr()) {
    return finish(null, responseResult.error.message);
  }

  const response = responseResult.value;
  if (!response.ok) {
    return finish(null, `Failed to load model (${response.status})`);
  }

  const arrayBufferResult = await ResultAsync.fromPromise(
    response.arrayBuffer(),
    mapErr,
  );
  if (arrayBufferResult.isErr()) {
    return finish(null, arrayBufferResult.error.message);
  }
  const arrayBuffer = arrayBufferResult.value;

  const workerResult = await ResultAsync.fromPromise(
    new Promise<BG3DGltfWorkerResponse>((resolve, reject) => {
      worker.onmessage = (event) => resolve(event.data);
      worker.onerror = (event) =>
        reject(new Error(event.message || "Model conversion worker failed"));
      worker.postMessage({ type: "bg3d-to-glb", buffer: arrayBuffer }, [
        arrayBuffer,
      ]);
    }),
    mapErr,
  );
  if (workerResult.isErr()) {
    return finish(null, workerResult.error.message);
  }

  const converted = workerResult.value;
  if (converted.type !== "bg3d-to-glb") {
    const message =
      converted.type === "error"
        ? converted.error
        : "Unexpected model conversion result";
    return finish(null, message);
  }

  const glbBlob = new Blob([converted.result], { type: "model/gltf-binary" });
  const glbUrl = URL.createObjectURL(glbBlob);
  const loader = new GLTFLoader();
  const gltfResult = await ResultAsync.fromPromise(
    loader.loadAsync(glbUrl),
    mapErr,
  );
  URL.revokeObjectURL(glbUrl);
  if (gltfResult.isErr()) {
    return finish(null, gltfResult.error.message);
  }

  const modelIndex = previewMapping.modelIndex ?? currentEntry.modelIndex ?? 0;
  const extracted = extractSubgroupByIndex(
    gltfResult.value,
    modelIndex,
    previewMapping.groupSize ?? currentEntry.modelGroupSize,
  );
  const previewRoot = (extracted ?? gltfResult.value.scene).clone(true);
  const uniformScale = previewMapping.scale ?? 1;
  const scaleXZ = previewMapping.scaleXZ ?? 1;
  const scaleY = previewMapping.scaleY ?? 1;
  previewRoot.scale.set(
    uniformScale * scaleXZ,
    uniformScale * scaleY,
    uniformScale * scaleXZ,
  );
  previewRoot.rotation.y = previewMapping.rotationY ?? 0;
  if (previewMapping.positionOffset) {
    previewRoot.position.set(
      previewMapping.positionOffset[0],
      previewMapping.positionOffset[1],
      previewMapping.positionOffset[2],
    );
  }
  return finish(previewRoot, null);
}
