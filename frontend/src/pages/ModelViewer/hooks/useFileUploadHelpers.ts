import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import type {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "@/modelParsers/bg3dGltfWorker";
import type { SkeletonResource } from "@/python/structSpecs/skeleton/skeletonInterface";
import { mapErr } from "@/utils/mapErr";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import { err, ok, ResultAsync, type Result } from "neverthrow";

/** Supported model upload formats. */
export type ModelUploadKind = "bg3d" | "3dmf" | "glb";

/** Validated selection details for a model upload flow. */
export interface UploadSelection {
  kind: ModelUploadKind;
  bg3dFile: File;
  skeletonFile?: File;
}

/** Outcome of optionally loading a matching skeleton file. */
export interface SkeletonLoadResult {
  skeletonData?: SkeletonResource;
  skeletonFailed: boolean;
  warningMessage?: string;
}

/** Validates the chosen model and skeleton files for the upload flow. */
export function validateUploadSelection(
  bg3dFile: File,
  skeletonFile?: File,
): Result<UploadSelection, string> {
  const fileName = bg3dFile.name.toLowerCase();
  const isBg3d = fileName.endsWith(".bg3d");
  const is3dmf = fileName.endsWith(".3dmf");
  const isGlb = fileName.endsWith(".glb");

  if (!isBg3d && !is3dmf && !isGlb) {
    return err("Please select a BG3D, 3DMF, or GLB file");
  }

  if (skeletonFile && !isSkeletonFileName(skeletonFile.name)) {
    return err("Skeleton file must be a .skeleton.rsrc or .rsrc file");
  }

  if (isGlb) return ok({ kind: "glb", bg3dFile, skeletonFile });
  if (is3dmf) return ok({ kind: "3dmf", bg3dFile, skeletonFile });
  return ok({ kind: "bg3d", bg3dFile, skeletonFile });
}

/** Reads a file into an ArrayBuffer and wraps the result in Result. */
export async function readFileBuffer(
  file: File,
  label: string,
): Promise<Result<ArrayBuffer, string>> {
  const bufferResult = await ResultAsync.fromPromise(
    file.arrayBuffer(),
    mapErr,
  );
  if (bufferResult.isErr()) {
    return err(`Failed to read ${label}: ${bufferResult.error}`);
  }

  return ok(bufferResult.value);
}

/** Reads and parses an optional skeleton resource file. */
export async function loadOptionalSkeleton(
  skeletonFile?: File,
): Promise<SkeletonLoadResult> {
  if (!skeletonFile) {
    return { skeletonData: undefined, skeletonFailed: false };
  }

  const skeletonBufferResult = await ResultAsync.fromPromise(
    skeletonFile.arrayBuffer(),
    mapErr,
  );

  if (skeletonBufferResult.isErr()) {
    return {
      skeletonData: undefined,
      skeletonFailed: true,
      warningMessage: `Failed to read skeleton file: ${skeletonBufferResult.error}`,
    };
  }

  const skeletonParseResult = await ResultAsync.fromPromise(
    parseSkeletonRsrc(skeletonBufferResult.value),
    mapErr,
  );

  if (skeletonParseResult.isErr()) {
    return {
      skeletonData: undefined,
      skeletonFailed: true,
      warningMessage: `Failed to parse skeleton file: ${skeletonParseResult.error}`,
    };
  }

  return { skeletonData: skeletonParseResult.value, skeletonFailed: false };
}

/** Sends a message to the GLTF worker and returns the structured response. */
export async function runWorkerMessage(
  message: BG3DGltfWorkerMessage,
): Promise<Result<BG3DGltfWorkerResponse, string>> {
  const worker = new BG3DGltfWorker();
  const workerPromise = new Promise<BG3DGltfWorkerResponse>(
    (resolve, reject) => {
      worker.onmessage = (event) => {
        resolve(event.data);
        worker.terminate();
      };
      worker.onerror = (event) => {
        reject(event);
        worker.terminate();
      };
      worker.postMessage(message);
    },
  );

  const workerResult = await ResultAsync.fromPromise(workerPromise, mapErr);
  if (workerResult.isErr()) return err(workerResult.error);
  return ok(workerResult.value);
}

/** Builds the user-facing model filename shown in the upload UI. */
export function createDisplayFileName(
  modelFileName: string,
  skeletonFile: File | undefined,
  skeletonFailed: boolean,
): string {
  if (!skeletonFile) return modelFileName;
  if (skeletonFailed) return `${modelFileName} (skeleton failed to load)`;
  return `${modelFileName} + ${skeletonFile.name}`;
}

function isSkeletonFileName(fileName: string): boolean {
  const lowerCaseName = fileName.toLowerCase();
  return (
    lowerCaseName.endsWith(".skeleton.rsrc") || lowerCaseName.endsWith(".rsrc")
  );
}
