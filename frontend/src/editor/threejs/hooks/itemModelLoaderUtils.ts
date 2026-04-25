import { mapErr } from "@/utils/mapErr";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import { ResultAsync } from "neverthrow";
import { Group } from "three";
import { errorSchema } from "@/schemas/common";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";

let requestIdCounter = 0;
const fileGltfCache = new Map<string, Promise<GLTF>>();

export function convertBg3dToGltf(
  worker: Worker,
  buffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const requestId = `req_${++requestIdCounter}`;
  return new Promise<ArrayBuffer>((resolve, reject) => {
    let resolved = false;
    const handleMessage = (e: MessageEvent<BG3DGltfWorkerResponse>) => {
      if (e.data.requestId !== requestId) return;
      resolved = true;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      if (e.data.type === "error")
        reject(new Error(`Worker error: ${e.data.error}`));
      else if (e.data.type === "bg3d-with-skeleton-to-glb" && e.data.result)
        resolve(e.data.result);
    };
    const handleError = (error: ErrorEvent) => {
      if (resolved) return;
      resolved = true;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      reject(new Error(`Worker error: ${error.message || "Unknown error"}`));
    };
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({
      type: "bg3d-with-skeleton-to-glb",
      bg3dBuffer: buffer,
      skeletonData: undefined,
      requestId,
    });
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      reject(new Error("Model loading timeout (60s)"));
    }, 60000);
  });
}

export function loadFileGltf(worker: Worker, fileUrl: string): Promise<GLTF> {
  const cached = fileGltfCache.get(fileUrl);
  if (cached) return cached;

  const promise = (async () => {
    const fetchResult = await ResultAsync.fromPromise(fetch(fileUrl), mapErr);
    if (fetchResult.isErr())
      return Promise.reject(
        new Error(`Failed to fetch: ${fetchResult.error} (${fileUrl})`),
      );
    const response = fetchResult.value;
    if (!response.ok)
      return Promise.reject(
        new Error(`Failed to fetch: ${response.statusText} (${fileUrl})`),
      );
    const bufferResult = await ResultAsync.fromPromise(
      response.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr())
      return Promise.reject(
        new Error(`Failed to read buffer: ${bufferResult.error}`),
      );

    const glbArrayBuffer = await convertBg3dToGltf(worker, bufferResult.value);
    const glbBlob = new Blob([glbArrayBuffer], { type: "model/gltf-binary" });
    const glbUrl = URL.createObjectURL(glbBlob);
    const loader = new GLTFLoader();
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error(`GLTFLoader timeout for ${fileUrl}`)),
        30000,
      );
      loader.load(
        glbUrl,
        (result: GLTF) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        undefined,
        (error: unknown) => {
          clearTimeout(timeoutId);
          const parseResult = errorSchema.safeParse(error);
          const errorMessage = parseResult.success
            ? parseResult.data.message
            : String(error);
          reject(new Error(`GLTFLoader error: ${errorMessage}`));
        },
      );
    });
    URL.revokeObjectURL(glbUrl);
    return gltf;
  })();

  fileGltfCache.set(fileUrl, promise);
  promise.then(undefined, () => {
    fileGltfCache.delete(fileUrl);
  });
  return promise;
}

export function extractSubgroupByIndex(
  gltf: GLTF,
  modelIndex: number,
  groupSize = 1,
): GLTF | null {
  const groupsContainer =
    gltf.scene.children && gltf.scene.children.length > 0
      ? gltf.scene.children[0]
      : null;
  if (!groupsContainer) {
    console.warn(
      `Could not find groups container. Scene has ${gltf.scene.children?.length || 0} children`,
    );
    return null;
  }
  if (modelIndex >= groupsContainer.children.length) {
    console.warn(
      `Model index ${modelIndex} out of range (max ${groupsContainer.children.length - 1})`,
    );
    return null;
  }
  const newScene = new Group();
  const endIndex = Math.min(
    modelIndex + groupSize,
    groupsContainer.children.length,
  );
  for (let i = modelIndex; i < endIndex; i++) {
    const targetModel = groupsContainer.children[i];
    if (targetModel) newScene.add(targetModel.clone(true));
  }
  if (newScene.children.length === 0) return null;
  return { ...gltf, scene: newScene };
}
