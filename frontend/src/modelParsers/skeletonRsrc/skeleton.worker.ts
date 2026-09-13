import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";
import { parseSkeletonRsrc } from "./parseSkeletonRsrcTS";
import {
  skeletonWorkerRequestSchema,
  type SkeletonWorkerResponse,
} from "./skeletonWorkerSchemas";

self.onmessage = (event: MessageEvent<unknown>) => {
  const requestResult = skeletonWorkerRequestSchema.safeParse(event.data);
  if (!requestResult.success) return;

  const request = requestResult.data;
  void ResultAsync.fromPromise(
    parseSkeletonRsrc(request.buffer),
    mapErr,
  ).match(
    (skeleton) => {
      const response: SkeletonWorkerResponse = {
        requestId: request.requestId,
        type: "parsed",
        skeleton,
      };
      self.postMessage(response);
    },
    (error) => {
      const response: SkeletonWorkerResponse = {
        requestId: request.requestId,
        type: "failed",
        message: String(error),
      };
      self.postMessage(response);
    },
  );
};
