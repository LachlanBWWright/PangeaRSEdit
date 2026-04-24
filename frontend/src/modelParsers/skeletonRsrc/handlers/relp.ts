import { parseRelPData } from "../parseHelpers";
import type { RelPRaw } from "../parseSkeletonRsrcTS";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Type guard for RelPRaw
function isRelPRaw(value: unknown): value is RelPRaw {
  return (
    isRecord(value) &&
    typeof value.relOffsetX === "number" &&
    typeof value.relOffsetY === "number" &&
    typeof value.relOffsetZ === "number"
  );
}

function parseRelPObjArray(
  resourceName: string,
  objArr: RelPRaw[],
): RelPRaw[] | null {
  if (objArr.length === 0 || !isRelPRaw(objArr[0])) return null;
  console.log(
    `[DEBUG] Using rsrcdump-parsed RelP data from 'obj' field for ${resourceName}: ${objArr.length} points`,
  );
  return objArr.filter(isRelPRaw);
}

export function handleRelP(
  resourceName: string,
  resourceData: RelPRaw[] | { obj?: RelPRaw[] } | undefined,
  resourceId: string,
  hexData: string,
): RelPRaw[] {
  console.log(
    `[DEBUG] Parsing RelP resource ${resourceName} (${resourceId}):`,
    {
      hasResourceData: Array.isArray(resourceData) && resourceData.length > 0,
      resourceDataLength: Array.isArray(resourceData) ? resourceData.length : 0,
      hexDataLength: hexData?.length || 0,
      resourceKeys: isRecord(resourceData) ? Object.keys(resourceData) : [],
      hasData: isRecord(resourceData) && "data" in resourceData,
      hasObj: isRecord(resourceData) && "obj" in resourceData,
      hasConversionError:
        isRecord(resourceData) && "conversionError" in resourceData,
    },
  );

  // Check if resourceData has obj field (rsrcdump format)
  if (
    isRecord(resourceData) &&
    "obj" in resourceData &&
    Array.isArray(resourceData.obj)
  ) {
    const parsedObj = parseRelPObjArray(resourceName, resourceData.obj);
    if (parsedObj) return parsedObj;
  }

  if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    isRelPRaw(resourceData[0])
  ) {
    console.log(
      `[DEBUG] Using rsrcdump-parsed RelP data (array format) for ${resourceName}: ${resourceData.length} points`,
    );
    return resourceData.filter(isRelPRaw);
  }

  console.log(
    `[DEBUG] Fallback: parsing RelP ${resourceName} from hexData (${
      hexData?.length || 0
    } bytes)`,
  );
  const obj = parseRelPData(hexData);
  console.log(`[DEBUG] Parsed ${obj.length} RelP points from hex data`);
  return obj;
}
