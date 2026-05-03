// Binary skeleton resource export functionality
// Converts SkeletonResource JSON back to binary .rsrc format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { loadBytesFromJson, isOk } from "@lachlanbwwright/rsrcdump-ts";
import { skeletonSpecs } from "../python/structSpecs/skeleton/skeleton";
import { ok, err, type Result } from "neverthrow";
import { encodePascalStringHex } from "./skeletonRsrc/parseHelpers";

// Global storage for Finder Info to preserve during round-trip
let globalFinderInfo: Uint8Array | undefined = undefined;

export function setFinderInfo(finderInfo: Uint8Array | undefined) {
  globalFinderInfo = finderInfo;
}

export function getFinderInfo(): Uint8Array | undefined {
  return globalFinderInfo;
}

function cloneSkeletonResource(skeletonResource: SkeletonResource): SkeletonResource {
  const cloned: SkeletonResource = {
    _metadata: skeletonResource._metadata
      ? { ...skeletonResource._metadata }
      : undefined,
    Hedr: Object.fromEntries(
      Object.entries(skeletonResource.Hedr).map(([key, entry]) => [
        key,
        {
          ...entry,
          obj: { ...entry.obj },
        },
      ]),
    ),
    Bone: Object.fromEntries(
      Object.entries(skeletonResource.Bone).map(([key, entry]) => [
        key,
        {
          ...entry,
          obj: { ...entry.obj },
        },
      ]),
    ),
    BonP: Object.fromEntries(
      Object.entries(skeletonResource.BonP).map(([key, entry]) => [
        key,
        {
          ...entry,
          obj: entry.obj.map((point) => ({ ...point })),
        },
      ]),
    ),
    BonN: Object.fromEntries(
      Object.entries(skeletonResource.BonN).map(([key, entry]) => [
        key,
        {
          ...entry,
          obj: entry.obj.map((normal) => ({ ...normal })),
        },
      ]),
    ),
  };

  if (skeletonResource.RelP) {
    cloned.RelP = Object.fromEntries(
      Object.entries(skeletonResource.RelP).map(([key, entry]) => [
        key,
        {
          ...entry,
          obj: entry.obj.map((point) => ({ ...point })),
        },
      ]),
    );
  }

  if (skeletonResource.AnHd) {
    cloned.AnHd = Object.fromEntries(
      Object.entries(skeletonResource.AnHd).map(([key, entry]) => [
        key,
        {
          ...entry,
          obj: { ...entry.obj },
        },
      ]),
    );
  }

  if (skeletonResource.Evnt) {
    cloned.Evnt = Object.fromEntries(
      Object.entries(skeletonResource.Evnt).map(([key, entry]) => [
        key,
        {
          ...entry,
          obj: entry.obj.map((event) => ({ ...event })),
        },
      ]),
    );
  }

  if (skeletonResource.NumK) {
    cloned.NumK = Object.fromEntries(
      Object.entries(skeletonResource.NumK).map(([key, entry]) => [
        key,
        {
          ...entry,
          obj: entry.obj.map((item) => ({ ...item })),
        },
      ]),
    );
  }

  if (skeletonResource.KeyF) {
    cloned.KeyF = Object.fromEntries(
      Object.entries(skeletonResource.KeyF).map(([key, entry]) => [
        key,
        {
          ...entry,
          obj: entry.obj.map((keyframe) => ({ ...keyframe })),
        },
      ]),
    );
  }

  if (
    skeletonResource.alis &&
    typeof skeletonResource.alis === "object" &&
    !Array.isArray(skeletonResource.alis)
  ) {
    cloned.alis = Object.fromEntries(
      Object.entries(skeletonResource.alis).map(([key, value]) => [
        key,
        value && typeof value === "object" && !Array.isArray(value)
          ? { ...value }
          : value,
      ]),
    );
  } else if (skeletonResource.alis !== undefined) {
    cloned.alis = skeletonResource.alis;
  }

  return cloned;
}

/**
 * Convert SkeletonResource JSON to binary .rsrc format
 * @param skeletonResource The skeleton resource to convert
 * @returns Result<ArrayBuffer, string>
 */
export function skeletonResourceToBinary(
  skeletonResource: SkeletonResource,
): Result<ArrayBuffer, string> {
  console.log(
    "Converting SkeletonResource to binary format using rsrcdump-ts...",
  );

  const binarySkeletonResource = cloneSkeletonResource(skeletonResource);

  for (const entry of Object.values(binarySkeletonResource.Bone || {})) {
    const boneName = entry?.obj?.name;
    if (typeof boneName === "string") {
      entry.obj.name = encodePascalStringHex(boneName, 32);
    }
  }

  for (const entry of Object.values(binarySkeletonResource.AnHd || {})) {
    const animName = entry?.obj?.animName;
    if (typeof animName === "string") {
      entry.obj.animName = encodePascalStringHex(animName, 33);
    }
  }

  // Use rsrcdump-ts loadBytesFromJson to convert back to binary
  const result = loadBytesFromJson(
    binarySkeletonResource,
    skeletonSpecs,
    [],
    [],
    true // includeFinderInfo
  );

  if (!isOk(result)) {
    return err(`Failed to serialize skeleton: ${result.error}`);
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
