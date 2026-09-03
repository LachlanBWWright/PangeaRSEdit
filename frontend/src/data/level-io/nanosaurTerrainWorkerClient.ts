import NanosaurTerrainWorker from "@/workers/nanosaurTerrain.worker?worker";
import { errAsync, okAsync, Result, ResultAsync } from "neverthrow";
import {
  nanosaurTerrainWorkerRequestSchema,
  nanosaurTerrainWorkerResponseSchema,
} from "./nanosaurTerrainWorkerSchemas";
import type { LevelIoImagePayload } from "./levelIoTypes";
import type { NanosaurTerrainWorkerRequest } from "./nanosaurTerrainWorkerSchemas";

export function parseNanosaurTerrainWithWorker(
  buffer: ArrayBuffer,
): ResultAsync<readonly LevelIoImagePayload[], string> {
  const request: NanosaurTerrainWorkerRequest = {
    requestId: `nanosaur-terrain-${String(Date.now())}`,
    type: "parse-nanosaur-terrain",
    buffer,
  };
  const parsedRequest = nanosaurTerrainWorkerRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    return errAsync("Invalid Nanosaur terrain worker request.");
  }

  const workerResult = Result.fromThrowable(
    () => new NanosaurTerrainWorker(),
    () => "Failed to construct the Nanosaur terrain worker.",
  )();
  if (workerResult.isErr()) {
    return errAsync(workerResult.error);
  }

  const worker = workerResult.value;
  return ResultAsync.fromPromise(
    new Promise<readonly LevelIoImagePayload[]>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const parsedResponse = nanosaurTerrainWorkerResponseSchema.safeParse(
          event.data,
        );
        if (!parsedResponse.success) {
          worker.terminate();
          reject("Nanosaur terrain worker returned an invalid response.");
          return;
        }
        if (parsedResponse.data.requestId !== request.requestId) {
          return;
        }
        worker.terminate();
        if (parsedResponse.data.type === "failed") {
          reject(parsedResponse.data.message);
          return;
        }
        resolve(parsedResponse.data.images);
      };
      worker.onerror = () => {
        worker.terminate();
        reject("Nanosaur terrain worker failed.");
      };
      worker.postMessage(parsedRequest.data, [parsedRequest.data.buffer]);
    }),
    (error) => String(error),
  ).andThen((images) => okAsync(images));
}
