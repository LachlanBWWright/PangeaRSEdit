import { parseNumKData } from "../parseHelpers";
import type { NumKRaw } from "../parseSkeletonRsrc";

export function handleNumK(
  _resourceName: string,
  resourceData: NumKRaw[] | { obj?: NumKRaw[] } | undefined,
  hexData: string,
): NumKRaw[] {
  if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    (resourceData[0] as NumKRaw).numKeyFrames !== undefined
  ) {
    return resourceData as NumKRaw[];
  }
  return parseNumKData(hexData);
}
