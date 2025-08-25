// Binary skeleton resource export functionality
// Converts SkeletonResource JSON back to binary .rsrc format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";

/**
 * Convert SkeletonResource JSON to binary .rsrc format using proper resource fork structure
 * Implements the Mac resource fork format as expected by rsrcdump parser
 */
export function skeletonResourceToBinary(skeletonResource: SkeletonResource): ArrayBuffer {
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
  return buffer;
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
    default:
      console.warn(`Unknown resource type: ${resourceType}, using default binary conversion`);
      return new Uint8Array(0);
  }
}

function convertHeaderToBinary(header: any): Uint8Array {
  const buffer = new ArrayBuffer(16); // Simplified header size
  const view = new DataView(buffer);
  
  view.setUint32(0, header.version || 1, false);
  view.setUint32(4, header.numAnims || 0, false);
  view.setUint32(8, header.numJoints || 0, false);
  view.setUint32(12, header.num3DMFLimbs || 0, false);
  
  return new Uint8Array(buffer);
}

function convertBoneToBinary(bone: any): Uint8Array {
  const buffer = new ArrayBuffer(64); // Space for bone data + name
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  view.setInt16(0, bone.parentBone || -1, false);
  view.setFloat32(4, bone.coordX || 0, false);
  view.setFloat32(8, bone.coordY || 0, false);
  view.setFloat32(12, bone.coordZ || 0, false);
  view.setUint32(16, bone.numPointsAttachedToBone || 0, false);
  view.setUint32(20, bone.numNormalsAttachedToBone || 0, false);
  
  // Write bone name (rest of buffer)
  if (bone.name && typeof bone.name === 'string') {
    const nameBytes = new TextEncoder().encode(bone.name);
    const maxNameLength = buffer.byteLength - 24;
    uint8View.set(nameBytes.slice(0, maxNameLength), 24);
  }
  
  return uint8View;
}

function convertBonePointsToBinary(bonePoints: any[]): Uint8Array {
  if (!Array.isArray(bonePoints)) return new Uint8Array(0);
  
  const buffer = new ArrayBuffer(bonePoints.length * 4); // 4 bytes per point index
  const view = new DataView(buffer);
  
  bonePoints.forEach((point, index) => {
    view.setUint32(index * 4, point.pointIndex || 0, false);
  });
  
  return new Uint8Array(buffer);
}

function convertBoneNormalsToBinary(boneNormals: any[]): Uint8Array {
  if (!Array.isArray(boneNormals)) return new Uint8Array(0);
  
  const buffer = new ArrayBuffer(boneNormals.length * 4); // 4 bytes per normal
  const view = new DataView(buffer);
  
  boneNormals.forEach((normal, index) => {
    view.setUint32(index * 4, normal.normal || 0, false);
  });
  
  return new Uint8Array(buffer);
}

function convertAnimationHeaderToBinary(animHeader: any): Uint8Array {
  const buffer = new ArrayBuffer(64); // Space for animation header + name
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  view.setUint32(0, animHeader.numAnimEvents || 0, false);
  
  // Write animation name
  if (animHeader.animName && typeof animHeader.animName === 'string') {
    const nameBytes = new TextEncoder().encode(animHeader.animName);
    uint8View.set(nameBytes.slice(0, 60), 4);
  }
  
  return uint8View;
}

function convertAnimationEventsToBinary(events: any[]): Uint8Array {
  if (!Array.isArray(events)) return new Uint8Array(0);
  
  const buffer = new ArrayBuffer(events.length * 12); // 12 bytes per event
  const view = new DataView(buffer);
  
  events.forEach((event, index) => {
    const offset = index * 12;
    view.setFloat32(offset, event.time || 0, false);
    view.setUint32(offset + 4, event.type || 0, false);
    view.setUint32(offset + 8, event.value || 0, false);
  });
  
  return new Uint8Array(buffer);
}

function convertNumKeyframesToBinary(numKeyframes: any): Uint8Array {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  
  view.setUint32(0, numKeyframes.numKeyFrames || 0, false);
  
  return new Uint8Array(buffer);
}

function convertKeyframesToBinary(keyframes: any[]): Uint8Array {
  if (!Array.isArray(keyframes)) return new Uint8Array(0);
  
  const buffer = new ArrayBuffer(keyframes.length * 48); // 48 bytes per keyframe
  const view = new DataView(buffer);
  
  keyframes.forEach((keyframe, index) => {
    const offset = index * 48;
    view.setUint32(offset, keyframe.tick || 0, false);
    view.setUint32(offset + 4, keyframe.accelerationMode || 0, false);
    view.setFloat32(offset + 8, keyframe.coordX || 0, false);
    view.setFloat32(offset + 12, keyframe.coordY || 0, false);
    view.setFloat32(offset + 16, keyframe.coordZ || 0, false);
    view.setFloat32(offset + 20, keyframe.rotationX || 0, false);
    view.setFloat32(offset + 24, keyframe.rotationY || 0, false);
    view.setFloat32(offset + 28, keyframe.rotationZ || 0, false);
    view.setFloat32(offset + 32, keyframe.scaleX || 1, false);
    view.setFloat32(offset + 36, keyframe.scaleY || 1, false);
    view.setFloat32(offset + 40, keyframe.scaleZ || 1, false);
    // 4 bytes padding
  });
  
  return new Uint8Array(buffer);
}