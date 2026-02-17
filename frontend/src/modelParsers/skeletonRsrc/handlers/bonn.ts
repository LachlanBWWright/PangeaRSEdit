import { parseBonNData } from "../parseHelpers";
import type { BonNRaw } from "../parseSkeletonRsrcTS";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Type guard for BonNRaw
function isBonNRaw(value: unknown): value is BonNRaw {
  return isRecord(value) && typeof value.normal === "number";
}

export function handleBonN(
  _resourceName: string,
  resourceData: BonNRaw[] | { obj?: BonNRaw[] } | undefined,
  hexData: string,
): BonNRaw[] {
  // Check if resourceData has obj field (rsrcdump format)
  let actualData: unknown = resourceData;
  if (isRecord(resourceData) && "obj" in resourceData) {
    actualData = resourceData.obj;
  }
  
  if (Array.isArray(actualData) && actualData.length > 0 && isBonNRaw(actualData[0])) {
    // Return array filtering to ensure all elements are BonNRaw
    return actualData.filter(isBonNRaw);
  }
  
  // Fallback to hex parsing if needed
  return parseBonNData(hexData);
}
