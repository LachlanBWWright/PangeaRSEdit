import { decodePascalHexString } from "../parseHelpers";
import type { AnHdRaw } from "../parseSkeletonRsrcTS";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAnHdRaw(value: unknown): value is AnHdRaw {
  return (
    isRecord(value) &&
    typeof value.animName === "string" &&
    typeof value.numAnimEvents === "number"
  );
}

export function handleAnHd(
  resourceName: string,
  resourceData: AnHdRaw | { obj?: AnHdRaw } | undefined,
): AnHdRaw {
  const obj = isRecord(resourceData) && isAnHdRaw(resourceData.obj)
    ? resourceData.obj
    : resourceData;
  if (isAnHdRaw(obj)) {
    const rd = obj;
    return {
      animName: isRecord(resourceData) && isAnHdRaw(resourceData.obj)
        ? decodePascalHexString(String(rd.animName))
        : String(rd.animName),
      numAnimEvents: rd.numAnimEvents,
    };
  }

  // Fallback: keep minimal structure
  const name = isRecord(resourceData) && "name" in resourceData && typeof resourceData.name === "string"
    ? resourceData.name
    : resourceName;
  return {
    animName: name,
    numAnimEvents: 0,
  };
}
