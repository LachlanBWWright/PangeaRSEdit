import { decodePascalHexString } from "../parseHelpers";
import type { AnHdRaw } from "../parseSkeletonRsrcTS";
import {
  plainObjectSchema,
  anHdRawSchema,
  getStringField,
} from "@/schemas/common";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return plainObjectSchema.safeParse(value).success;
}

function isAnHdRaw(value: unknown): value is AnHdRaw {
  return anHdRawSchema.safeParse(value).success;
}

export function handleAnHd(
  resourceName: string,
  resourceData: AnHdRaw | { obj?: AnHdRaw } | undefined,
): AnHdRaw {
  const obj =
    isRecord(resourceData) && isAnHdRaw(resourceData.obj)
      ? resourceData.obj
      : resourceData;
  if (isAnHdRaw(obj)) {
    const rd = obj;
    const isParsedObj = isRecord(resourceData) && isAnHdRaw(resourceData.obj);
    const animName = isParsedObj
      ? decodePascalHexString(String(rd.animName))
      : String(rd.animName);
    return { animName, numAnimEvents: rd.numAnimEvents };
  }

  // Fallback: keep minimal structure
  const name = isRecord(resourceData)
    ? getStringField(resourceData, "name", resourceName)
    : resourceName;
  return {
    animName: name,
    numAnimEvents: 0,
  };
}
