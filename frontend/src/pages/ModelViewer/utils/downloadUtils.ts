import { mapErr } from "@/utils/mapErr";
/**
 * File download and export utilities for the ModelViewer
 *
 * Handles exporting models in various formats (BG3D, GLB, 3DMF) and textures
 */

import { parseBG3D } from "../../../modelParsers/parseBG3D";
import BG3DGltfWorker from "../../../modelParsers/bg3dGltfWorker?worker";
import type { BG3DGltfWorkerMessage, BG3DGltfWorkerResponse } from "../../../modelParsers/bg3dGltfWorker";
import { bg3dParseResultToMetaFile, write3DMFFromMetaFile } from "../../../modelParsers/threeDMF";
import { bg3dSkeletonToSkeletonResource } from "../../../modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "../../../modelParsers/skeletonBinaryExport";
import { DEFAULT_BG3D_EXPORT_TARGET, type BG3DExportTarget } from "../../../modelParsers/bg3dExportTargets";
import { getGlbToBg3dWorkerResponse } from "./bg3dGltfWorkerResponses";
import type { Texture } from "../types";
import { ResultAsync, err, ok, type Result } from "neverthrow";
import { arrayBufferSchema, stringSchema, uint8ArraySchema } from "../../../schemas/common";


async function loadGlbBytes(
  gltfSource: string | ArrayBuffer,
): Promise<Result<ArrayBuffer, Error>> {
  const arrayBufferResult = arrayBufferSchema.safeParse(gltfSource);
  if (arrayBufferResult.success) {
    return ok(arrayBufferResult.data);
  }

  const stringResult = stringSchema.safeParse(gltfSource);
  if (!stringResult.success) {
    return err(new Error("Invalid gltfSource type: expected string or ArrayBuffer"));
  }

  const responseResult = await ResultAsync.fromPromise(
    fetch(stringResult.data),
    mapErr,
  );
  if (responseResult.isErr()) {
    return err(responseResult.error);
  }

  if (!responseResult.value.ok) {
    return err(new Error(`Failed to fetch GLB data: ${responseResult.value.status}`));
  }

  const bytesResult = await ResultAsync.fromPromise(
    responseResult.value.arrayBuffer(),
    mapErr,
  );
  if (bytesResult.isErr()) {
    return err(bytesResult.error);
  }

  return ok(bytesResult.value);
}

async function glbUrlToBg3dResponse(
  gltfSource: string | ArrayBuffer,
): Promise<Result<BG3DGltfWorkerResponse, Error>> {
  const glbBytesResult = await loadGlbBytes(gltfSource);
  if (glbBytesResult.isErr()) {
    return err(glbBytesResult.error);
  }

  const workerResult = await ResultAsync.fromPromise(
    new Promise<BG3DGltfWorkerResponse>((resolve, reject) => {
      const worker = new BG3DGltfWorker();
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = (e) => {
        reject(e);
        worker.terminate();
      };
      const message = {
        type: "glb-to-bg3d",
        buffer: glbBytesResult.value,
      } satisfies BG3DGltfWorkerMessage;
      worker.postMessage(message);
    }),
    mapErr,
  );
  if (workerResult.isErr()) {
    return err(workerResult.error);
  }

  return ok(workerResult.value);
}

export interface BG3DDownloadArtifacts {
  bg3dBytes: ArrayBuffer;
  skeletonBytes?: ArrayBuffer;
}

export interface ThreeDMFDownloadArtifacts {
  modelBytes: ArrayBuffer;
  skeletonBytes?: ArrayBuffer;
}

function toBlobPart(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  const parseResult = arrayBufferSchema.safeParse(data);
  if (parseResult.success) {
    return parseResult.data;
  }
  const uint8Result = uint8ArraySchema.safeParse(data);
  if (!uint8Result.success) {
    return new ArrayBuffer(0); // Should never reach with valid input
  }
  const uint8Data = uint8Result.data;
  const copy = new ArrayBuffer(uint8Data.byteLength);
  new Uint8Array(copy).set(uint8Data);
  return copy;
}

export async function getBG3DDownloadArtifacts(
  gltfSource: string | ArrayBuffer,
  modelFileName = "Model",
  exportTarget: BG3DExportTarget = DEFAULT_BG3D_EXPORT_TARGET,
): Promise<Result<BG3DDownloadArtifacts, Error>> {
  const result = await glbUrlToBg3dResponse(gltfSource);
  if (result.isErr()) {
    return err(result.error);
  }

  const workerResponseResult = getGlbToBg3dWorkerResponse(
    result.value,
    "convert GLB to BG3D for BG3D export",
  );
  if (workerResponseResult.isErr()) {
    return err(workerResponseResult.error);
  }
  const workerResponse = workerResponseResult.value;

  const parsedResult = workerResponse.parsed
    ? ok(workerResponse.parsed)
    : parseBG3D(workerResponse.result);
  if (parsedResult.isErr()) {
    return err(
      new Error(`Failed to parse converted BG3D for export: ${parsedResult.error}`),
    );
  }
  const parsed = parsedResult.value;

  let skeletonBytes: ArrayBuffer | undefined;
  if (workerResponse.skeletonResult) {
    skeletonBytes = workerResponse.skeletonResult;
  } else if (parsed.skeleton) {
    const skeletonResource = bg3dSkeletonToSkeletonResource(
      parsed.skeleton,
      undefined,
      undefined,
      undefined,
      parsed.skeleton.metadata,
      modelFileName,
      exportTarget,
    );
    const skeletonBinaryResult = skeletonResourceToBinary(skeletonResource);
    if (skeletonBinaryResult.isErr()) {
      return err(skeletonBinaryResult.error);
    }
    skeletonBytes = skeletonBinaryResult.value;
  }

  return ok({
    bg3dBytes: workerResponse.result,
    skeletonBytes,
  });
}

export async function get3DMFDownloadArtifacts(
  gltfSource: string | ArrayBuffer,
  modelFileName = "model",
  exportTarget: BG3DExportTarget = DEFAULT_BG3D_EXPORT_TARGET,
): Promise<Result<ThreeDMFDownloadArtifacts, Error>> {
  const result = await glbUrlToBg3dResponse(gltfSource);
  if (result.isErr()) {
    return err(result.error);
  }

  const workerResponseResult = getGlbToBg3dWorkerResponse(
    result.value,
    "convert GLB to BG3D for 3DMF export",
  );
  if (workerResponseResult.isErr()) {
    return err(workerResponseResult.error);
  }
  const workerResponse = workerResponseResult.value;

  const parsedBg3dResult = workerResponse.parsed
    ? ok(workerResponse.parsed)
    : parseBG3D(workerResponse.result);
  if (parsedBg3dResult.isErr()) {
    return err(
      new Error(
        `Failed to parse GLB-derived BG3D: ${parsedBg3dResult.error}`,
      ),
    );
  }
  const parsedBg3d = parsedBg3dResult.value;

  const metaResult = bg3dParseResultToMetaFile(parsedBg3d);
  if (metaResult.isErr()) {
    return err(
      new Error(`Failed to convert BG3D export data to 3DMF: ${metaResult.error}`),
    );
  }

  const writeResult = write3DMFFromMetaFile(metaResult.value);
  if (writeResult.isErr()) {
    return err(new Error(`Failed to serialize 3DMF export: ${writeResult.error}`));
  }

  let skeletonBytes: ArrayBuffer | undefined;
  if (parsedBg3d.skeleton) {
    const skeletonResource = bg3dSkeletonToSkeletonResource(
      parsedBg3d.skeleton,
      undefined,
      undefined,
      undefined,
      parsedBg3d.skeleton.metadata,
      modelFileName,
      exportTarget,
    );
    const skeletonBinaryResult = skeletonResourceToBinary(skeletonResource);
    if (skeletonBinaryResult.isErr()) {
      return err(skeletonBinaryResult.error);
    }
    skeletonBytes = skeletonBinaryResult.value;
  }

  return ok({
    modelBytes: writeResult.value,
    skeletonBytes,
  });
}

/**
 * Downloads a texture as a PNG file
 *
 * @param texture - The texture to download
 * @param fileName - Optional custom filename (without .png extension)
 * @throws Error if download fails
 */
export async function downloadTexture(
  texture: Texture,
  fileName?: string,
): Promise<void> {
  const response = await fetch(texture.url);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName || texture.name}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads the BG3D model and optionally the skeleton resource.
 *
 * The bytes come only from the current GLB URL via the worker response.
 */
export async function downloadBG3DModel(
  gltfSource: string | ArrayBuffer,
  modelFileName = "model",
  skeletonFileName = "model.skeleton",
  exportTarget: BG3DExportTarget = DEFAULT_BG3D_EXPORT_TARGET,
): Promise<Result<void, Error>> {
  const downloadBlob = (data: ArrayBuffer | Uint8Array, fileName: string) => {
    const blob = new Blob([toBlobPart(data)], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const result = await getBG3DDownloadArtifacts(gltfSource, modelFileName, exportTarget);
  if (result.isErr()) {
    return err(result.error);
  }

  downloadBlob(result.value.bg3dBytes, `${modelFileName}.bg3d`);
  if (result.value.skeletonBytes) {
    downloadBlob(result.value.skeletonBytes, `${skeletonFileName}.rsrc`);
  }

  return ok(undefined);
}

/**
 * Downloads the GLB model file
 *
 * @param gltfUrl - Object URL of the GLB data
 * @param fileName - Optional custom filename (without extension)
 * @throws Error if download fails
 */
export function downloadGLBModel(
  gltfUrl: string,
  fileName = "model",
): void {
  const a = document.createElement("a");
  a.href = gltfUrl;
  a.download = `${fileName}.glb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Downloads the model in 3DMF format.
 *
 * The bytes come only from the current GLB URL via the worker response.
 */
export async function download3DMFModel(
  gltfSource: string | ArrayBuffer,
  fileName = "model",
  exportTarget: BG3DExportTarget = DEFAULT_BG3D_EXPORT_TARGET,
): Promise<Result<void, Error>> {
  const bytesResult = await get3DMFDownloadArtifacts(
    gltfSource,
    fileName,
    exportTarget,
  );
  if (bytesResult.isErr()) {
    return err(bytesResult.error);
  }

  const blob = new Blob([bytesResult.value.modelBytes], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.3dmf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (bytesResult.value.skeletonBytes) {
    const skeletonBlob = new Blob([bytesResult.value.skeletonBytes], {
      type: "application/octet-stream",
    });
    const skeletonUrl = URL.createObjectURL(skeletonBlob);
    const skeletonLink = document.createElement("a");
    skeletonLink.href = skeletonUrl;
    skeletonLink.download = `${fileName}.skeleton.rsrc`;
    document.body.appendChild(skeletonLink);
    skeletonLink.click();
    document.body.removeChild(skeletonLink);
    URL.revokeObjectURL(skeletonUrl);
  }

  return ok(undefined);
}
