import type { AnHdRaw } from "../parseSkeletonRsrcTS";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function handleAnHd(
  resourceName: string,
  resourceData: AnHdRaw,
): AnHdRaw {
  if (
    resourceData &&
    resourceData.animName !== undefined &&
    resourceData.numAnimEvents !== undefined
  ) {
    const rd = resourceData;
    return {
      animName: rd.animName,
      numAnimEvents: rd.numAnimEvents,
    };
  }

  // Fallback: keep minimal structure
  const name = isRecord(resourceData) && typeof resourceData.name === "string"
    ? resourceData.name
    : resourceName;
  return {
    animName: name,
    numAnimEvents: 0,
  };
}
