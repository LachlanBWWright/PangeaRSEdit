/**
 * File download and export utilities for the ModelViewer
 *
 * Handles exporting models in various formats (BG3D, GLB, 3DMF) and textures
 */

import { BG3DParseResult } from "../../../modelParsers/parseBG3D";
import BG3DGltfWorker from "../../../modelParsers/bg3dGltfWorker?worker";
import type { BG3DGltfWorkerMessage, BG3DGltfWorkerResponse } from "../../../modelParsers/bg3dGltfWorker";
import { bg3dSkeletonToSkeletonResource } from "../../../modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "../../../modelParsers/skeletonBinaryExport";
import type { Texture } from "../types";

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
 * Downloads the BG3D model and optionally the skeleton resource
 *
 * Converts the parsed BG3D data back to binary format using a worker.
 * If the model has animations, also exports the skeleton as a .skeleton.rsrc file.
 *
 * @param bg3dParsed - Parsed BG3D model data
 * @param modelFileName - Optional custom filename for the BG3D file (without extension)
 * @param skeletonFileName - Optional custom filename for skeleton (without extension)
 * @throws Error if download or conversion fails
 */
export async function downloadBG3DModel(
  bg3dParsed: BG3DParseResult,
  modelFileName = "model",
  skeletonFileName = "model.skeleton",
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new BG3DGltfWorker();

    worker.onmessage = async (e: MessageEvent<BG3DGltfWorkerResponse>) => {
      try {
        const result = e.data;
        if (result.type === "error") {
          reject(new Error(`Failed to convert BG3D: ${result.error}`));
          return;
        }

        if (result.type === "bg3d-parsed-to-bg3d") {
          // Download the BG3D binary
          const blob = new Blob([result.result], {
            type: "application/octet-stream",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${modelFileName}.bg3d`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Also download skeleton if available
          if (
            bg3dParsed.skeleton &&
            bg3dParsed.skeleton.animations.length > 0
          ) {
            try {
              const skeletonResource = bg3dSkeletonToSkeletonResource(
                bg3dParsed.skeleton,
              );

              // Convert to binary .rsrc format
              const skeletonBinary = await skeletonResourceToBinary(
                skeletonResource,
              );
              const skeletonBlob = new Blob([skeletonBinary], {
                type: "application/octet-stream",
              });
              const skeletonUrl = URL.createObjectURL(skeletonBlob);

              const skeletonLink = document.createElement("a");
              skeletonLink.href = skeletonUrl;
              skeletonLink.download = `${skeletonFileName}.rsrc`;
              document.body.appendChild(skeletonLink);
              skeletonLink.click();
              document.body.removeChild(skeletonLink);
              URL.revokeObjectURL(skeletonUrl);
            } catch (error) {
              console.error("Error exporting skeleton:", error);
              // Don't reject if skeleton export fails, model was already downloaded
            }
          }

          resolve();
        }
      } catch (error) {
        reject(error);
      } finally {
        worker.terminate();
      }
    };

    worker.onerror = () => {
      reject(new Error("Failed to process BG3D data"));
      worker.terminate();
    };

    const message: BG3DGltfWorkerMessage = {
      type: "bg3d-parsed-to-bg3d",
      parsed: bg3dParsed,
    };
    worker.postMessage(message);
  });
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
 * Downloads the model in 3DMF format
 *
 * Converts the BG3D parsed data to 3DMF format and downloads as binary.
 *
 * @param bg3dParsed - Parsed BG3D model data
 * @param fileName - Optional custom filename (without extension)
 * @throws Error if conversion or download fails
 */
export async function download3DMFModel(
  bg3dParsed: BG3DParseResult,
  fileName = "model",
): Promise<void> {
  // Convert BG3DParseResult to 3DMF format
  const { bg3dParseResultToMetaFile, write3DMFFromMetaFile } = await import(
    "../../../modelParsers/threeDMF"
  );

  const metaResult = bg3dParseResultToMetaFile(bg3dParsed);
  if (!metaResult.ok) {
    throw new Error(`Failed to convert to 3DMF: ${metaResult.error.message}`);
  }

  const writeResult = write3DMFFromMetaFile(metaResult.value);
  if (!writeResult.ok) {
    throw new Error(`Failed to write 3DMF: ${writeResult.error.message}`);
  }

  // Download the 3DMF binary
  const blob = new Blob([writeResult.value], {
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
}
