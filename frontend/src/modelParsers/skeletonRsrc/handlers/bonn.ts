import { parseBonNData } from "../parseHelpers";
import type { BonNRaw } from "../parseSkeletonRsrcTS";

export function handleBonN(
  resourceName: string,
  resourceData: BonNRaw[] | { obj?: BonNRaw[] } | undefined,
  hexData: string,
): BonNRaw[] {
  if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    (resourceData[0] as BonNRaw).normal !== undefined
  ) {
    return resourceData as BonNRaw[];
  }
  return parseBonNData(hexData);
}
