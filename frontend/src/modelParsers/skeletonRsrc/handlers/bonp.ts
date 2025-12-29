import { parseBonPData } from "../parseHelpers";
import type { BonPRaw } from "../parseSkeletonRsrc";

export function handleBonP(
  _resourceName: string,
  resourceData: BonPRaw[] | { obj?: BonPRaw[] } | undefined,
  hexData: string,
): BonPRaw[] {
  // Check if resourceData has obj field (rsrcdump format)
  const actualData = (resourceData as { obj?: BonPRaw[] })?.obj || resourceData;
  
  if (
    Array.isArray(actualData) &&
    actualData.length > 0 &&
    (actualData[0] as BonPRaw).pointIndex !== undefined
  ) {
    return actualData as BonPRaw[];
  }
  
  // Fallback to hex parsing if needed
  return parseBonPData(hexData);
}
