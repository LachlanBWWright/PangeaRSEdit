/**
 * Custom hook for handling BG3D/3DMF file uploads
 *
 * Manages the file upload workflow including:
 * - File format detection and validation
 * - 3DMF to BG3D conversion
 * - Skeleton file loading and merging
 * - GLB conversion via worker
 * - Texture extraction
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
import { parseSkeletonRsrcTS } from "../../../modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import type { SkeletonResource } from "../../../python/structSpecs/skeleton/skeletonInterface";
import { extractTexturesFromBG3D } from "../utils/textureUtils";
import type { Texture } from "../types";

/**
 * Configuration for the useFileUpload hook
 */
export interface UseFileUploadOptions {
  /** Called when glTF URL is available */
  onGltfUrlChange: (url: string) => void;
  /** Called when BG3D parsed data is available */
  onBg3dParsedChange: (parsed: BG3DParseResult) => void;
  /** Called when textures are extracted */
  onTexturesChange: (textures: Texture[]) => void;
  /** Called when loading state changes */
  onLoadingChange: (loading: boolean) => void;
  /** Called when upload step changes */
  onUploadStepChange: (step: "select-bg3d" | "select-skeleton" | "completed") => void;
}

/**
 * Hook for managing file uploads in the ModelViewer
 *
 * @param options - Configuration object with callbacks for state updates
 * @returns Object containing the uploadFile function
 */
export function useFileUpload(options: UseFileUploadOptions) {
  const {
    onGltfUrlChange,
    onBg3dParsedChange,
    onTexturesChange,
    onLoadingChange,
    onUploadStepChange,
  } = options;

  /**
   * Main file upload handler
   *
   * Supports both .bg3d and .3dmf formats. For 3DMF files, automatically converts
   * to BG3D format. Optionally accepts a skeleton file for animations.
   *
   * @param bg3dFile - The BG3D or 3DMF file to upload
   * @param skeletonFile - Optional skeleton file for animations
   */
  const uploadFile = useCallback(
    async (bg3dFile: File, skeletonFile?: File) => {
      const fileName = bg3dFile.name.toLowerCase();
      const isBg3d = fileName.endsWith(".bg3d");
      const is3dmf = fileName.endsWith(".3dmf");

      if (!isBg3d && !is3dmf) {
        toast.error("Please select a BG3D or 3DMF file");
        return;
      }

      if (
        skeletonFile &&
        !skeletonFile.name.toLowerCase().endsWith(".skeleton.rsrc")
      ) {
        toast.error("Skeleton file must be a .skeleton.rsrc file");
        return;
      }

      onLoadingChange(true);
      try {
        // Handle 3DMF conversion path
        if (is3dmf) {
          const { parse3DMFToMetaFile, metaFileToBG3DParseResult } =
            await import("../../../modelParsers/threeDMF");
          const { bg3dParsedToBG3D: convert3dmfToBG3D } = await import(
            "../../../modelParsers/parseBG3D"
          );

          const dmfBuffer = await bg3dFile.arrayBuffer();
          const parseResult = parse3DMFToMetaFile(dmfBuffer);
          if (!parseResult.ok) {
            toast.error(`Failed to parse 3DMF file: ${parseResult.error.message}`);
            onLoadingChange(false);
            return;
          }

          const bg3dResult = metaFileToBG3DParseResult(parseResult.value);
          if (!bg3dResult.ok) {
            toast.error(`Failed to convert 3DMF to BG3D: ${bg3dResult.error.message}`);
            onLoadingChange(false);
            return;
          }

          // Parse skeleton file if provided
          let skeletonData: SkeletonResource | undefined;
          if (skeletonFile) {
            try {
              console.log("Parsing skeleton file with TypeScript implementation...");
              const skeletonBuffer = await skeletonFile.arrayBuffer();
              skeletonData = parseSkeletonRsrcTS(skeletonBuffer);
              console.log(
                `Successfully parsed skeleton with ${Object.keys(skeletonData.Bone || {}).length || 0} bones`,
              );
            } catch (error) {
              console.error("Error parsing skeleton:", error);
              toast.warning("Failed to load skeleton, continuing without animations");
            }
          }

          // Store the parsed BG3D data immediately so textures are available
          onBg3dParsedChange(bg3dResult.value);
          const textures = await extractTexturesFromBG3D(bg3dResult.value);
          onTexturesChange(textures);

          // Convert the parsed BG3D back to binary format for GLB conversion
          const bg3dBuffer = convert3dmfToBG3D(bg3dResult.value);

          // Process with worker for GLB conversion
          const worker = new BG3DGltfWorker();
          const result = await new Promise<BG3DGltfWorkerResponse>(
            (resolve, reject) => {
              worker.onmessage = (e) => {
                resolve(e.data);
                worker.terminate();
              };
              worker.onerror = (e) => {
                reject(e);
                worker.terminate();
              };

              if (skeletonData) {
                // Send skeleton data with the model
                const message: BG3DGltfWorkerMessage = {
                  type: "bg3d-with-skeleton-to-glb",
                  bg3dBuffer: bg3dBuffer,
                  skeletonData,
                };
                worker.postMessage(message);
              } else {
                // Send model only
                const message: BG3DGltfWorkerMessage = {
                  type: "bg3d-to-glb",
                  buffer: bg3dBuffer,
                };
                worker.postMessage(message);
              }
            },
          );

          if (result.type === "error") {
            toast.error(`Error loading model: ${result.error}`);
            onLoadingChange(false);
            return;
          }

          if (
            result.type === "bg3d-to-glb" ||
            result.type === "bg3d-with-skeleton-to-glb"
          ) {
            // Store parsed data for texture operations and editing
            const enhancedParsed = result.parsed;
            onBg3dParsedChange(enhancedParsed);

            // Check if skeleton data was preserved
            if (enhancedParsed.skeleton?.animations?.length) {
              console.log(
                `Animation metadata preserved: ${enhancedParsed.skeleton.animations.length} animations detected`,
              );
            }

            const glbBlob = new Blob([result.result], {
              type: "model/gltf-binary",
            });
            const url = URL.createObjectURL(glbBlob);
            onGltfUrlChange(url);

            toast.success(`Successfully loaded ${bg3dFile.name}`);
            onUploadStepChange("completed");
            onLoadingChange(false);
            return;
          }
        }

        // Handle standard BG3D file processing
        const bg3dArrayBuffer = await bg3dFile.arrayBuffer();
        let skeletonData: SkeletonResource | undefined;

        // Parse skeleton file if provided
        if (skeletonFile) {
          try {
            console.log("Parsing skeleton file with TypeScript implementation...");
            const skeletonBuffer = await skeletonFile.arrayBuffer();
            skeletonData = parseSkeletonRsrcTS(skeletonBuffer);
            console.log(
              `Successfully parsed skeleton with ${Object.keys(skeletonData.Bone || {}).length || 0} bones`,
            );
          } catch (error) {
            console.error("Error parsing skeleton:", error);
            toast.warning("Failed to load skeleton, continuing without animations");
          }
        }

        // Send to worker for parsing and GLB conversion
        const worker = new BG3DGltfWorker();
        const result = await new Promise<BG3DGltfWorkerResponse>(
          (resolve, reject) => {
            worker.onmessage = (e) => {
              resolve(e.data);
              worker.terminate();
            };
            worker.onerror = (e) => {
              reject(e);
              worker.terminate();
            };

            if (skeletonData) {
              // Send skeleton data with the model
              const message: BG3DGltfWorkerMessage = {
                type: "bg3d-with-skeleton-to-glb",
                bg3dBuffer: bg3dArrayBuffer,
                skeletonData,
              };
              worker.postMessage(message);
            } else {
              // Send model only
              const message: BG3DGltfWorkerMessage = {
                type: "bg3d-to-glb",
                buffer: bg3dArrayBuffer,
              };
              worker.postMessage(message);
            }
          },
        );

        if (result.type === "error") {
          toast.error(`Error loading model: ${result.error}`);
          onLoadingChange(false);
          return;
        }

        if (
          result.type === "bg3d-to-glb" ||
          result.type === "bg3d-with-skeleton-to-glb"
        ) {
          // Store parsed data for texture operations and editing
          const enhancedParsed = result.parsed;
          onBg3dParsedChange(enhancedParsed);

          // Check if skeleton data was preserved
          if (enhancedParsed.skeleton?.animations?.length) {
            console.log(
              `Animation metadata preserved: ${enhancedParsed.skeleton.animations.length} animations detected`,
            );
          } else {
            onBg3dParsedChange(result.parsed);
          }

          // Extract and display textures
          const textures = await extractTexturesFromBG3D(result.parsed);
          onTexturesChange(textures);

          // Create GLB blob and URL
          const glbBlob = new Blob([result.result], {
            type: "model/gltf-binary",
          });
          const url = URL.createObjectURL(glbBlob);
          onGltfUrlChange(url);

          const displayFileName = skeletonFile
            ? `${bg3dFile.name} + ${skeletonFile.name}`
            : bg3dFile.name;
          toast.success(`Successfully loaded ${displayFileName}`);

          onUploadStepChange("completed");
          onLoadingChange(false);
          return;
        }
      } catch (error) {
        console.error("Error loading BG3D file:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load BG3D file",
        );
      } finally {
        onLoadingChange(false);
      }
    },
    [
      onGltfUrlChange,
      onBg3dParsedChange,
      onTexturesChange,
      onLoadingChange,
      onUploadStepChange,
    ],
  );

  return { uploadFile };
}
