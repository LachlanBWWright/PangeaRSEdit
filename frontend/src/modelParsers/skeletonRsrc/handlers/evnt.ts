import { parseEvntData } from "../parseHelpers";
import type { EvntRaw } from "../parseSkeletonRsrcTS";
import { plainObjectSchema, evntRawSchema } from "@/schemas/common";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return plainObjectSchema.safeParse(value).success;
}

// Type guard for EvntRaw
function isEvntRaw(value: unknown): value is EvntRaw {
  return evntRawSchema.safeParse(value).success;
}

function parseEvntObjArray(
  resourceName: string,
  objArr: EvntRaw[],
): EvntRaw[] | null {
  if (objArr.length === 0 || !isEvntRaw(objArr[0])) return null;
  console.log(
    `[DEBUG] Using rsrcdump-parsed Evnt data from 'obj' field for ${resourceName}: ${objArr.length} events`,
  );
  return objArr.filter(isEvntRaw);
}

export function handleEvnt(
  resourceName: string,
  resourceData: EvntRaw[] | { obj?: EvntRaw[] } | undefined,
  _resourceId: string,
  hexData: string,
): EvntRaw[] {
  // Check if resourceData has obj field (rsrcdump format)
  if (
    isRecord(resourceData) &&
    "obj" in resourceData &&
    Array.isArray(resourceData.obj)
  ) {
    const parsedObj = parseEvntObjArray(resourceName, resourceData.obj);
    if (parsedObj) return parsedObj;
  }

  if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    isEvntRaw(resourceData[0])
  ) {
    console.log(
      `[DEBUG] Using rsrcdump-parsed Evnt data (array format) for ${resourceName}: ${resourceData.length} events`,
    );
    return resourceData.filter(isEvntRaw);
  }

  console.log(
    `[DEBUG] Fallback: parsing Evnt ${resourceName} from hexData (${
      hexData?.length || 0
    } bytes)`,
  );
  return parseEvntData(hexData);
}
