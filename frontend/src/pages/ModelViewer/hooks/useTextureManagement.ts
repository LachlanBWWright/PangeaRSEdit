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
import type { Texture } from "../types";

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
        throw new Error("No BG3D data available");
      }

      return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = async () => {
          try {
            // Validate size matches the existing texture
            if (
              texture.size &&
              (img.width !== texture.size.width ||
                img.height !== texture.size.height)
            ) {
              toast.error(
                `Image size mismatch: Expected ${texture.size.width}×${texture.size.height}, got ${img.width}×${img.height}`,
              );
              reject(new Error("Image size mismatch"));
              return;
            }

            // Extract material and texture indices from texture name
            const nameMatch = texture.name.match(/Material_(\d+)_Texture_(\d+)/);
            if (!nameMatch) {
              toast.error("Invalid texture name format");
              reject(new Error("Invalid texture name format"));
              return;
            }

            const materialIndex = parseInt(nameMatch[1] ?? "0");
            const textureIndex = parseInt(nameMatch[2] ?? "0");

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

            // Convert to RGB or RGBA pixel array based on existing texture format
            const existingTexture =
              bg3dParsed.materials[materialIndex]?.textures[textureIndex];
            if (!existingTexture) {
              toast.error("Texture not found in BG3D data");
              reject(new Error("Texture not found in BG3D data"));
              return;
            }

            const isRGBA =
              existingTexture.pixels.length === img.width * img.height * 4;
            const newPixels = new Uint8Array(
              isRGBA
                ? img.width * img.height * 4
                : img.width * img.height * 3,
            );

            for (let i = 0; i < imageData.data.length; i += 4) {
              const pixelIndex = i / 4;
              if (isRGBA) {
                newPixels[pixelIndex * 4] = imageData.data[i] ?? 0; // R
                newPixels[pixelIndex * 4 + 1] = imageData.data[i + 1] ?? 0; // G
                newPixels[pixelIndex * 4 + 2] = imageData.data[i + 2] ?? 0; // B
                newPixels[pixelIndex * 4 + 3] = imageData.data[i + 3] ?? 255; // A
              } else {
                newPixels[pixelIndex * 3] = imageData.data[i] ?? 0; // R
                newPixels[pixelIndex * 3 + 1] = imageData.data[i + 1] ?? 0; // G
                newPixels[pixelIndex * 3 + 2] = imageData.data[i + 2] ?? 0; // B
              }
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
                        return {
                          ...existingTexture,
                          pixels: newPixels,
                          width: img.width,
                          height: img.height,
                        };
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
            const result = await new Promise<BG3DGltfWorkerResponse>(
              (workerResolve, workerReject) => {
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
              },
            );

            if (result.type === "error") {
              toast.error(`Error replacing texture: ${result.error}`);
              reject(new Error(result.error));
              return;
            }

            if (result.type === "bg3d-parsed-to-glb") {
              // Clean up old URL first
              if (gltfUrl) {
                URL.revokeObjectURL(gltfUrl);
              }

              // Update state with new model
              onBg3dParsedChange(updatedBG3D);

              // Create new GLTF URL
              const glbBlob = new Blob([result.result], {
                type: "model/gltf-binary",
              });
              const newUrl = URL.createObjectURL(glbBlob);
              onGltfUrlChange(newUrl);

              // Re-extract textures to update the UI
              const textures = extractTexturesFromBG3D(updatedBG3D);
              onTexturesChange(textures);

              toast.success("Texture replaced successfully");
              resolve();
            }
          } catch (error) {
            reject(error);
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
      try {
        // Convert ImageData back to canvas and then to File
        const canvas = document.createElement("canvas");
        canvas.width = editedImageData.width;
        canvas.height = editedImageData.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        ctx.putImageData(editedImageData, 0, 0);

        // Convert canvas to blob and create File
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) {
              resolve(b);
            } else {
              reject(new Error("Failed to convert canvas to blob"));
            }
          }, "image/png");
        });

        const file = new File([blob], `${texture.name}.png`, {
          type: "image/png",
        });

        // Use the existing replaceTexture function
        await replaceTexture(texture, file);
      } catch (error) {
        console.error("Error editing texture:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to edit texture",
        );
        throw error;
      }
    },
    [replaceTexture],
  );

  return { replaceTexture, editTexture };
}
