// Binary skeleton resource export functionality
// Converts SkeletonResource JSON back to binary .rsrc format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import type { ResourceFork, Resource } from "../rsrcdump-ts/types";
import { packAdf } from "../rsrcdump-ts/adf";
import { packResourceFork } from "../rsrcdump-ts/resforkPack";
import { skeletonResourceToBinary as skeletonResourceToBinaryPyodide } from "./skeletonExport";

// Global storage for Finder Info to preserve during round-trip
let globalFinderInfo: Uint8Array | undefined = undefined;

export function setFinderInfo(finderInfo: Uint8Array | undefined) {
  globalFinderInfo = finderInfo;
}

export function getFinderInfo(): Uint8Array | undefined {
  return globalFinderInfo;
}

/**
 * Convert SkeletonResource JSON to binary .rsrc format with configurable converter
 * @param skeletonResource The skeleton resource to convert
 * @param options Conversion options
 * @returns ArrayBuffer (sync) or Promise<ArrayBuffer> (async with Pyodide)
 */
export async function skeletonResourceToBinary(
  skeletonResource: SkeletonResource,
  options?: {
    usePyodide?: boolean;
    pyodideWorker?: Worker;
  },
): Promise<ArrayBuffer> {
  // Default to TypeScript for test compatibility (no Worker in Node.js)
  // Browser code should explicitly pass usePyodide: true with a worker
  const usePyodide = options?.usePyodide ?? false;

  if (usePyodide) {
    if (!options?.pyodideWorker) {
      // When pyodide is required but not provided, fall back to TS implementation
      console.warn(
        "Pyodide worker not provided, falling back to TS implementation",
      );
      return skeletonResourceToBinaryTS(skeletonResource);
    }
    return skeletonResourceToBinaryPyodide(
      skeletonResource,
      options.pyodideWorker,
    );
  }

  return skeletonResourceToBinaryTS(skeletonResource);
}

/**
 * Convert SkeletonResource JSON to binary .rsrc format using TypeScript implementation
 * Uses the resforkPack module which matches Python rsrcdump byte-for-byte
 */
export function skeletonResourceToBinaryTS(
  skeletonResource: SkeletonResource,
): ArrayBuffer {
  console.log(
    "Converting SkeletonResource to binary format using TypeScript pack...",
  );

  // Build ResourceFork structure
  const resourceMap = new Map<string, Map<number, Resource>>();

  // Process each resource type
  Object.entries(skeletonResource).forEach(([resourceType, resources]) => {
    if (resourceType === "_metadata") return; // Skip metadata

    if (typeof resources === "object" && resources !== null) {
      const typeMap = new Map<number, Resource>();

      Object.entries(resources).forEach(
        ([resourceId, resource]: [string, unknown]) => {
          const resourceObj = resource as Record<string, unknown> | undefined;
          if (resourceObj && typeof resourceObj === "object") {
            let binaryData: Uint8Array;

            if (resourceObj.obj) {
              // Convert structured object data to binary format
              binaryData = convertResourceObjectToBinary(
                resourceType,
                resourceObj.obj,
              );
            } else if (resourceObj?.data) {
              // Handle raw data (like 'alis' resources)
              const dataVal = resourceObj.data;
              if (typeof dataVal === "string") {
                // Convert hex string to binary
                const hexString = (dataVal as string).replace(/\s/g, "");
                binaryData = new Uint8Array(hexString.length / 2);
                for (let i = 0; i < hexString.length; i += 2) {
                  binaryData[i / 2] = parseInt(hexString.substr(i, 2), 16);
                }
              } else if (dataVal instanceof Uint8Array) {
                binaryData = dataVal;
              } else {
                console.warn(
                  `Unknown data format for ${resourceType}:${resourceId}`,
                );
                binaryData = new Uint8Array(0);
              }
            } else {
              console.warn(
                `No obj or data field for ${resourceType}:${resourceId}`,
              );
              binaryData = new Uint8Array(0);
            }

            const resNum = parseInt(resourceId);
            const resName = (resourceObj?.name as string) || "";

            typeMap.set(resNum, {
              type: resourceType,
              id: resNum,
              data: binaryData,
              name: resName, // Keep as string, resforkPack will encode it
              flags:
                (resourceObj?.flags as number) !== undefined
                  ? (resourceObj?.flags as number)
                  : 0,
              junk:
                (resourceObj?.junk as number) !== undefined
                  ? (resourceObj?.junk as number)
                  : 0,
              order:
                (resourceObj?.order as number) !== undefined
                  ? (resourceObj?.order as number)
                  : resNum,
            });
          }
        },
      );

      if (typeMap.size > 0) {
        resourceMap.set(resourceType, typeMap);
      }
    }
  });

  // Extract metadata fields
  const metadata = (skeletonResource._metadata || {}) as Record<
    string,
    unknown
  >;

  const fork: ResourceFork = {
    resources: resourceMap,
    fileAttributes:
      (metadata.file_attributes as number) !== undefined
        ? (metadata.file_attributes as number)
        : 0,
    junkNextresmap:
      (metadata.junk1 as number) !== undefined ? (metadata.junk1 as number) : 0,
    junkFilerefnum:
      (metadata.junk2 as number) !== undefined ? (metadata.junk2 as number) : 0,
  };

  console.log(`Packing ${resourceMap.size} resource types...`);

  // Count total resources for debugging
  let totalResources = 0;
  for (const typeMap of resourceMap.values()) {
    totalResources += typeMap.size;
  }
  console.log(`Total resources: ${totalResources}`);

  // Use the Python-compatible pack function
  const resourceFork = packResourceFork(fork);

  console.log(`Created resource fork: ${resourceFork.length} bytes`);

  // Wrap resource fork in AppleDouble format
  const finderInfo = getFinderInfo();
  const appleDouble = packAdf(resourceFork, finderInfo);
  console.log(
    `Wrapped in AppleDouble format: ${appleDouble.length} bytes total (with ${
      finderInfo ? finderInfo.length : 0
    } byte Finder Info)`,
  );

  return appleDouble.buffer as ArrayBuffer;
}

/**
 * Convert a resource object to binary format based on type
 */
function convertResourceObjectToBinary(
  resourceType: string,
  obj: unknown,
): Uint8Array {
  switch (resourceType) {
    case "Hedr":
      return convertHeaderToBinary(obj);
    case "Bone":
      return convertBoneToBinary(obj);
    case "BonP":
      return convertBonePointsToBinary(obj as unknown[]);
    case "BonN":
      return convertBoneNormalsToBinary(obj as unknown[]);
    case "AnHd":
      return convertAnimationHeaderToBinary(obj);
    case "Evnt":
      return convertAnimationEventsToBinary(obj as unknown[]);
    case "NumK":
      return convertNumKeyframesToBinary(obj);
    case "KeyF":
      return convertKeyframesToBinary(obj as unknown[]);
    case "RelP":
      return convertRelativePointsToBinary(obj as unknown[]);
    default:
      console.warn(
        `Unknown resource type: ${resourceType}, using default binary conversion`,
      );
      return new Uint8Array(0);
  }
}

function convertHeaderToBinary(header: unknown): Uint8Array {
  // Hedr struct: hhhh76x = int16*4 + 76 bytes padding = 84 bytes total
  const buffer = new ArrayBuffer(84);
  const view = new DataView(buffer);

  const h = header as Record<string, unknown> | undefined;
  view.setInt16(0, (h?.version as number) || 1, false);
  view.setInt16(2, (h?.numAnims as number) || 0, false);
  view.setInt16(4, (h?.numJoints as number) || 0, false);
  view.setInt16(6, (h?.num3DMFLimbs as number) || 0, false);
  // Remaining 76 bytes are padding (already zero-filled)

  return new Uint8Array(buffer);
}

function convertBoneToBinary(bone: unknown): Uint8Array {
  // Bone struct: l32s3f2H8L = 84 bytes (matches File_BoneDefinitionType from file.h)
  // l = parentBone (4 bytes, int32_t)
  // 32s = name (32 bytes, unsigned char[32])
  // 3f = coordX, coordY, coordZ (12 bytes)
  // 2H = numPointsAttachedToBone, numNormalsAttachedToBone (4 bytes)
  // 8L = reserved0-7 (32 bytes)
  const buffer = new ArrayBuffer(84);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  const b = bone as Record<string, unknown> | undefined;
  // Write parent bone index (signed 32-bit integer = 4 bytes) at offset 0
  view.setInt32(
    0,
    b && (b.parentBone as number) !== undefined ? (b.parentBone as number) : -1,
    false,
  );

  // Write bone name (32 bytes starting at byte 4)
  // The name field is unsigned char[32] - a raw 32-byte array
  // BioOreo used Pascal string format: 1 byte length + up to 31 bytes name
  const nameVal = b?.name;
  if (typeof nameVal === "string") {
    // Pascal string: length byte at byte 4, name starts at byte 5
    const nameBytes = new TextEncoder().encode(nameVal);
    const nameLength = Math.min(nameBytes.length, 31); // Max 31 chars (1 length + 31 chars = 32)
    uint8View[4] = nameLength; // Write length prefix at byte 4
    uint8View.set(nameBytes.slice(0, nameLength), 5); // Write name bytes starting at byte 5
    // Rest of the 32-byte field (bytes 5+nameLength to 35) is already zero-filled
  }

  // Write coordinates (3 float32s = 12 bytes starting at offset 36)
  view.setFloat32(36, (b?.coordX as number) || 0, false);
  view.setFloat32(40, (b?.coordY as number) || 0, false);
  view.setFloat32(44, (b?.coordZ as number) || 0, false);

  // Write counts (2 uint16s = 4 bytes starting at offset 48)
  view.setUint16(48, (b?.numPointsAttachedToBone as number) || 0, false);
  view.setUint16(50, (b?.numNormalsAttachedToBone as number) || 0, false);

  // Write reserved fields (8 uint32s = 32 bytes starting at offset 52)
  for (let i = 0; i < 8; i++) {
    const rv = (b ? (b[`reserved${i}`] as number) : 0) || 0;
    view.setUint32(52 + i * 4, rv, false);
  }

  return uint8View;
}

function convertBonePointsToBinary(bonePoints: unknown[]): Uint8Array {
  if (!Array.isArray(bonePoints)) return new Uint8Array(0);

  // BonP format: H+ = unsigned short (2 bytes) per point index
  const buffer = new ArrayBuffer(bonePoints.length * 2); // 2 bytes per point index
  const view = new DataView(buffer);

  bonePoints.forEach((point, index) => {
    const p = point as Record<string, unknown> | undefined;
    view.setUint16(index * 2, (p?.pointIndex as number) || 0, false);
  });

  return new Uint8Array(buffer);
}

function convertBoneNormalsToBinary(boneNormals: unknown[]): Uint8Array {
  if (!Array.isArray(boneNormals)) return new Uint8Array(0);

  // BonN format: H+ = unsigned short (2 bytes) per normal index
  const buffer = new ArrayBuffer(boneNormals.length * 2); // 2 bytes per normal
  const view = new DataView(buffer);

  boneNormals.forEach((normal, index) => {
    const n = normal as Record<string, unknown> | undefined;
    view.setUint16(index * 2, (n?.normal as number) || 0, false);
  });

  return new Uint8Array(buffer);
}

function convertAnimationHeaderToBinary(animHeader: unknown): Uint8Array {
  // AnHd struct: 33sxh = 33-byte Pascal string + 1 padding + 2-byte short = 36 bytes
  const buffer = new ArrayBuffer(36);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  // Write animation name (33 bytes: 1 length + 32 data) - Pascal string format
  const ah = animHeader as Record<string, unknown> | undefined;
  if (ah && typeof ah.animName === "string") {
    const nameBytes = new TextEncoder().encode(ah.animName as string);
    const nameLength = Math.min(nameBytes.length, 32); // Max 32 chars (1 byte reserved for length)
    uint8View[0] = nameLength; // Write length prefix at position 0
    uint8View.set(nameBytes.slice(0, nameLength), 1); // Write name bytes starting at position 1
  }
  // Position 33 is padding (x), already zero

  // Write numAnimEvents at position 34 (after name + padding)
  view.setInt16(34, (ah?.numAnimEvents as number) || 0, false);

  return uint8View;
}

function convertAnimationEventsToBinary(events: unknown[]): Uint8Array {
  if (!Array.isArray(events)) return new Uint8Array(0);

  // Evnt struct: hBB = int16 + byte + byte = 4 bytes per event
  const buffer = new ArrayBuffer(events.length * 4);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  events.forEach((event, index) => {
    const e = event as Record<string, unknown> | undefined;
    const offset = index * 4;
    view.setInt16(offset, (e?.time as number) || 0, false);
    uint8View[offset + 2] = (e?.type as number) || 0;
    uint8View[offset + 3] = (e?.value as number) || 0;
  });

  return new Uint8Array(buffer);
}

function convertNumKeyframesToBinary(numKeyframes: unknown): Uint8Array {
  // NumK is an array of signed bytes (b+), one per bone
  if (Array.isArray(numKeyframes)) {
    // Each entry is a signed byte (int8)
    const buffer = new ArrayBuffer(numKeyframes.length);
    const view = new DataView(buffer);

    (numKeyframes as unknown[]).forEach((count, index) => {
      view.setInt8(index, (count as number) || 0);
    });

    console.log(
      `[NumK] Converted ${numKeyframes.length} keyframe counts to ${buffer.byteLength} bytes`,
    );
    return new Uint8Array(buffer);
  }

  // Fallback for old format (shouldn't happen now)
  console.warn("[NumK] Received non-array format, using fallback");
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  const nk = numKeyframes as Record<string, unknown> | undefined;
  view.setUint32(0, (nk?.numKeyFrames as number) || 0, false);
  return new Uint8Array(buffer);
}

function convertKeyframesToBinary(keyframes: unknown[]): Uint8Array {
  if (!Array.isArray(keyframes)) return new Uint8Array(0);

  // KeyF struct: ii3f3f3f = int32, int32, 3*float32, 3*float32, 3*float32 = 44 bytes per keyframe
  const buffer = new ArrayBuffer(keyframes.length * 44);
  const view = new DataView(buffer);

  (keyframes as unknown[]).forEach((keyframe, index) => {
    const k = keyframe as Record<string, unknown> | undefined;
    const offset = index * 44;
    view.setInt32(offset, (k?.tick as number) || 0, false);
    view.setInt32(offset + 4, (k?.accelerationMode as number) || 0, false);
    view.setFloat32(offset + 8, (k?.coordX as number) || 0, false);
    view.setFloat32(offset + 12, (k?.coordY as number) || 0, false);
    view.setFloat32(offset + 16, (k?.coordZ as number) || 0, false);
    view.setFloat32(offset + 20, (k?.rotationX as number) || 0, false);
    view.setFloat32(offset + 24, (k?.rotationY as number) || 0, false);
    view.setFloat32(offset + 28, (k?.rotationZ as number) || 0, false);
    view.setFloat32(offset + 32, (k?.scaleX as number) || 1, false);
    view.setFloat32(offset + 36, (k?.scaleY as number) || 1, false);
    view.setFloat32(offset + 40, (k?.scaleZ as number) || 1, false);
  });

  return new Uint8Array(buffer);
}
function convertRelativePointsToBinary(points: unknown[]): Uint8Array {
  // RelP: Array of 3D points (x, y, z) - 3 float32s per point = 12 bytes per point
  const numPoints = Array.isArray(points) ? points.length : 0;
  console.log(
    `[DEBUG] convertRelativePointsToBinary called with ${numPoints} points`,
  );
  const buffer = new ArrayBuffer(numPoints * 12);
  const view = new DataView(buffer);

  ((points as unknown[]) || []).forEach((point, index) => {
    const offset = index * 12;
    const p = point as Record<string, unknown> | undefined;
    view.setFloat32(offset, (p?.relOffsetX as number) || 0, false);
    view.setFloat32(offset + 4, (p?.relOffsetY as number) || 0, false);
    view.setFloat32(offset + 8, (p?.relOffsetZ as number) || 0, false);
  });

  console.log(
    `[DEBUG] convertRelativePointsToBinary produced ${buffer.byteLength} bytes`,
  );
  return new Uint8Array(buffer);
}
