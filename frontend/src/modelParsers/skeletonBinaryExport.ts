// Binary skeleton resource export functionality
// Converts SkeletonResource JSON back to binary .rsrc format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
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
 * Implements the Mac resource fork format as expected by rsrcdump parser
 */
export function skeletonResourceToBinaryTS(skeletonResource: SkeletonResource): ArrayBuffer {
  console.log("Converting SkeletonResource to binary format...");
  
  // Collect all resources and convert to binary
  const resourceEntries: Array<{
    type: string;
    id: number;
    data: Uint8Array;
    name: string;
  }> = [];
  
  // Process each resource type
  Object.entries(skeletonResource).forEach(([resourceType, resources]) => {
    if (typeof resources === 'object' && resources !== null) {
      Object.entries(resources).forEach(([resourceId, resource]: [string, any]) => {
        if (resource && typeof resource === 'object') {
          let binaryData: Uint8Array;
          
          if (resource.obj) {
            // Convert structured object data to binary format
            binaryData = convertResourceObjectToBinary(resourceType, resource.obj);
          } else if (resource.data) {
            // Handle raw data (like 'alis' resources)
            if (typeof resource.data === 'string') {
              // Convert hex string to binary
              const hexString = resource.data.replace(/\s/g, '');
              binaryData = new Uint8Array(hexString.length / 2);
              for (let i = 0; i < hexString.length; i += 2) {
                binaryData[i / 2] = parseInt(hexString.substr(i, 2), 16);
              }
            } else if (resource.data instanceof Uint8Array) {
              binaryData = resource.data;
            } else {
              console.warn(`Unknown data format for ${resourceType}:${resourceId}`);
              binaryData = new Uint8Array(0);
            }
          } else {
            console.warn(`No obj or data field for ${resourceType}:${resourceId}`);
            binaryData = new Uint8Array(0);
          }
          
          resourceEntries.push({
            type: resourceType,
            id: parseInt(resourceId),
            data: binaryData,
            name: resource.name || '',
          });
        }
      });
    }
  });
  
  console.log(`Converting ${resourceEntries.length} resources to binary format`);
  
  // Group resources by type for the type list
  const resourcesByType = new Map<string, Array<typeof resourceEntries[0]>>();
  resourceEntries.forEach(entry => {
    if (!resourcesByType.has(entry.type)) {
      resourcesByType.set(entry.type, []);
    }
    resourcesByType.get(entry.type)!.push(entry);
  });
  
  // Calculate sizes
  let totalDataSize = 0;
  resourceEntries.forEach(entry => {
    totalDataSize += 4 + entry.data.length; // 4-byte length prefix + data
  });
  console.log(`Data section size: ${totalDataSize} bytes`);
  
  // Build name list
  let nameListData = new Uint8Array(0);
  const nameOffsets = new Map<string, number>();
  resourceEntries.forEach(entry => {
    if (entry.name && entry.name.length > 0) {
      const nameBytes = new TextEncoder().encode(entry.name);
      const currentOffset = nameListData.length;
      nameOffsets.set(`${entry.type}:${entry.id}`, currentOffset);
      
      // Pascal string format: length byte + string data
      const pascalString = new Uint8Array(1 + nameBytes.length);
      pascalString[0] = nameBytes.length;
      pascalString.set(nameBytes, 1);
      
      const newNameList = new Uint8Array(nameListData.length + pascalString.length);
      newNameList.set(nameListData);
      newNameList.set(pascalString, nameListData.length);
      nameListData = newNameList;
    }
  });
  
  // Calculate type list size: 2 bytes for count + 8 bytes per type
  const typeListSize = 2 + (resourcesByType.size * 8);
  
  // Calculate resource list size: 12 bytes per resource  
  const resourceListSize = resourceEntries.length * 12;
  
  // Calculate map size: header (28 bytes) + type list + resource list + name list
  const mapHeaderSize = 28;
  const mapSize = mapHeaderSize + typeListSize + resourceListSize + nameListData.length;
  
  // Total file size: data section + map section
  const totalFileSize = 16 + totalDataSize + mapSize;
  
  // Create the buffer
  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  // Write resource fork header (16 bytes)
  const dataOffset = 16;
  const mapOffset = 16 + totalDataSize;
  
  view.setUint32(0, dataOffset, false);     // Resource data offset from start of file
  view.setUint32(4, mapOffset, false);      // Resource map offset from start of file  
  view.setUint32(8, totalDataSize, false);  // Resource data length
  view.setUint32(12, mapSize, false);       // Resource map length
  
  // Write resource data section
  let currentDataPos = dataOffset;
  const resourceDataOffsets = new Map<string, number>();
  
  resourceEntries.forEach(entry => {
    const key = `${entry.type}:${entry.id}`;
    resourceDataOffsets.set(key, currentDataPos - dataOffset);
    
    // Write data length prefix (4 bytes)
    view.setUint32(currentDataPos, entry.data.length, false);
    currentDataPos += 4;
    
    // Write resource data
    uint8View.set(entry.data, currentDataPos);
    currentDataPos += entry.data.length;
  });
  
  // Write resource map
  let mapPos = mapOffset;
  
  // Map header (28 bytes) - copy of resource header + extra fields
  view.setUint32(mapPos, dataOffset, false); mapPos += 4;
  view.setUint32(mapPos, mapOffset, false); mapPos += 4;
  view.setUint32(mapPos, totalDataSize, false); mapPos += 4;
  view.setUint32(mapPos, mapSize, false); mapPos += 4;
  view.setUint32(mapPos, 0, false); mapPos += 4;          // Next resource map (unused)
  view.setUint16(mapPos, 0, false); mapPos += 2;          // File reference number (unused)
  view.setUint16(mapPos, 0, false); mapPos += 2;          // File attributes
  view.setUint16(mapPos, mapHeaderSize, false); mapPos += 2; // Type list offset within map
  view.setUint16(mapPos, mapHeaderSize + typeListSize + resourceListSize, false); mapPos += 2; // Name list offset within map
  
  // Write type list
  view.setUint16(mapPos, resourcesByType.size - 1, false); // Number of types - 1
  mapPos += 2;
  
  let currentResourceListOffset = typeListSize;
  
  Array.from(resourcesByType.entries()).forEach(([typeName, resources]) => {
    // Write type entry (8 bytes)
    const typeBytes = new TextEncoder().encode(typeName.padEnd(4).substring(0, 4));
    uint8View.set(typeBytes, mapPos);
    mapPos += 4;
    
    view.setUint16(mapPos, resources.length - 1, false); // Number of resources - 1
    mapPos += 2;
    
    view.setUint16(mapPos, currentResourceListOffset, false); // Offset to resource list for this type
    mapPos += 2;
    
    currentResourceListOffset += resources.length * 12;
  });
  
  // Write resource list
  Array.from(resourcesByType.values()).forEach(resources => {
    resources.forEach(resource => {
      const key = `${resource.type}:${resource.id}`;
      
      // Resource entry (12 bytes)
      view.setInt16(mapPos, resource.id, false); // Resource ID
      mapPos += 2;
      
      // Name offset
      const nameOffset = nameOffsets.get(key);
      view.setUint16(mapPos, nameOffset !== undefined ? nameOffset : 0xFFFF, false);
      mapPos += 2;
      
      // Packed attributes: 24-bit data offset + 8-bit flags
      const dataOffsetInDataSection = resourceDataOffsets.get(key) || 0;
      const packedAttr = (0 << 24) | (dataOffsetInDataSection & 0xFFFFFF);
      view.setUint32(mapPos, packedAttr, false);
      mapPos += 4;
      
      view.setUint32(mapPos, 0, false); // Reserved/junk
      mapPos += 4;
    });
  });
  
  // Write name list
  if (nameListData.length > 0) {
    uint8View.set(nameListData, mapPos);
  }
  
  console.log(`Created resource fork: ${totalFileSize} bytes, ${resourceEntries.length} resources, ${resourcesByType.size} types`);
  
  // Wrap resource fork in AppleDouble format
  const resourceFork = new Uint8Array(buffer);
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
  // Bone struct: i32s3fHH8i = int32 + 32 chars + 3*float32 + 2*uint16 + 8*int32 = 4+32+12+4+32 = 84 bytes
  const buffer = new ArrayBuffer(84);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  view.setInt32(0, bone.parentBone || -1, false);
  
  // Write bone name (32 bytes) - Pascal string format: length byte + characters
  if (bone.name && typeof bone.name === 'string') {
    const nameBytes = new TextEncoder().encode(bone.name);
    const nameLength = Math.min(nameBytes.length, 31); // Max 31 chars (1 byte for length)
    uint8View[4] = nameLength; // Write length prefix at position 4
    uint8View.set(nameBytes.slice(0, nameLength), 5); // Write name bytes starting at position 5
    // Rest of the 32-byte field is already zero-filled
  }
  
  // Write coordinates (3 float32s = 12 bytes)
  view.setFloat32(36, bone.coordX || 0, false);
  view.setFloat32(40, bone.coordY || 0, false);
  view.setFloat32(44, bone.coordZ || 0, false);
  
  // Write counts (2 uint16s = 4 bytes)
  view.setUint16(48, bone.numPointsAttachedToBone || 0, false);
  view.setUint16(50, bone.numNormalsAttachedToBone || 0, false);
  
  // Write reserved fields (8 int32s = 32 bytes)
  for (let i = 0; i < 8; i++) {
    view.setInt32(52 + i * 4, bone[`reserved${i}`] || 0, false);
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
  console.log(`[DEBUG] convertRelativePointsToBinary called with ${numPoints} points`);
  const buffer = new ArrayBuffer(numPoints * 12);
  const view = new DataView(buffer);
  
  points.forEach((point, index) => {
    const offset = index * 12;
    view.setFloat32(offset, point.relOffsetX || 0, false);
    view.setFloat32(offset + 4, point.relOffsetY || 0, false);
    view.setFloat32(offset + 8, point.relOffsetZ || 0, false);
  });
  
  console.log(`[DEBUG] convertRelativePointsToBinary produced ${buffer.byteLength} bytes`);
  return new Uint8Array(buffer);
}
