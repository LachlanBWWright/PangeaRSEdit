// Binary skeleton resource export functionality
// Converts SkeletonResource JSON back to binary .rsrc format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";

/**
 * Convert SkeletonResource JSON to binary .rsrc format using TypeScript implementation
 * This is a simplified implementation that creates a basic resource fork structure
 */
export function skeletonResourceToBinary(skeletonResource: SkeletonResource): ArrayBuffer {
  console.log("Converting SkeletonResource to binary format...");
  
  // For now, we'll use a simplified approach that creates a working .rsrc file
  // A full implementation would need the complete rsrcdump TypeScript packing functionality
  
  // Calculate the total size needed for all resources
  let totalSize = 0;
  const resourceData: Array<{ type: string; id: number; data: Uint8Array; name: string }> = [];
  
  // Process each resource type
  Object.entries(skeletonResource).forEach(([resourceType, resources]) => {
    if (typeof resources === 'object' && resources !== null) {
      Object.entries(resources).forEach(([resourceId, resource]: [string, any]) => {
        if (resource && typeof resource === 'object' && resource.obj) {
          // Convert the object data to binary format
          const binaryData = convertResourceObjectToBinary(resourceType, resource.obj);
          resourceData.push({
            type: resourceType,
            id: parseInt(resourceId),
            data: binaryData,
            name: resource.name || '',
          });
          totalSize += binaryData.length;
        }
      });
    }
  });
  
  // Create a minimal resource fork structure
  // This is a simplified version - a full implementation would need complete resource fork format
  const headerSize = 256; // Space for resource fork header
  const resourceMapSize = resourceData.length * 32; // 32 bytes per resource entry
  const totalFileSize = headerSize + resourceMapSize + totalSize;
  
  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  // Write a basic resource fork header (simplified)
  view.setUint32(0, resourceMapSize, false); // Resource data offset
  view.setUint32(4, totalFileSize - headerSize, false); // Resource map offset
  view.setUint32(8, totalSize, false); // Resource data length
  view.setUint32(12, resourceMapSize, false); // Resource map length
  
  // Write resource data
  let dataOffset = headerSize;
  let mapOffset = headerSize + totalSize;
  
  resourceData.forEach((resource, index) => {
    // Copy resource data
    uint8View.set(resource.data, dataOffset);
    
    // Write resource map entry (simplified)
    const mapEntryOffset = mapOffset + (index * 32);
    
    // Resource type (4 bytes)
    const typeBytes = new TextEncoder().encode(resource.type.padEnd(4).substring(0, 4));
    uint8View.set(typeBytes, mapEntryOffset);
    
    // Resource ID (2 bytes)
    view.setUint16(mapEntryOffset + 4, resource.id, false);
    
    // Resource name offset (2 bytes) - simplified
    view.setUint16(mapEntryOffset + 6, 0, false);
    
    // Resource attributes and data offset (8 bytes)
    view.setUint32(mapEntryOffset + 8, dataOffset - headerSize, false);
    view.setUint32(mapEntryOffset + 12, resource.data.length, false);
    
    dataOffset += resource.data.length;
  });
  
  console.log(`Created skeleton binary with ${resourceData.length} resources, total size: ${totalFileSize} bytes`);
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