import { parseBonPData } from "../parseHelpers";
import type { BonPRaw } from "../parseSkeletonRsrcTS";

export function handleBonP(
  resourceName: string,
  resourceData: BonPRaw[] | { obj?: BonPRaw[] } | undefined,
  hexData: string,
): BonPRaw[] {
  if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    (resourceData[0] as BonPRaw).pointIndex !== undefined
  ) {
    return resourceData as BonPRaw[];
  }
  return parseBonPData(hexData);
}
