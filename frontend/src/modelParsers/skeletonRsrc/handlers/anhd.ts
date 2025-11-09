import type { AnHdRaw } from "../parseSkeletonRsrcTS";

export function handleAnHd(
  resourceName: string,
  resourceData: AnHdRaw | { name?: string; order?: number } | undefined,
): AnHdRaw {
  if (
    resourceData &&
    (resourceData as AnHdRaw).animName !== undefined &&
    (resourceData as AnHdRaw).numAnimEvents !== undefined
  ) {
    const rd = resourceData as AnHdRaw;
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
