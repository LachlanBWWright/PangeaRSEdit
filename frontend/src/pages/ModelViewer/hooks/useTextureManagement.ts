import { mapErr } from "@/utils/mapErr";
/**
 * Custom hook for texture replacement and editing operations
 *
 * Manages texture replacement workflow including:
 * - Image validation (size and format checking)
 * - Pixel format conversion (RGB vs RGBA)
 * - BG3D data updates
 * - GLB re-generation via worker
 * - Texture re-extraction for UI updates
 *
 * Uses a callback pattern for state updates to avoid closure dependencies
 */

import { useCallback } from "react";
import { toast } from "sonner";
import BG3DGltfWorker from "../../../modelParsers/bg3dGltfWorker?worker";
import type {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../../../modelParsers/bg3dGltfWorker";
import type { BG3DParseResult } from "../../../modelParsers/parseBG3D";
import { extractTexturesFromBG3D } from "../utils/textureUtils";
import { rgba8ToArgb16 } from "../../../modelParsers/image/pngArgb";
import type { Texture } from "../types";
import { ResultAsync } from "neverthrow";


/**
 * Configuration for the useTextureManagement hook
 */
export interface UseTextureManagementOptions {
  bg3dParsed: BG3DParseResult | null;
  gltfUrl: string | null;
  onBg3dParsedChange: (parsed: BG3DParseResult) => void;
  onGltfUrlChange: (url: string) => void;
  onSceneReset: () => void;
  onTexturesChange: (textures: Texture[]) => void;
}

/**
 * Hook for managing texture operations
 *
 * @param options - Configuration object with current state and callbacks
 * @returns Object containing replaceTexture and editTexture functions
 */
export function useTextureManagement(options: UseTextureManagementOptions) {
  const {
    bg3dParsed,
    gltfUrl,
    onBg3dParsedChange,
    onGltfUrlChange,
    onSceneReset,
    onTexturesChange,
  } = options;

  /**
   * Core texture replacement logic
   *
   * Replaces a texture in the BG3D data with a new image, validates dimensions,
   * converts the image to the appropriate pixel format, and re-generates the GLB.
   *
   * @param texture - The texture to replace
   * @param newFile - The new image file
   * @throws Error if validation fails or conversion fails
   */
  const replaceTexture = useCallback(
    async (texture: Texture, newFile: File): Promise<void> => {
      if (!bg3dParsed) {
        toast.error("No BG3D data available for texture replacement");
        return;
      }

      return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = async () => {
            // Extract material and texture indices from texture name
            const nameMatch = texture.name.match(/Material_(\d+)_Texture_(\d+)/);
            if (!nameMatch) {
              toast.error("Invalid texture name format");
              reject(new Error("Invalid texture name format"));
              return;
            }

            const materialIndex = parseInt(nameMatch[1] ?? "0");
            const textureIndex = parseInt(nameMatch[2] ?? "0");

            // Get the existing texture from BG3D data first
            const existingTexture =
              bg3dParsed.materials[materialIndex]?.textures[textureIndex];
            if (!existingTexture) {
              toast.error("Texture not found in BG3D data");
              reject(new Error("Texture not found in BG3D data"));
              return;
            }

            // Validate size matches the existing texture (using BG3D dimensions as source of truth)
            if (
              img.width !== existingTexture.width ||
              img.height !== existingTexture.height
            ) {
              toast.error(
                `Image size mismatch: Expected ${existingTexture.width}×${existingTexture.height}, got ${img.width}×${img.height}`,
              );
              reject(new Error("Image size mismatch"));
              return;
            }

            // Convert image to canvas and extract pixel data
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              toast.error("Failed to get canvas context");
              reject(new Error("Failed to get canvas context"));
              return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);

            // Helper to convert RGBA canvas data to the target pixel format
            let newPixels: Uint8Array;

            if (existingTexture.srcPixelFormat === 6407) {
              // GL_RGB (24-bit) - extract RGB only
              newPixels = new Uint8Array(img.width * img.height * 3);
              for (let i = 0; i < imageData.data.length; i += 4) {
                const pixelIndex = i / 4;
                newPixels[pixelIndex * 3] = imageData.data[i] ?? 0; // R
                newPixels[pixelIndex * 3 + 1] = imageData.data[i + 1] ?? 0; // G
                newPixels[pixelIndex * 3 + 2] = imageData.data[i + 2] ?? 0; // B
              }
            } else if (existingTexture.srcPixelFormat === 6408) {
              // GL_RGBA (32-bit) - use RGBA directly
              newPixels = new Uint8Array(imageData.data);
            } else if (existingTexture.srcPixelFormat === 33638) {
              // GL_UNSIGNED_SHORT_1_5_5_5_REV (16-bit ARGB)
              // Convert RGBA to ARGB16 format
              const rgba = new Uint8Array(imageData.data);
              const argb16 = rgba8ToArgb16(rgba);
              // Byte-swap to Big-Endian since BG3D/3DMF expect it
              const swapped = new Uint16Array(argb16.length);
              for (let i = 0; i < argb16.length; i++) {
                const val = argb16[i] ?? 0;
                swapped[i] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
              }
              // Create Uint8Array view of the swapped ARGB16 buffer
              newPixels = new Uint8Array(swapped.buffer, swapped.byteOffset, swapped.byteLength);
            } else if (existingTexture.isJpeg) {
              // JPEG textures should not be edited - they have complex format
              toast.error("JPEG textures cannot be edited directly");
              reject(new Error("JPEG textures cannot be edited"));
              return;
            } else {
              // Unknown format - default to RGBA
              toast.warning(`Unknown texture format ${existingTexture.srcPixelFormat}, using RGBA`);
              newPixels = new Uint8Array(imageData.data);
            }

            // Update the BG3D parsed data with a proper deep copy
            const updatedBG3D: BG3DParseResult = {
              ...bg3dParsed,
              materials: bg3dParsed.materials.map((material, idx) => {
                if (idx === materialIndex) {
                  return {
                    ...material,
                    textures: material.textures.map((tex, texIdx) => {
                      if (texIdx === textureIndex) {
                        const updatedTexture = {
                          ...existingTexture,
                          pixels: newPixels,
                          width: img.width,
                          height: img.height,
                          bufferSize: newPixels.byteLength,
                        };
                        return updatedTexture;
                      }
                      return tex;
                    }),
                  };
                }
                return material;
              }),
            };

            // Reset scene state to prevent crashes
            onSceneReset();

            // Convert updated BG3D back to GLB
            const worker = new BG3DGltfWorker();
            const result = await ResultAsync.fromPromise(
              new Promise<BG3DGltfWorkerResponse>((workerResolve, workerReject) => {
                worker.onmessage = (e) => {
                  workerResolve(e.data);
                  worker.terminate();
                };
                worker.onerror = (e) => {
                  workerReject(e);
                  worker.terminate();
                };
                const message: BG3DGltfWorkerMessage = {
                  type: "bg3d-parsed-to-glb",
                  parsed: updatedBG3D,
                };
                worker.postMessage(message);
              }),
              mapErr,
            );
            if (result.isErr()) {
              toast.error(`Error replacing texture: ${result.error}`);
              reject(result.error);
              return;
            }

            const workerResponse = result.value;
            if (workerResponse.type === "error") {
              toast.error(`Error replacing texture: ${workerResponse.error}`);
              reject(new Error(workerResponse.error));
              return;
            }

            if (workerResponse.type === "bg3d-parsed-to-glb") {
              // Clean up old URL first
              if (gltfUrl) {
                URL.revokeObjectURL(gltfUrl);
              }

              // Update state with parsed data from worker (preserves all BG3D state including edited textures)
              const preservedBG3D = workerResponse.parsed || updatedBG3D;
              onBg3dParsedChange(preservedBG3D);

              // Create new GLTF URL
              const glbBlob = new Blob([workerResponse.result], {
                type: "model/gltf-binary",
              });
              const newUrl = URL.createObjectURL(glbBlob);
              onGltfUrlChange(newUrl);

              // Re-extract textures to update the UI
              const textures = await extractTexturesFromBG3D(preservedBG3D);
              onTexturesChange(textures);

              toast.success("Texture replaced successfully");
              resolve();
            }
        };

        img.onerror = () => {
          reject(new Error("Failed to load image"));
        };

        img.src = URL.createObjectURL(newFile);
      });
    },
    [bg3dParsed, gltfUrl, onBg3dParsedChange, onGltfUrlChange, onSceneReset, onTexturesChange],
  );

  /**
   * Edit texture from raw ImageData
   *
   * Converts ImageData (from an image editor) back to a File and uses replaceTexture.
   *
   * @param texture - The texture to edit
   * @param editedImageData - The edited image data
   * @throws Error if conversion or replacement fails
   */
  const editTexture = useCallback(
    async (texture: Texture, editedImageData: ImageData): Promise<void> => {
      // Convert ImageData back to canvas and then to File
      const canvas = document.createElement("canvas");
      canvas.width = editedImageData.width;
      canvas.height = editedImageData.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        const error = new Error("Failed to get canvas context");
        console.error("Error editing texture:", error);
        toast.error(error.message);
        return;
      }

      ctx.putImageData(editedImageData, 0, 0);

      // Convert canvas to blob and create File
      const blobResult = await ResultAsync.fromPromise(
                new Promise<Blob>((resolve, reject) => {
                  canvas.toBlob((b) => {
                    if (b) {
                      resolve(b);
                    } else {
                      reject(new Error("Failed to convert canvas to blob"));
                    }
                  }, "image/png");
                }),
                mapErr,
              );
      if (blobResult.isErr()) {
        console.error("Error editing texture:", blobResult.error);
        toast.error(blobResult.error);
        return;
      }
      const file = new File([blobResult.value], `${texture.name}.png`, {
        type: "image/png",
      });

      // Use the existing replaceTexture function
      const replaceResult = await ResultAsync.fromPromise(
        replaceTexture(texture, file),
        mapErr,
      );
      if (replaceResult.isErr()) {
        console.error("Error editing texture:", replaceResult.error);
        toast.error(replaceResult.error);
        return;
      }
    },
    [replaceTexture],
  );

  return { replaceTexture, editTexture };
}
