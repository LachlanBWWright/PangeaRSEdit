// Binary skeleton resource export functionality
// Converts SkeletonResource JSON back to binary .rsrc format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { loadBytesFromJson, isOk } from "@lachlanbwwright/rsrcdump-ts";
import { skeletonSpecs } from "../python/structSpecs/skeleton/skeleton";
import { ok, err, type Result } from "../types/result";

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
 * @returns Result<ArrayBuffer, Error>
 */
export function skeletonResourceToBinary(
  skeletonResource: SkeletonResource,
): Result<ArrayBuffer, Error> {
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

  if (!isOk(result)) {
    const msg = typeof result.error === "string" ? result.error : String(result.error);
    return err(new Error(`Failed to serialize skeleton: ${msg}`));
  }

  // loadBytesFromJson returns Uint8Array on success
  const out = result.value;
  const buffer = out.buffer;
  if (buffer instanceof ArrayBuffer) {
    return ok(buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
  }
  // Handle SharedArrayBuffer by copying to ArrayBuffer
  const copy = new ArrayBuffer(out.byteLength);
  new Uint8Array(copy).set(new Uint8Array(buffer, out.byteOffset, out.byteLength));
  return ok(copy);
}
