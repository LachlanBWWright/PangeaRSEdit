import { parseBonNData } from "../parseHelpers";
import type { BonNRaw } from "../parseSkeletonRsrc";

export function handleBonN(
  _resourceName: string,
  resourceData: BonNRaw[] | { obj?: BonNRaw[] } | undefined,
  hexData: string,
): BonNRaw[] {
  // Check if resourceData has obj field (rsrcdump format)
  const actualData = (resourceData as { obj?: BonNRaw[] })?.obj || resourceData;
  
  if (
    Array.isArray(actualData) &&
    actualData.length > 0 &&
    (actualData[0] as BonNRaw).normal !== undefined
  ) {
    return actualData as BonNRaw[];
  }
  
  // Fallback to hex parsing if needed
  return parseBonNData(hexData);
}
