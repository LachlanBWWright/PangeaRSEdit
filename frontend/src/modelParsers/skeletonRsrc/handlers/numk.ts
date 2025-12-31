import { parseNumKData } from "../parseHelpers";
import type { NumKRaw } from "../parseSkeletonRsrcTS";

export function handleNumK(
  _resourceName: string,
  resourceData: NumKRaw[] | { obj?: NumKRaw[] } | undefined,
  hexData: string,
): NumKRaw[] {
  if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    resourceData[0].numKeyFrames !== undefined
  ) {
    return resourceData;
  }
  return parseNumKData(hexData);
}
