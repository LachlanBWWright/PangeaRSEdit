import { parseNumKData } from "../parseHelpers";
import type { NumKRaw } from "../parseSkeletonRsrcTS";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Type guard for NumKRaw
function isNumKRaw(value: unknown): value is NumKRaw {
  return isRecord(value) && typeof value.numKeyFrames === "number";
}

export function handleNumK(
  _resourceName: string,
  resourceData: NumKRaw[] | { obj?: NumKRaw[] } | undefined,
  hexData: string,
): NumKRaw[] {
  // Check if resourceData has obj field (rsrcdump format)
  if (isRecord(resourceData) && "obj" in resourceData && Array.isArray(resourceData.obj)) {
    const objArr = resourceData.obj;
    if (objArr.length > 0 && isNumKRaw(objArr[0])) {
      return objArr.filter(isNumKRaw);
    }
  }
  
  if (Array.isArray(resourceData) && resourceData.length > 0 && isNumKRaw(resourceData[0])) {
    return resourceData.filter(isNumKRaw);
  }
  
  return parseNumKData(hexData);
}
