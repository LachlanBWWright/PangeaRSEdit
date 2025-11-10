// Binary skeleton resource export functionality
// Converts SkeletonResource JSON back to binary .rsrc format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { saveFromJson } from "../rsrcdump/rsrcdump-ts/src/rsrcdump.js";
import { skeletonSpecs } from "../python/structSpecs/skeleton/skeleton.js";
import { packAdf } from "../rsrcdump-ts/adf";
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
export function skeletonResourceToBinary(
  skeletonResource: SkeletonResource,
  options?: {
    usePyodide?: boolean;
    pyodideWorker?: Worker;
  }
): ArrayBuffer | Promise<ArrayBuffer> {
  const usePyodide = options?.usePyodide ?? true; // Default to Pyodide
  
  if (usePyodide) {
    if (!options?.pyodideWorker) {
      throw new Error("Pyodide worker required when usePyodide is true");
    }
    return skeletonResourceToBinaryPyodide(skeletonResource, options.pyodideWorker);
  }
  
  return skeletonResourceToBinaryTS(skeletonResource);
}

/**
 * Convert SkeletonResource JSON to binary .rsrc format using TypeScript implementation
 * Uses the rsrcdump-ts library which provides byte-perfect packing
 */
export function skeletonResourceToBinaryTS(skeletonResource: SkeletonResource): ArrayBuffer {
  console.log("Converting SkeletonResource to binary format using rsrcdump-ts...");
  
  // Use rsrcdump-ts saveFromJson with skeleton specs to convert JSON to binary
  // This handles all the packing using the official rsrcdump TypeScript library
  const resourceFork = saveFromJson(
    skeletonResource,
    skeletonSpecs,
    false // Don't use otto specs, use the provided skeleton specs
  );
  
  console.log(`Created resource fork: ${resourceFork.length} bytes`);
  
  // Wrap resource fork in AppleDouble format
  const finderInfo = getFinderInfo();
  const appleDouble = packAdf(resourceFork, finderInfo);
  console.log(`Wrapped in AppleDouble format: ${appleDouble.length} bytes total (with ${finderInfo ? finderInfo.length : 0} byte Finder Info)`);
  
  return appleDouble.buffer;
}

/**
 * Convert a resource object to binary format based on type
 */
function convertResourceObjectToBinary(resourceType: string, obj: any): Uint8Array {
  switch (resourceType) {
    case 'Hedr':
      return convertHeaderToBinary(obj);
    case 'Bone':
      return convertBoneToBinary(obj);
    case 'BonP':
      return convertBonePointsToBinary(obj);
    case 'BonN':
      return convertBoneNormalsToBinary(obj);
    case 'AnHd':
      return convertAnimationHeaderToBinary(obj);
    case 'Evnt':
      return convertAnimationEventsToBinary(obj);
    case 'NumK':
      return convertNumKeyframesToBinary(obj);
    case 'KeyF':
      return convertKeyframesToBinary(obj);
    case 'RelP':
      return convertRelativePointsToBinary(obj);
    default:
      console.warn(`Unknown resource type: ${resourceType}, using default binary conversion`);
      return new Uint8Array(0);
  }
}

function convertHeaderToBinary(header: any): Uint8Array {
  // Hedr struct: hhhh76x = int16*4 + 76 bytes padding = 84 bytes total
  const buffer = new ArrayBuffer(84);
  const view = new DataView(buffer);
  
  view.setInt16(0, header.version || 1, false);
  view.setInt16(2, header.numAnims || 0, false);
  view.setInt16(4, header.numJoints || 0, false);
  view.setInt16(6, header.num3DMFLimbs || 0, false);
  // Remaining 76 bytes are padding (already zero-filled)
  
  return new Uint8Array(buffer);
}

function convertBoneToBinary(bone: any): Uint8Array {
  // Bone struct: h32sh3f2H8L = 84 bytes
  // h = parentBone (2 bytes)
  // 32s = name (32 bytes)
  // h = unnamed field (2 bytes) - padding or reserved
  // 3f = coordX, coordY, coordZ (12 bytes)
  // 2H = numPointsAttachedToBone, numNormalsAttachedToBone (4 bytes)
  // 8L = reserved0-7 (32 bytes)
  const buffer = new ArrayBuffer(84);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  // Write parent bone index (signed 16-bit integer = 2 bytes)
  view.setInt16(0, bone.parentBone !== undefined ? bone.parentBone : -1, false);
  
  // Write bone name (32 bytes starting at byte 2)
  // Format: 2 bytes padding + 1 byte length + up to 29 bytes name + padding
  // The 32s struct field starts at byte 2 and includes 2-byte padding before Pascal string
  if (bone.name && typeof bone.name === 'string') {
    // First 2 bytes of the 32-byte field are padding (bytes 2-3) - set to 0xFF
    uint8View[2] = 0xFF;
    uint8View[3] = 0xFF;
    
    // Then Pascal string: length byte at byte 4, name starts at byte 5
    const nameBytes = new TextEncoder().encode(bone.name);
    const nameLength = Math.min(nameBytes.length, 29); // Max 29 chars (2 bytes padding + 1 length + 29 chars = 32)
    uint8View[4] = nameLength; // Write length prefix at byte 4
    uint8View.set(nameBytes.slice(0, nameLength), 5); // Write name bytes starting at byte 5
    // Rest of the 32-byte field (bytes 5+nameLength to 33) is already zero-filled
  } else {
    // No name - fill with padding
    uint8View[2] = 0xFF;
    uint8View[3] = 0xFF;
    uint8View[4] = 0x00; // Zero length
  }
  
  // Write unnamed/padding field (2 bytes at offset 34) - preserve if available, else 0
  view.setInt16(34, bone.unnamedPadding !== undefined ? bone.unnamedPadding : 0, false);
  
  // Write coordinates (3 float32s = 12 bytes starting at offset 36)
  view.setFloat32(36, bone.coordX || 0, false);
  view.setFloat32(40, bone.coordY || 0, false);
  view.setFloat32(44, bone.coordZ || 0, false);
  
  // Write counts (2 uint16s = 4 bytes starting at offset 48)
  view.setUint16(48, bone.numPointsAttachedToBone || 0, false);
  view.setUint16(50, bone.numNormalsAttachedToBone || 0, false);
  
  // Write reserved fields (8 uint32s = 32 bytes starting at offset 52)
  for (let i = 0; i < 8; i++) {
    view.setUint32(52 + i * 4, bone[`reserved${i}`] !== undefined ? bone[`reserved${i}`] : 0, false);
  }
  
  return uint8View;
}

function convertBonePointsToBinary(bonePoints: any[]): Uint8Array {
  if (!Array.isArray(bonePoints)) return new Uint8Array(0);
  
  // BonP format: H+ = unsigned short (2 bytes) per point index
  const buffer = new ArrayBuffer(bonePoints.length * 2); // 2 bytes per point index
  const view = new DataView(buffer);
  
  bonePoints.forEach((point, index) => {
    view.setUint16(index * 2, point.pointIndex || 0, false);
  });
  
  return new Uint8Array(buffer);
}

function convertBoneNormalsToBinary(boneNormals: any[]): Uint8Array {
  if (!Array.isArray(boneNormals)) return new Uint8Array(0);
  
  // BonN format: H+ = unsigned short (2 bytes) per normal index
  const buffer = new ArrayBuffer(boneNormals.length * 2); // 2 bytes per normal
  const view = new DataView(buffer);
  
  boneNormals.forEach((normal, index) => {
    view.setUint16(index * 2, normal.normal || 0, false);
  });
  
  return new Uint8Array(buffer);
}

function convertAnimationHeaderToBinary(animHeader: any): Uint8Array {
  // AnHd struct: 33sxh = 33-byte Pascal string + 1 padding + 2-byte short = 36 bytes
  const buffer = new ArrayBuffer(36);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  // Write animation name (33 bytes: 1 length + 32 data) - Pascal string format
  if (animHeader.animName && typeof animHeader.animName === 'string') {
    const nameBytes = new TextEncoder().encode(animHeader.animName);
    const nameLength = Math.min(nameBytes.length, 32); // Max 32 chars (1 byte reserved for length)
    uint8View[0] = nameLength; // Write length prefix at position 0
    uint8View.set(nameBytes.slice(0, nameLength), 1); // Write name bytes starting at position 1
  }
  // Position 33 is padding (x), already zero
  
  // Write numAnimEvents at position 34 (after name + padding)
  view.setInt16(34, animHeader.numAnimEvents || 0, false);
  
  return uint8View;
}

function convertAnimationEventsToBinary(events: any[]): Uint8Array {
  if (!Array.isArray(events)) return new Uint8Array(0);
  
  // Evnt struct: hBB = int16 + byte + byte = 4 bytes per event
  const buffer = new ArrayBuffer(events.length * 4);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  events.forEach((event, index) => {
    const offset = index * 4;
    view.setInt16(offset, event.time || 0, false);
    uint8View[offset + 2] = event.type || 0;
    uint8View[offset + 3] = event.value || 0;
  });
  
  return new Uint8Array(buffer);
}

function convertNumKeyframesToBinary(numKeyframes: any): Uint8Array {
  // NumK is an array of signed bytes (b+), one per bone
  if (Array.isArray(numKeyframes)) {
    // Each entry is a signed byte (int8)
    const buffer = new ArrayBuffer(numKeyframes.length);
    const view = new DataView(buffer);
    
    numKeyframes.forEach((count, index) => {
      view.setInt8(index, count || 0);
    });
    
    console.log(`[NumK] Converted ${numKeyframes.length} keyframe counts to ${buffer.byteLength} bytes`);
    return new Uint8Array(buffer);
  }
  
  // Fallback for old format (shouldn't happen now)
  console.warn("[NumK] Received non-array format, using fallback");
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, numKeyframes.numKeyFrames || 0, false);
  return new Uint8Array(buffer);
}

function convertKeyframesToBinary(keyframes: any[]): Uint8Array {
  if (!Array.isArray(keyframes)) return new Uint8Array(0);
  
  // KeyF struct: ii3f3f3f = int32, int32, 3*float32, 3*float32, 3*float32 = 44 bytes per keyframe
  const buffer = new ArrayBuffer(keyframes.length * 44);
  const view = new DataView(buffer);
  
  keyframes.forEach((keyframe, index) => {
    const offset = index * 44;
    view.setInt32(offset, keyframe.tick || 0, false);
    view.setInt32(offset + 4, keyframe.accelerationMode || 0, false);
    view.setFloat32(offset + 8, keyframe.coordX || 0, false);
    view.setFloat32(offset + 12, keyframe.coordY || 0, false);
    view.setFloat32(offset + 16, keyframe.coordZ || 0, false);
    view.setFloat32(offset + 20, keyframe.rotationX || 0, false);
    view.setFloat32(offset + 24, keyframe.rotationY || 0, false);
    view.setFloat32(offset + 28, keyframe.rotationZ || 0, false);
    view.setFloat32(offset + 32, keyframe.scaleX || 1, false);
    view.setFloat32(offset + 36, keyframe.scaleY || 1, false);
    view.setFloat32(offset + 40, keyframe.scaleZ || 1, false);
  });
  
  return new Uint8Array(buffer);
}
function convertRelativePointsToBinary(points: any[]): Uint8Array {
  // RelP: Array of 3D points (x, y, z) - 3 float32s per point = 12 bytes per point
  const numPoints = points.length;
  const buffer = new ArrayBuffer(numPoints * 12);
  const view = new DataView(buffer);
  
  points.forEach((point, index) => {
    const offset = index * 12;
    view.setFloat32(offset, point.relOffsetX || 0, false);
    view.setFloat32(offset + 4, point.relOffsetY || 0, false);
    view.setFloat32(offset + 8, point.relOffsetZ || 0, false);
  });
  
  return new Uint8Array(buffer);
}
