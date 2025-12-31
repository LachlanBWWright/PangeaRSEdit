import { parseBonPData } from "../parseHelpers";
import type { BonPRaw } from "../parseSkeletonRsrcTS";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Type guard for BonPRaw
function isBonPRaw(value: unknown): value is BonPRaw {
  return isRecord(value) && typeof value.pointIndex === "number";
}

export function handleBonP(
  _resourceName: string,
  resourceData: BonPRaw[] | { obj?: BonPRaw[] } | undefined,
  hexData: string,
): BonPRaw[] {
  // Check if resourceData has obj field (rsrcdump format)
  let actualData: unknown = resourceData;
  if (isRecord(resourceData) && "obj" in resourceData) {
    actualData = resourceData.obj;
  }
  
  if (Array.isArray(actualData) && actualData.length > 0 && isBonPRaw(actualData[0])) {
    return actualData.filter(isBonPRaw);
  }
  
  // Fallback to hex parsing if needed
  return parseBonPData(hexData);
}
