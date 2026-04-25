import { parseKeyFData } from "../parseHelpers";
import type { KeyFRaw } from "../parseSkeletonRsrcTS";
import { plainObjectSchema, keyFRawSchema, getStringField } from "@/schemas/common";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return plainObjectSchema.safeParse(value).success;
}

// Type guard for KeyFRaw
function isKeyFRaw(value: unknown): value is KeyFRaw {
  return keyFRawSchema.safeParse(value).success;
}

export function handleKeyF(
  resourceName: string,
  resourceData: KeyFRaw[] | { obj?: KeyFRaw[]; data?: string } | undefined,
  resourceId: string,
  hexData: string,
): KeyFRaw[] {
  void resourceName;
  void resourceId;
  void hexData;

  // Check if resourceData has obj field (rsrcdump format)
  if (
    isRecord(resourceData) &&
    "obj" in resourceData &&
    Array.isArray(resourceData.obj)
  ) {
    const objArr = resourceData.obj;
    if (objArr.length > 0 && isKeyFRaw(objArr[0])) {
      return objArr.filter(isKeyFRaw);
    }
    // Handle empty or malformed obj array
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
  const hex = isRecord(resourceData) ? getStringField(resourceData, "data") : "";
  const obj = parseKeyFData(hex);
  return obj;
}
