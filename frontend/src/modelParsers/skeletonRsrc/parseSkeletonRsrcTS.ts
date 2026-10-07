export * from "../../../../packages/model-codec/src/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { parseSkeletonRsrcResult, parseSkeletonRsrcJsonResult } from "../../../../packages/model-codec/src/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";

export async function parseSkeletonRsrc(bytes: ArrayBuffer) {
  return parseSkeletonRsrcResult(bytes).match((value) => value, (error) => Promise.reject(error));
}

export async function parseSkeletonRsrcJson(bytes: ArrayBuffer) {
  return parseSkeletonRsrcJsonResult(bytes).match((value) => value, (error) => Promise.reject(error));
}
