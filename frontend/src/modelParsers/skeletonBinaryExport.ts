// Binary skeleton resource export functionality
// Converts SkeletonResource JSON back to binary .rsrc format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import { skeletonSpecs } from "../python/structSpecs/skeleton/skeleton";

// Global storage for Finder Info to preserve during round-trip
let globalFinderInfo: Uint8Array | undefined = undefined;

export function setFinderInfo(finderInfo: Uint8Array | undefined) {
  globalFinderInfo = finderInfo;
}

export function getFinderInfo(): Uint8Array | undefined {
  return globalFinderInfo;
}

/**
 * Convert SkeletonResource JSON to binary .rsrc format
 * @param skeletonResource The skeleton resource to convert
 * @returns ArrayBuffer
 */
export function skeletonResourceToBinary(
  skeletonResource: SkeletonResource,
): ArrayBuffer {
  console.log(
    "Converting SkeletonResource to binary format using rsrcdump-ts...",
  );

  // Use rsrcdump-ts loadBytesFromJson to convert back to binary
  const result = loadBytesFromJson(
    skeletonResource,
    skeletonSpecs,
    [],
    [],
    true // includeFinderInfo
  );

  if (!result.ok) {
    throw new Error(`Failed to serialize skeleton: ${result.error}`);
  }

  return result.value.buffer as ArrayBuffer;
}
