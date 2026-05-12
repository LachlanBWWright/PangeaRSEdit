import LevelIoWorker from "@/workers/levelIo.worker?worker";
import { ResultAsync, errAsync } from "neverthrow";
import type { GlobalsInterface } from "@/data/globals/globals";
import {
  levelIoRequestSchema,
  levelIoResponseSchema,
} from "./levelIoSchemas";
import { levelIoError, type LevelIoError } from "./levelIoErrors";
import type {
  LevelIoImagePayload,
  LevelIoProgress,
  LevelIoResponse,
  ParseLevelRequest,
  PreparePreviewRequest,
  SerializeDownloadRequest,
} from "./levelIoTypes";

interface ActiveWorker {
  readonly requestId: string;
  readonly worker: Worker;
}

const activeWorkers = new Map<string, ActiveWorker>();
let requestCounter = 0;

function nextRequestId(operation: string): string {
  requestCounter += 1;
  return `${operation}-${String(requestCounter)}`;
}

function cancelActiveWorker(operation: string): void {
  const activeWorker = activeWorkers.get(operation);
  if (!activeWorker) {
    return;
  }
  activeWorker.worker.terminate();
  activeWorkers.delete(operation);
}

function collectImageTransfers(
  images: readonly LevelIoImagePayload[],
): Transferable[] {
  const transfers: Transferable[] = [];
  for (const image of images) {
    transfers.push(image.rgbaBytes);
  }
  return transfers;
}

function createWorkerResult(): ResultAsync<Worker, LevelIoError> {
  const createResult = ResultAsync.fromPromise(
    Promise.resolve().then(() => new LevelIoWorker()),
    () =>
      levelIoError(
        "worker.unavailable",
        "Failed to construct the level I/O worker",
      ),
  );
  return createResult;
}

function runWorkerRequest(
  operation: string,
  request: ParseLevelRequest | SerializeDownloadRequest | PreparePreviewRequest,
  transferables: Transferable[],
  onProgress?: (progress: LevelIoProgress) => void,
): ResultAsync<LevelIoResponse, LevelIoError> {
  const parsedRequest = levelIoRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    return errAsync(
      levelIoError("worker.invalid-request", parsedRequest.error.message),
    );
  }

  cancelActiveWorker(operation);

  return createWorkerResult().andThen((worker) =>
    ResultAsync.fromPromise(
      new Promise<LevelIoResponse>((resolve, reject) => {
        activeWorkers.set(operation, {
          requestId: request.requestId,
          worker,
        });

        worker.onmessage = (event: MessageEvent<unknown>) => {
          const parsedResponse = levelIoResponseSchema.safeParse(event.data);
          if (!parsedResponse.success) {
            activeWorkers.delete(operation);
            worker.terminate();
            reject(
              levelIoError(
                "worker.invalid-response",
                parsedResponse.error.message,
              ),
            );
            return;
          }

          const response = parsedResponse.data;
          if (response.requestId !== request.requestId) {
            return;
          }

          if (response.type === "progress") {
            onProgress?.(response.progress);
            return;
          }

          activeWorkers.delete(operation);
          worker.terminate();

          if (response.type === "failed") {
            reject(levelIoError("worker.failed", response.error.message));
            return;
          }

          resolve(response);
        };

        worker.onerror = () => {
          activeWorkers.delete(operation);
          worker.terminate();
          reject(
            levelIoError(
              "worker.failed",
              "The level I/O worker encountered an unexpected error",
            ),
          );
        };

        worker.postMessage(parsedRequest.data, transferables);
      }),
      (error) => {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          "message" in error
        ) {
          const code = String(error.code);
          const message = String(error.message);
          if (
            code === "worker.unavailable" ||
            code === "worker.invalid-request" ||
            code === "worker.invalid-response" ||
            code === "worker.failed"
          ) {
            return levelIoError(code, message);
          }
        }
        return levelIoError(
          "worker.failed",
          error instanceof Error ? error.message : String(error),
        );
      },
    ),
  );
}

export function parseLevelWithWorker(
  options: {
    readonly globals: GlobalsInterface;
    readonly fileName: string;
    readonly levelBytes: ArrayBuffer;
    readonly mightyMikeTilesetBytes?: ArrayBuffer;
    readonly mightyMikePaletteBytes?: ArrayBuffer;
    readonly mightyMikeSceneName?: string;
  },
  onProgress?: (progress: LevelIoProgress) => void,
) {
  const requestId = nextRequestId("parse-level");
  const request: ParseLevelRequest = {
    requestId,
    type: "parse-level",
    globals: options.globals,
    fileName: options.fileName,
    levelBytes: options.levelBytes,
    mightyMikeTilesetBytes: options.mightyMikeTilesetBytes,
    mightyMikePaletteBytes: options.mightyMikePaletteBytes,
    mightyMikeSceneName: options.mightyMikeSceneName,
  };
  const transferables: Transferable[] = [request.levelBytes];
  if (request.mightyMikeTilesetBytes) {
    transferables.push(request.mightyMikeTilesetBytes);
  }
  if (request.mightyMikePaletteBytes) {
    transferables.push(request.mightyMikePaletteBytes);
  }
  return runWorkerRequest(
    "parse-level",
    request,
    transferables,
    onProgress,
  ).andThen((response) => {
    if (response.type !== "parsed-level") {
      return errAsync(
        levelIoError(
          "worker.invalid-response",
          `Unexpected level I/O response: ${response.type}`,
        ),
      );
    }
    return ResultAsync.fromPromise(Promise.resolve(response), () =>
      levelIoError("worker.invalid-response", "Failed to parse worker response"),
    );
  });
}

export function serializeDownloadWithWorker(
  options: {
    readonly globals: GlobalsInterface;
    readonly fileName: string;
    readonly mapImagesFileName?: string;
    readonly levelData: unknown;
    readonly mapImages: readonly LevelIoImagePayload[];
  },
  onProgress?: (progress: LevelIoProgress) => void,
) {
  const requestId = nextRequestId("serialize-download");
  const request: SerializeDownloadRequest = {
    requestId,
    type: "serialize-download",
    globals: options.globals,
    fileName: options.fileName,
    mapImagesFileName: options.mapImagesFileName,
    levelData: options.levelData,
    mapImages: options.mapImages,
  };
  return runWorkerRequest(
    "serialize-download",
    request,
    collectImageTransfers(request.mapImages),
    onProgress,
  ).andThen((response) => {
    if (response.type !== "serialized-download") {
      return errAsync(
        levelIoError(
          "worker.invalid-response",
          `Unexpected level I/O response: ${response.type}`,
        ),
      );
    }
    return ResultAsync.fromPromise(Promise.resolve(response), () =>
      levelIoError("worker.invalid-response", "Failed to parse worker response"),
    );
  });
}

export function preparePreviewWithWorker(
  options: {
    readonly globals: GlobalsInterface;
    readonly levelData: unknown;
    readonly mapImages: readonly LevelIoImagePayload[];
  },
  onProgress?: (progress: LevelIoProgress) => void,
) {
  const requestId = nextRequestId("prepare-preview");
  const request: PreparePreviewRequest = {
    requestId,
    type: "prepare-preview",
    globals: options.globals,
    levelData: options.levelData,
    mapImages: options.mapImages,
  };
  return runWorkerRequest(
    "prepare-preview",
    request,
    collectImageTransfers(request.mapImages),
    onProgress,
  ).andThen((response) => {
    if (response.type !== "prepared-preview") {
      return errAsync(
        levelIoError(
          "worker.invalid-response",
          `Unexpected level I/O response: ${response.type}`,
        ),
      );
    }
    return ResultAsync.fromPromise(Promise.resolve(response), () =>
      levelIoError("worker.invalid-response", "Failed to parse worker response"),
    );
  });
}

export function cancelLevelIoOperation(
  operation: "parse-level" | "serialize-download" | "prepare-preview",
): void {
  cancelActiveWorker(operation);
}

export function clearLevelIoWorkers(): void {
  cancelActiveWorker("parse-level");
  cancelActiveWorker("serialize-download");
  cancelActiveWorker("prepare-preview");
}
