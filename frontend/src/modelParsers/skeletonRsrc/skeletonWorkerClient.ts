import SkeletonWorker from "./skeleton.worker?worker";
import { errAsync, okAsync, Result, ResultAsync } from "neverthrow";
import type { SkeletonResource } from "@/python/structSpecs/skeleton/skeletonInterface";
import {
  skeletonResourceSchema,
  skeletonWorkerRequestSchema,
  skeletonWorkerResponseSchema,
} from "./skeletonWorkerSchemas";

let requestCounter = 0;

export function parseSkeletonRsrcWithWorker(
  buffer: ArrayBuffer,
): ResultAsync<SkeletonResource, string> {
  requestCounter += 1;
  const request = {
    requestId: `skeleton-${String(requestCounter)}`,
    type: "parse-skeleton-rsrc",
    buffer,
  };
  const requestResult = skeletonWorkerRequestSchema.safeParse(request);
  if (!requestResult.success) {
    return errAsync("Invalid skeleton worker request.");
  }

  const workerResult = Result.fromThrowable(
    () => new SkeletonWorker(),
    () => "Failed to construct the skeleton worker.",
  )();
  if (workerResult.isErr()) return errAsync(workerResult.error);

  const worker = workerResult.value;
  return ResultAsync.fromPromise(
    new Promise<SkeletonResource>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const responseResult = skeletonWorkerResponseSchema.safeParse(
          event.data,
        );
        if (!responseResult.success) {
          worker.terminate();
          reject("Skeleton worker returned an invalid response.");
          return;
        }
        if (responseResult.data.requestId !== request.requestId) return;
        worker.terminate();
        if (responseResult.data.type === "failed") {
          reject(responseResult.data.message);
          return;
        }
        const skeletonResult = skeletonResourceSchema.safeParse(
          responseResult.data.skeleton,
        );
        if (!skeletonResult.success) {
          reject("Skeleton worker returned an invalid skeleton.");
          return;
        }
        resolve(skeletonResult.data);
      };
      worker.onerror = () => {
        worker.terminate();
        reject("Skeleton worker failed.");
      };
      worker.postMessage(requestResult.data, [requestResult.data.buffer]);
    }),
    (error) => String(error),
  ).andThen((skeleton) => okAsync(skeleton));
}
