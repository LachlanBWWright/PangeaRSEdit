import type { AnHdRaw } from "../parseSkeletonRsrc";

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
  return {
    animName:
      (resourceData as { name?: string; order?: number })?.name || resourceName,
    numAnimEvents: 0,
  };
}
