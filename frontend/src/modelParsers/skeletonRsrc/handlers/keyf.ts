import { parseKeyFData } from "../parseHelpers";
import type { KeyFRaw } from "../parseSkeletonRsrcTS";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Type guard for KeyFRaw
function isKeyFRaw(value: unknown): value is KeyFRaw {
  return isRecord(value) && typeof value.tick === "number";
}

export function handleKeyF(
  resourceName: string,
  resourceData: KeyFRaw[] | { obj?: KeyFRaw[]; data?: string } | undefined,
  resourceId: string,
  hexData: string,
): KeyFRaw[] {
  console.log(resourceId, hexData);

  // Check if resourceData has obj field (rsrcdump format)
  if (
    isRecord(resourceData) &&
    "obj" in resourceData &&
    Array.isArray(resourceData.obj)
  ) {
    const objArr = resourceData.obj;
    if (objArr.length > 0 && isKeyFRaw(objArr[0])) {
      console.log(
        `KeyF ${resourceName} data from rsrcdump:`,
        objArr.length,
        "keyframes",
      );
      return objArr.filter(isKeyFRaw);
    }
    // Handle empty or malformed obj array
    console.log(
      `KeyF ${resourceName} empty/malformed from rsrcdump:`,
      objArr.length,
      "keyframes",
    );
    return objArr.filter(isKeyFRaw);
  }

  // Handle array format directly
  if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    isKeyFRaw(resourceData[0])
  ) {
    return resourceData.filter(isKeyFRaw);
  }

  // Fallback to hex parsing
  console.log(`KeyF ${resourceName} raw resourceData:`, resourceData);
  console.log(`KeyF ${resourceName} resourceData type:`, typeof resourceData);
  console.log(
    `KeyF ${resourceName} resourceData.keys:`,
    isRecord(resourceData) ? Object.keys(resourceData) : [],
  );
  const hex =
    isRecord(resourceData) && typeof resourceData.data === "string"
      ? resourceData.data
      : "";
  console.log(`KeyF ${resourceName} hex data length:`, hex.length);
  const obj = parseKeyFData(hex);
  console.log(`KeyF ${resourceName} parsed from hex:`, obj.length, "keyframes");
  return obj;
}
