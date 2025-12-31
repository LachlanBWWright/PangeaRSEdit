import { parseBonPData } from "../parseHelpers";
import type { BonPRaw } from "../parseSkeletonRsrcTS";

export function handleBonP(
  _resourceName: string,
  resourceData: BonPRaw[] | { obj?: BonPRaw[] } | undefined,
  hexData: string,
): BonPRaw[] {
  // Check if resourceData has obj field (rsrcdump format)
  const actualData = resourceData?.obj || resourceData;
  
  if (
    Array.isArray(actualData) &&
    actualData.length > 0 &&
    actualData[0].pointIndex !== undefined
  ) {
    return actualData;
  }
  
  // Fallback to hex parsing if needed
  return parseBonPData(hexData);
}
