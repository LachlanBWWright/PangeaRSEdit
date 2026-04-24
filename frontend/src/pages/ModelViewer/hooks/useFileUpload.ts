import { useCallback } from "react";
import { toast } from "sonner";
import type {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../../../modelParsers/bg3dGltfWorker";
import {
  parseBG3D,
  type BG3DParseResult,
} from "../../../modelParsers/parseBG3D";
import {
  getGlbToBg3dWorkerResponse,
  getModelToGlbWorkerResponse,
  type ModelToGlbWorkerResponse,
} from "../utils/bg3dGltfWorkerResponses";
import { extractTexturesFromBG3D } from "../utils/textureUtils";
import type { SkeletonResource } from "@/python/structSpecs/skeleton/skeletonInterface";
import type { Texture } from "../types";
import { err, ok, type Result } from "neverthrow";
import {
  createDisplayFileName,
  loadOptionalSkeleton,
  readFileBuffer,
  runWorkerMessage,
  validateUploadSelection,
  type ModelUploadKind,
} from "./useFileUploadHelpers";

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

interface UploadRuntime extends UseFileUploadOptions {
  finalizeModelLoad: (
    displayFileName: string,
    result: ModelToGlbWorkerResponse,
  ) => Promise<Result<void, Error>>;
}

function createUploadRuntime(
  options: UseFileUploadOptions,
  finalizeModelLoad: UploadRuntime["finalizeModelLoad"],
): UploadRuntime {
  return {
    ...options,
    finalizeModelLoad,
  };
}

function reportInvalidSelection(error: Error): Result<void, Error> {
  toast.error(error.message);
  return err(error);
}

async function applyParsedIfPresent(
  parsed: BG3DParseResult | undefined,
  onBg3dParsedChange: (parsed: BG3DParseResult) => void,
  onTexturesChange: (textures: Texture[]) => void,
): Promise<void> {
  if (!parsed) return;

  onBg3dParsedChange(parsed);
  const textures = await extractTexturesFromBG3D(parsed);
  onTexturesChange(textures);
}

function failUpload(
  runtime: UseFileUploadOptions,
  message: string,
): Result<void, Error> {
  toast.error(message);
  runtime.onLoadingChange(false);
  return err(new Error(message));
}

function getWorkerErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function createGlbToBg3dMessage(buffer: ArrayBuffer): BG3DGltfWorkerMessage {
  return {
    type: "glb-to-bg3d",
    buffer,
  };
}

function createModelToGlbMessage(
  kind: Exclude<ModelUploadKind, "glb">,
  modelBuffer: ArrayBuffer,
  skeletonData?: SkeletonResource,
): BG3DGltfWorkerMessage {
  if (!skeletonData) return { type: "bg3d-to-glb", buffer: modelBuffer };
  if (kind === "3dmf") {
    return { type: "model-with-skeleton-to-glb", modelBuffer, skeletonData };
  }

  return {
    type: "bg3d-with-skeleton-to-glb",
    bg3dBuffer: modelBuffer,
    skeletonData,
  };
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

async function handleGlbUpload(
  runtime: UseFileUploadOptions,
  bg3dFile: File,
): Promise<Result<void, Error>> {
  const glbBufferResult = await readFileBuffer(bg3dFile, "GLB file");
  if (glbBufferResult.isErr()) {
    return failUpload(runtime, glbBufferResult.error.message);
  }

  const workerResult = await runWorkerMessage(
    createGlbToBg3dMessage(glbBufferResult.value),
  );
  if (workerResult.isErr()) {
    const message = `Failed to convert GLB to BG3D: ${getWorkerErrorMessage(workerResult.error)}`;
    return failUpload(runtime, message);
  }

  const responseResult = getGlbToBg3dWorkerResponse(
    workerResult.value,
    "convert GLB to BG3D",
  );
  if (responseResult.isErr()) {
    return failUpload(runtime, responseResult.error.message);
  }

  const parsedResult = await parseGlbImportResult(responseResult.value);
  if (parsedResult.isErr()) {
    const message = `Failed to load BG3D from GLB: ${parsedResult.error.message}`;
    return failUpload(runtime, message);
  }

  const parsed = parsedResult.value;
  runtime.onGltfBufferChange(glbBufferResult.value);
  runtime.onBg3dParsedChange(parsed);
  const textures = await extractTexturesFromBG3D(parsed);
  runtime.onTexturesChange(textures);

  const glbBlob = new Blob([glbBufferResult.value], {
    type: "model/gltf-binary",
  });
  runtime.onGltfUrlChange(URL.createObjectURL(glbBlob));

  toast.success(`Successfully loaded ${bg3dFile.name}`);
  runtime.onUploadStepChange("completed");
  runtime.onLoadingChange(false);
  return ok(undefined);
}

async function handleModelUpload(
  runtime: UploadRuntime,
  kind: Exclude<ModelUploadKind, "glb">,
  modelFile: File,
  skeletonFile?: File,
): Promise<Result<void, Error>> {
  const modelLabel = kind === "3dmf" ? "3DMF file" : "BG3D file";
  const modelBufferResult = await readFileBuffer(modelFile, modelLabel);
  if (modelBufferResult.isErr()) {
    return failUpload(runtime, modelBufferResult.error.message);
  }

  const skeletonLoadResult = await loadOptionalSkeleton(skeletonFile);
  if (skeletonLoadResult.warningMessage !== undefined) {
    toast.error(skeletonLoadResult.warningMessage);
  }

  const workerMessage = createModelToGlbMessage(
    kind,
    modelBufferResult.value,
    skeletonLoadResult.skeletonData,
  );
  const workerResult = await runWorkerMessage(workerMessage);

  if (workerResult.isErr()) {
    const message = `Error loading model: ${getWorkerErrorMessage(workerResult.error)}`;
    return failUpload(runtime, message);
  }

  const action = kind === "3dmf" ? "load 3DMF model" : "load BG3D model";
  const responseResult = getModelToGlbWorkerResponse(
    workerResult.value,
    action,
  );
  if (responseResult.isErr()) {
    return failUpload(runtime, responseResult.error.message);
  }

  const displayFileName = createDisplayFileName(
    modelFile.name,
    skeletonFile,
    skeletonLoadResult.skeletonFailed,
  );
  return runtime.finalizeModelLoad(displayFileName, responseResult.value);
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
      await applyParsedIfPresent(
        result.parsed,
        onBg3dParsedChange,
        onTexturesChange,
      );

      onGltfBufferChange(result.result);
      const glbBlob = new Blob([result.result], { type: "model/gltf-binary" });
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

  const uploadFile = useCallback(
    async (
      bg3dFile: File,
      skeletonFile?: File,
    ): Promise<Result<void, Error>> => {
      const selectionResult = validateUploadSelection(bg3dFile, skeletonFile);
      if (selectionResult.isErr())
        return reportInvalidSelection(selectionResult.error);

      onLoadingChange(true);
      const selection = selectionResult.value;
      const runtime = createUploadRuntime(options, finalizeModelLoad);

      if (selection.kind === "glb")
        return handleGlbUpload(options, selection.bg3dFile);

      return handleModelUpload(
        runtime,
        selection.kind,
        selection.bg3dFile,
        selection.skeletonFile,
      );
    },
    [finalizeModelLoad, onLoadingChange, options],
  );

  return { uploadFile };
}
