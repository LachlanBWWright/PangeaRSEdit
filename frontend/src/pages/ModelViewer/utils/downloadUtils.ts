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
import type { Texture } from "../types";
import { err, ok, fromPromise, type Result } from "@/types/result";

async function loadGlbBytes(gltfUrl: string): Promise<Result<ArrayBuffer, Error>> {
  const responseResult = await fromPromise(fetch(gltfUrl));
  if (responseResult.isErr()) {
    return err(
      responseResult.error instanceof Error
        ? responseResult.error
        : new Error(String(responseResult.error)),
    );
  }

  if (!responseResult.value.ok) {
    return err(new Error(`Failed to fetch GLB data: ${responseResult.value.status}`));
  }

  const bytesResult = await fromPromise(responseResult.value.arrayBuffer());
  if (bytesResult.isErr()) {
    return err(
      bytesResult.error instanceof Error
        ? bytesResult.error
        : new Error(String(bytesResult.error)),
    );
  }

  return ok(bytesResult.value);
}

async function glbUrlToBg3dResponse(
  gltfUrl: string,
): Promise<Result<BG3DGltfWorkerResponse, Error>> {
  const glbBytesResult = await loadGlbBytes(gltfUrl);
  if (glbBytesResult.isErr()) {
    return err(glbBytesResult.error);
  }

  const workerResult = await fromPromise(
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
      const message: BG3DGltfWorkerMessage = {
        type: "glb-to-bg3d",
        buffer: glbBytesResult.value,
      };
      worker.postMessage(message);
    }),
  );
  if (workerResult.isErr()) {
    return err(
      workerResult.error instanceof Error
        ? workerResult.error
        : new Error(String(workerResult.error)),
    );
  }

  return ok(workerResult.value);
}

export interface BG3DDownloadArtifacts {
  bg3dBytes: ArrayBuffer;
  skeletonBytes?: ArrayBuffer;
}

export async function getBG3DDownloadArtifacts(
  gltfUrl: string,
  modelFileName = "Model",
  exportTarget: BG3DExportTarget = DEFAULT_BG3D_EXPORT_TARGET,
): Promise<Result<BG3DDownloadArtifacts, Error>> {
  const result = await glbUrlToBg3dResponse(gltfUrl);
  if (result.isErr()) {
    return err(result.error);
  }

  if (result.value.type === "error") {
    return err(new Error(`Failed to convert GLB to BG3D: ${result.value.error}`));
  }

  const parsedResult = result.value.parsed
    ? ok(result.value.parsed)
    : parseBG3D(result.value.result);
  if (parsedResult.isErr()) {
    return err(parsedResult.error);
  }
  const parsed = parsedResult.value;

  let skeletonBytes: ArrayBuffer | undefined;
  if (result.value.skeletonResult) {
    skeletonBytes = result.value.skeletonResult;
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
    bg3dBytes: result.value.result,
    skeletonBytes,
  });
}

export async function get3DMFDownloadBytes(
  gltfUrl: string,
): Promise<Result<ArrayBuffer, Error>> {
  const result = await glbUrlToBg3dResponse(gltfUrl);
  if (result.isErr()) {
    return err(result.error);
  }

  if (result.value.type === "error") {
    return err(new Error(`Failed to convert GLB to BG3D: ${result.value.error}`));
  }

  const parsedBg3dResult = result.value.parsed
    ? ok(result.value.parsed)
    : parseBG3D(result.value.result);
  if (parsedBg3dResult.isErr()) {
    return err(
      new Error(
        `Failed to parse GLB-derived BG3D: ${parsedBg3dResult.error.message}`,
      ),
    );
  }
  const parsedBg3d = parsedBg3dResult.value;

  const metaResult = bg3dParseResultToMetaFile(parsedBg3d);
  if (metaResult.isErr()) {
    return err(new Error(`Failed to convert to 3DMF: ${metaResult.error.message}`));
  }

  const writeResult = write3DMFFromMetaFile(metaResult.value);
  if (writeResult.isErr()) {
    return err(new Error(`Failed to write 3DMF: ${writeResult.error.message}`));
  }

  return ok(writeResult.value);
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
  gltfUrl: string,
  modelFileName = "model",
  skeletonFileName = "model.skeleton",
  exportTarget: BG3DExportTarget = DEFAULT_BG3D_EXPORT_TARGET,
): Promise<Result<void, Error>> {
  const downloadBlob = (data: ArrayBuffer | Uint8Array, fileName: string) => {
    const blob = new Blob([data], {
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

  const result = await getBG3DDownloadArtifacts(gltfUrl, modelFileName, exportTarget);
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
  gltfUrl: string,
  fileName = "model",
): Promise<Result<void, Error>> {
  const bytesResult = await get3DMFDownloadBytes(gltfUrl);
  if (bytesResult.isErr()) {
    return err(bytesResult.error);
  }

  const blob = new Blob([bytesResult.value], {
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

  return ok(undefined);
}
