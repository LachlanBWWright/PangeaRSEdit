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
import { parseSkeletonRsrc } from "../../../modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import type { SkeletonResource } from "../../../python/structSpecs/skeleton/skeletonInterface";
import { extractTexturesFromBG3D } from "../utils/textureUtils";
import type { Texture } from "../types";
import { fromPromise, ok, err, type Result } from "@/types/result";

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
  onUploadStepChange: (
    step: "select-bg3d" | "select-skeleton" | "completed",
  ) => void;
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
    async (
      bg3dFile: File,
      skeletonFile?: File,
    ): Promise<Result<void, Error>> => {
      const fileName = bg3dFile.name.toLowerCase();
      const isBg3d = fileName.endsWith(".bg3d");
      const is3dmf = fileName.endsWith(".3dmf");

      if (!isBg3d && !is3dmf) {
        const message = "Please select a BG3D or 3DMF file";
        toast.error(message);
        return err(new Error(message));
      }

      if (
        skeletonFile &&
        !skeletonFile.name.toLowerCase().endsWith(".skeleton.rsrc")
      ) {
        const message = "Skeleton file must be a .skeleton.rsrc file";
        toast.error(message);
        return err(new Error(message));
      }

      onLoadingChange(true);

      // Handle 3DMF conversion path
      if (is3dmf) {
        const { parse3DMFToMetaFile, metaFileToBG3DParseResult } =
          await import("../../../modelParsers/threeDMF");
        const { bg3dParsedToBG3D: convert3dmfToBG3D } =
          await import("../../../modelParsers/parseBG3D");

        const dmfBufferResult = await fromPromise(bg3dFile.arrayBuffer());
        if (dmfBufferResult.isErr()) {
          const message = `Failed to read 3DMF file: ${dmfBufferResult.error.message}`;
          toast.error(message);
          onLoadingChange(false);
          return err(new Error(message));
        }
        const dmfBuffer = dmfBufferResult.value;
        const parseResult = parse3DMFToMetaFile(dmfBuffer);
        if (parseResult.isErr()) {
          const message = `Failed to parse 3DMF file: ${parseResult.error.message}`;
          toast.error(message);
          onLoadingChange(false);
          return err(new Error(message));
        }

        const bg3dResult = metaFileToBG3DParseResult(parseResult.value);
        if (bg3dResult.isErr()) {
          const message = `Failed to convert 3DMF to BG3D: ${bg3dResult.error.message}`;
          toast.error(message);
          onLoadingChange(false);
          return err(new Error(message));
        }

        // Parse skeleton file if provided
        let skeletonData: SkeletonResource | undefined;
        if (skeletonFile) {
          console.log(
            "Parsing skeleton file with TypeScript implementation...",
          );
          const skeletonBufferResult = await fromPromise(
            skeletonFile.arrayBuffer(),
          );
          if (skeletonBufferResult.isErr()) {
            console.error(
              "Error reading skeleton file:",
              skeletonBufferResult.error,
            );
            toast.warning(
              "Failed to load skeleton, continuing without animations",
            );
          } else {
            const skeletonParseResult = await fromPromise(
              parseSkeletonRsrc(skeletonBufferResult.value),
            );
            if (skeletonParseResult.isErr()) {
              console.error(
                "Error parsing skeleton:",
                skeletonParseResult.error,
              );
              toast.warning(
                "Failed to load skeleton, continuing without animations",
              );
            } else {
              skeletonData = skeletonParseResult.value;
              console.log(
                `Successfully parsed skeleton with ${Object.keys(skeletonData?.Bone || {}).length || 0} bones`,
              );
            }
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
        const workerPromise = new Promise<BG3DGltfWorkerResponse>(
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
 
        const workerResult = await fromPromise(workerPromise);
        if (workerResult.isErr()) {
          const message = workerResult.error instanceof Error ? workerResult.error.message : String(workerResult.error);
          toast.error(`Error loading model: ${message}`);
          onLoadingChange(false);
          return err(new Error(message));
        }
 
        const result = workerResult.value;

        if (result.type === "error") {
          const message = `Error loading model: ${result.error}`;
          toast.error(message);
          onLoadingChange(false);
          return err(new Error(message));
        }

        if (
          result.type === "bg3d-to-glb" ||
          result.type === "bg3d-with-skeleton-to-glb"
        ) {
          // Store parsed data for texture operations and editing
          const enhancedParsed = result.parsed;
          if (enhancedParsed) {
            onBg3dParsedChange(enhancedParsed);

            // Check if skeleton data was preserved
            if (enhancedParsed.skeleton?.animations?.length) {
              console.log(
                `Animation metadata preserved: ${enhancedParsed.skeleton.animations.length} animations detected`,
              );
            }
          }

          const glbBlob = new Blob([result.result], {
            type: "model/gltf-binary",
          });
          const url = URL.createObjectURL(glbBlob);
          onGltfUrlChange(url);

          toast.success(`Successfully loaded ${bg3dFile.name}`);
          onUploadStepChange("completed");
          onLoadingChange(false);
          return ok(undefined);
        }
 
        onLoadingChange(false);
        return err(new Error(`Unexpected worker response type: ${result.type}`));
      }

      // Handle standard BG3D file processing
      const bg3dBufferResult = await fromPromise(bg3dFile.arrayBuffer());
      if (bg3dBufferResult.isErr()) {
        const message = `Failed to read BG3D file: ${bg3dBufferResult.error.message}`;
        toast.error(message);
        onLoadingChange(false);
        return err(new Error(message));
      }
      const bg3dArrayBuffer = bg3dBufferResult.value;
      let skeletonData: SkeletonResource | undefined;

      // Parse skeleton file if provided
      if (skeletonFile) {
        console.log("Parsing skeleton file with TypeScript implementation...");
        const skeletonBufferResult = await fromPromise(
          skeletonFile.arrayBuffer(),
        );
        if (skeletonBufferResult.isErr()) {
          console.error(
            "Error reading skeleton file:",
            skeletonBufferResult.error,
          );
          toast.warning(
            "Failed to load skeleton, continuing without animations",
          );
        } else {
          const skeletonParseResult = await fromPromise(
            parseSkeletonRsrc(skeletonBufferResult.value),
          );
          if (skeletonParseResult.isErr()) {
            console.error("Error parsing skeleton:", skeletonParseResult.error);
            toast.warning(
              "Failed to load skeleton, continuing without animations",
            );
          } else {
            skeletonData = skeletonParseResult.value;
            console.log(
              `Successfully parsed skeleton with ${Object.keys(skeletonData?.Bone || {}).length || 0} bones`,
            );
          }
        }
      }

      // Send to worker for parsing and GLB conversion
      const worker = new BG3DGltfWorker();
      const workerPromise = new Promise<BG3DGltfWorkerResponse>(
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
 
      const workerResult = await fromPromise(workerPromise);
      if (workerResult.isErr()) {
        const message = workerResult.error instanceof Error ? workerResult.error.message : String(workerResult.error);
        toast.error(`Error loading model: ${message}`);
        onLoadingChange(false);
        return err(new Error(message));
      }
 
      const result = workerResult.value;

      if (result.type === "error") {
        const message = `Error loading model: ${result.error}`;
        toast.error(message);
        onLoadingChange(false);
        return err(new Error(message));
      }

      if (
        result.type === "bg3d-to-glb" ||
        result.type === "bg3d-with-skeleton-to-glb"
      ) {
        // Store parsed data for texture operations and editing
        const enhancedParsed = result.parsed;
        if (enhancedParsed) {
          onBg3dParsedChange(enhancedParsed);

          // Check if skeleton data was preserved
          if (enhancedParsed.skeleton?.animations?.length) {
            console.log(
              `Animation metadata preserved: ${enhancedParsed.skeleton.animations.length} animations detected`,
            );
          }

          // Extract and display textures
          const textures = await extractTexturesFromBG3D(enhancedParsed);
          onTexturesChange(textures);
        }

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
        return ok(undefined);
      }
 
      onLoadingChange(false);
      return err(new Error("Failed to process file: unknown state"));
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
