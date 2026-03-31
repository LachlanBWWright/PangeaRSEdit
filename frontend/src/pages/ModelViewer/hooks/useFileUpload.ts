/**
 * Custom hook for handling BG3D/3DMF file uploads
 *
 * Manages the file upload workflow including:
 * - File format detection and validation
 * - 3DMF parsing and direct GLB conversion
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
import { parseBG3D, type BG3DParseResult } from "../../../modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "../../../modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import {
  getGlbToBg3dWorkerResponse,
  getModelToGlbWorkerResponse,
  type ModelToGlbWorkerResponse,
} from "../utils/bg3dGltfWorkerResponses";
import { extractTexturesFromBG3D } from "../utils/textureUtils";
import type { SkeletonResource } from "../../../python/structSpecs/skeleton/skeletonInterface";
import type { Texture } from "../types";
import { fromPromise, ok, err, type Result } from "@/types/result";

/**
 * Configuration for the useFileUpload hook
 */
export interface UseFileUploadOptions {
  /** Called when glTF URL is available */
  onGltfUrlChange: (url: string) => void;
  /** Called when the raw GLB buffer is available */
  onGltfBufferChange: (buffer: ArrayBuffer | null) => void;
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

export async function parseGlbImportResult(
  result: Extract<BG3DGltfWorkerResponse, { type: "glb-to-bg3d" }>,
): Promise<Result<BG3DParseResult, Error>> {
  if (result.parsed) {
    return ok(result.parsed);
  }

  const fallback = parseBG3D(result.result);
  if (fallback.isErr()) {
    return err(fallback.error);
  }

  return ok(fallback.value);
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
    onGltfBufferChange,
    onBg3dParsedChange,
    onTexturesChange,
    onLoadingChange,
    onUploadStepChange,
  } = options;

  const finalizeModelLoad = useCallback(
    async (
      displayFileName: string,
      result: ModelToGlbWorkerResponse,
    ): Promise<Result<void, Error>> => {
      if (result.parsed) {
        onBg3dParsedChange(result.parsed);
        const textures = await extractTexturesFromBG3D(result.parsed);
        onTexturesChange(textures);
      }

      onGltfBufferChange(result.result);
      const glbBlob = new Blob([result.result], {
        type: "model/gltf-binary",
      });
      const url = URL.createObjectURL(glbBlob);
      onGltfUrlChange(url);

      toast.success(`Successfully loaded ${displayFileName}`);
      onUploadStepChange("completed");
      onLoadingChange(false);
      return ok(undefined);
    },
    [
      onBg3dParsedChange,
      onGltfBufferChange,
      onGltfUrlChange,
      onLoadingChange,
      onTexturesChange,
      onUploadStepChange,
    ],
  );

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
      const isGlb = fileName.endsWith(".glb");

      if (!isBg3d && !is3dmf && !isGlb) {
        const message = "Please select a BG3D, 3DMF, or GLB file";
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

      if (isGlb) {
        const glbBufferResult = await fromPromise(bg3dFile.arrayBuffer());
        if (glbBufferResult.isErr()) {
          const message = `Failed to read GLB file: ${glbBufferResult.error.message}`;
          toast.error(message);
          onLoadingChange(false);
          return err(new Error(message));
        }

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

            worker.postMessage({
              type: "glb-to-bg3d",
              buffer: glbBufferResult.value,
            } satisfies BG3DGltfWorkerMessage);
          },
        );

        const workerResult = await fromPromise(workerPromise);
        if (workerResult.isErr()) {
          const message =
            workerResult.error instanceof Error
              ? workerResult.error.message
              : String(workerResult.error);
          toast.error(`Failed to convert GLB to BG3D: ${message}`);
          onLoadingChange(false);
          return err(new Error(message));
        }

        const responseResult = getGlbToBg3dWorkerResponse(
          workerResult.value,
          "convert GLB to BG3D",
        );
        if (responseResult.isErr()) {
          const message = responseResult.error.message;
          toast.error(message);
          onLoadingChange(false);
          return err(new Error(message));
        }

        const parsedResult = await parseGlbImportResult(responseResult.value);
        if (parsedResult.isErr()) {
          const message = `Failed to load BG3D from GLB: ${parsedResult.error.message}`;
          toast.error(message);
          onLoadingChange(false);
          return err(new Error(message));
        }

        const parsed = parsedResult.value;

        onGltfBufferChange(glbBufferResult.value);
        onBg3dParsedChange(parsed);
        const textures = await extractTexturesFromBG3D(parsed);
        onTexturesChange(textures);

        const glbBlob = new Blob([glbBufferResult.value], {
          type: "model/gltf-binary",
        });
        const url = URL.createObjectURL(glbBlob);
        onGltfUrlChange(url);

        toast.success(`Successfully loaded ${bg3dFile.name}`);
        onUploadStepChange("completed");
        onLoadingChange(false);
        return ok(undefined);
      }

      // Handle 3DMF conversion path
      if (is3dmf) {
        const dmfBufferResult = await fromPromise(bg3dFile.arrayBuffer());
        if (dmfBufferResult.isErr()) {
          const message = `Failed to read 3DMF file: ${dmfBufferResult.error.message}`;
          toast.error(message);
          onLoadingChange(false);
          return err(new Error(message));
        }
        const dmfBuffer = dmfBufferResult.value;

        // Parse skeleton file if provided
        let skeletonData: SkeletonResource | undefined;
        if (skeletonFile) {
          const skeletonBufferResult = await fromPromise(
            skeletonFile.arrayBuffer(),
          );
          if (skeletonBufferResult.isErr()) {
            console.error(
              "Error reading skeleton file:",
              skeletonBufferResult.error,
            );
            toast.error(
              `Failed to read skeleton file: ${skeletonBufferResult.error.message}`,
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
              toast.error(
                `Failed to parse skeleton file: ${skeletonParseResult.error.message}`,
              );
            } else {
              skeletonData = skeletonParseResult.value;
            }
          }
        }

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
              // Send the original 3DMF buffer plus skeleton data directly.
              const message = {
                type: "model-with-skeleton-to-glb",
                modelBuffer: dmfBuffer,
                skeletonData,
              } satisfies BG3DGltfWorkerMessage;
              worker.postMessage(message);
            } else {
              // Send the original 3DMF buffer directly.
              const message = {
                type: "bg3d-to-glb",
                buffer: dmfBuffer,
              } satisfies BG3DGltfWorkerMessage;
              worker.postMessage(message);
            }
          },
        );

        const workerResult = await fromPromise(workerPromise);
        if (workerResult.isErr()) {
          const message =
            workerResult.error instanceof Error
              ? workerResult.error.message
              : String(workerResult.error);
          toast.error(`Error loading model: ${message}`);
          onLoadingChange(false);
          return err(new Error(message));
        }

        const responseResult = getModelToGlbWorkerResponse(
          workerResult.value,
          "load 3DMF model",
        );
        if (responseResult.isErr()) {
          toast.error(responseResult.error.message);
          onLoadingChange(false);
          return err(responseResult.error);
        }

        return finalizeModelLoad(bg3dFile.name, responseResult.value);
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
        const skeletonBufferResult = await fromPromise(
          skeletonFile.arrayBuffer(),
        );
        if (skeletonBufferResult.isErr()) {
          console.error(
            "Error reading skeleton file:",
            skeletonBufferResult.error,
          );
          toast.error(
            `Failed to read skeleton file: ${skeletonBufferResult.error.message}`,
          );
        } else {
          const skeletonParseResult = await fromPromise(
            parseSkeletonRsrc(skeletonBufferResult.value),
          );
          if (skeletonParseResult.isErr()) {
            console.error("Error parsing skeleton:", skeletonParseResult.error);
            toast.error(
              `Failed to parse skeleton file: ${skeletonParseResult.error.message}`,
            );
          } else {
            skeletonData = skeletonParseResult.value;
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
            const message = {
              type: "bg3d-with-skeleton-to-glb",
              bg3dBuffer: bg3dArrayBuffer,
              skeletonData,
            } satisfies BG3DGltfWorkerMessage;
            worker.postMessage(message);
          } else {
            // Send model only
            const message = {
              type: "bg3d-to-glb",
              buffer: bg3dArrayBuffer,
            } satisfies BG3DGltfWorkerMessage;
            worker.postMessage(message);
          }
        },
      );

      const workerResult = await fromPromise(workerPromise);
      if (workerResult.isErr()) {
        const message =
          workerResult.error instanceof Error
            ? workerResult.error.message
            : String(workerResult.error);
        toast.error(`Error loading model: ${message}`);
        onLoadingChange(false);
        return err(new Error(message));
      }

      const responseResult = getModelToGlbWorkerResponse(
        workerResult.value,
        "load BG3D model",
      );
      if (responseResult.isErr()) {
        toast.error(responseResult.error.message);
        onLoadingChange(false);
        return err(responseResult.error);
      }

      const displayFileName = skeletonFile
        ? `${bg3dFile.name} + ${skeletonFile.name}`
        : bg3dFile.name;
      return finalizeModelLoad(displayFileName, responseResult.value);
    },
    [
      finalizeModelLoad,
      onGltfUrlChange,
      onBg3dParsedChange,
      onTexturesChange,
      onLoadingChange,
      onUploadStepChange,
      onGltfBufferChange,
    ],
  );

  return { uploadFile };
}
