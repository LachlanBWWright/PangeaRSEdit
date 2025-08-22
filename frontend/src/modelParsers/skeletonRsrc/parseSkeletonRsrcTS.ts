import { saveToJson } from "../../rsrcdump-ts/rsrcdump";
import type { SkeletonResource } from "../../python/structSpecs/skeleton/skeletonInterface";

/**
 * Parse hex data as array of 16-bit unsigned integers for BonP entries
 */
function parseBonPData(hexData: string): { pointIndex: number }[] {
  if (!hexData || hexData.length === 0) return [];
  
  const result: { pointIndex: number }[] = [];
  // Each point index is 2 bytes (4 hex chars)
  for (let i = 0; i < hexData.length; i += 4) {
    const hexValue = hexData.substring(i, i + 4);
    if (hexValue.length === 4) {
      const pointIndex = parseInt(hexValue, 16);
      result.push({ pointIndex });
    }
  }
  return result;
}

/**
 * Parse hex data as array of 16-bit unsigned integers for BonN entries
 */
function parseBonNData(hexData: string): { normal: number }[] {
  if (!hexData || hexData.length === 0) return [];
  
  const result: { normal: number }[] = [];
  // Each normal index is 2 bytes (4 hex chars)
  for (let i = 0; i < hexData.length; i += 4) {
    const hexValue = hexData.substring(i, i + 4);
    if (hexValue.length === 4) {
      const normal = parseInt(hexValue, 16);
      result.push({ normal });
    }
  }
  return result;
}

/**
 * Parse hex data as array of 32-bit floats for RelP entries
 */
function parseRelPData(hexData: string): { relOffsetX: number; relOffsetY: number; relOffsetZ: number }[] {
  if (!hexData || hexData.length === 0) return [];
  
  const result: { relOffsetX: number; relOffsetY: number; relOffsetZ: number }[] = [];
  
  // Convert hex string to bytes
  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }
  
  // Each point is 3 floats (12 bytes)
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < bytes.length; i += 12) {
    if (i + 12 <= bytes.length) {
      const relOffsetX = view.getFloat32(i, true); // little endian
      const relOffsetY = view.getFloat32(i + 4, true);
      const relOffsetZ = view.getFloat32(i + 8, true);
      result.push({ relOffsetX, relOffsetY, relOffsetZ });
    }
  }
  
  return result;
}

/**
 * Parse hex data for Event entries
 */
function parseEvntData(hexData: string): { time: number; type: number; value: number }[] {
  if (!hexData || hexData.length === 0) return [];
  
  const result: { time: number; type: number; value: number }[] = [];
  
  // Convert hex string to bytes
  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }
  
  // Each event is 3 32-bit values (12 bytes total)
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < bytes.length; i += 12) {
    if (i + 12 <= bytes.length) {
      const time = view.getUint32(i, true); // little endian
      const type = view.getUint32(i + 4, true);
      const value = view.getUint32(i + 8, true);
      result.push({ time, type, value });
    }
  }
  
  return result;
}

/**
 * Parse hex data for NumK entries
 */
function parseNumKData(hexData: string): { numKeyFrames: number }[] {
  if (!hexData || hexData.length === 0) return [];
  
  const result: { numKeyFrames: number }[] = [];
  
  // Convert hex string to bytes
  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }
  
  // Each entry is 1 byte
  for (let i = 0; i < bytes.length; i++) {
    result.push({ numKeyFrames: bytes[i] });
  }
  
  return result;
}

/**
 * Parse hex data for Bone entries
 */
function parseBoneData(hexData: string, boneName: string): any {
  if (!hexData || hexData.length === 0) {
    return {
      parentBone: -1,
      name: boneName,
      coordX: 0,
      coordY: 0,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
    };
  }
  
  // Convert hex string to bytes
  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }
  
  const view = new DataView(bytes.buffer);
  
  // Parse bone data structure (84 bytes total)
  let offset = 0;
  
  // parentBone: 4 bytes
  const parentBone = view.getInt32(offset, true);
  offset += 4;
  
  // name: read up to 32 bytes as null-terminated string
  let name = '';
  for (let i = 0; i < 32 && offset + i < bytes.length; i++) {
    const char = bytes[offset + i];
    if (char === 0) break; // null terminator
    name += String.fromCharCode(char);
  }
  offset += 32; // Skip name field
  
  // coordX, coordY, coordZ: 12 bytes - try big endian first
  const coordX = view.getFloat32(offset, false);
  offset += 4;
  const coordY = view.getFloat32(offset, false);
  offset += 4;
  const coordZ = view.getFloat32(offset, false);
  offset += 4;
  
  // Debug: Log the raw bytes for the coordinates to understand the data format
  console.log(`Bone ${boneName} coord bytes: ${Array.from(bytes.slice(36, 48)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  console.log(`Bone ${boneName} coords (big endian): X=${coordX}, Y=${coordY}, Z=${coordZ}`);
  
  // numPointsAttachedToBone, numNormalsAttachedToBone: 8 bytes
  const numPointsAttachedToBone = view.getUint32(offset, true);
  offset += 4;
  const numNormalsAttachedToBone = view.getUint32(offset, true);
  offset += 4;
  
  // Use the parsed name if available, otherwise fall back to the provided name
  const finalName = name.length > 0 ? name : boneName;
  
  return {
    parentBone,
    name: finalName,
    coordX,
    coordY,
    coordZ,
    numPointsAttachedToBone,
    numNormalsAttachedToBone,
  };
}
function parseKeyFData(hexData: string): any[] {
  if (!hexData || hexData.length === 0) return [];
  
  const result: any[] = [];
  
  // Convert hex string to bytes
  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }
  
  // Each keyframe is 11 floats (44 bytes total): tick, accelerationMode, coordX, coordY, coordZ, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < bytes.length; i += 44) {
    if (i + 44 <= bytes.length) {
      const tick = view.getFloat32(i, true);
      const accelerationMode = view.getFloat32(i + 4, true);
      const coordX = view.getFloat32(i + 8, true);
      const coordY = view.getFloat32(i + 12, true);
      const coordZ = view.getFloat32(i + 16, true);
      const rotationX = view.getFloat32(i + 20, true);
      const rotationY = view.getFloat32(i + 24, true);
      const rotationZ = view.getFloat32(i + 28, true);
      const scaleX = view.getFloat32(i + 32, true);
      const scaleY = view.getFloat32(i + 36, true);
      const scaleZ = view.getFloat32(i + 40, true);
      
      result.push({
        tick, accelerationMode, coordX, coordY, coordZ,
        rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ
      });
    }
  }
  
  return result;
}

/**
 * Transform the raw parsed skeleton data into the expected SkeletonResource format
 */
function transformToSkeletonResource(rawData: any): SkeletonResource {
  console.log("Raw data structure:", rawData);
  console.log("Raw data keys:", Object.keys(rawData));
  
  const result: SkeletonResource = {
    _metadata: rawData._metadata,
    Hedr: {},
    Bone: {},
    BonP: {},
    BonN: {},
    RelP: {},
    AnHd: {},
    Evnt: {},
    NumK: {},
    KeyF: {}
  };

  // Transform each resource type
  for (const [typeName, typeData] of Object.entries(rawData)) {
    if (typeName === '_metadata') continue;
    
    console.log(`Processing type: ${typeName}`, typeData);
    
    const typeMap = typeData as { [key: string]: any };
    for (const [resourceId, resourceData] of Object.entries(typeMap)) {
      const resourceIdNum = parseInt(resourceId, 10);
      
      // Parse the binary data based on the resource type
      let obj: any;
      const hexData = resourceData.data || '';
      
      if (typeName === 'BonP') {
        obj = parseBonPData(hexData);
      } else if (typeName === 'BonN') {
        obj = parseBonNData(hexData);
      } else if (typeName === 'RelP') {
        obj = parseRelPData(hexData);
      } else if (typeName === 'Evnt') {
        obj = parseEvntData(hexData);
      } else if (typeName === 'NumK') {
        obj = parseNumKData(hexData);
      } else if (typeName === 'KeyF') {
        obj = parseKeyFData(hexData);
      } else if (typeName === 'Bone') {
        obj = parseBoneData(hexData, resourceData.name || `Bone_${resourceId}`);
      } else if (typeName === 'AnHd') {
        // AnHd is a single object, not an array
        // For now, keep the hex data - we'll need to parse this properly later
        obj = { animName: resourceData.name || `Anim_${resourceId}`, numAnimEvents: 0 };
      } else {
        // For other types, keep the raw data
        obj = hexData;
      }
      
      // Create the expected structure for each resource type
      const entry = {
        name: resourceData.name || `Resource_${resourceId}`,
        order: resourceIdNum,
        obj: obj
      };

      // Add to the appropriate section
      if (typeName === 'Hedr') {
        result.Hedr[resourceId] = entry;
      } else if (typeName === 'Bone') {
        result.Bone[resourceId] = entry;
      } else if (typeName === 'BonP') {
        result.BonP[resourceId] = entry;
      } else if (typeName === 'BonN') {
        result.BonN[resourceId] = entry;
      } else if (typeName === 'RelP') {
        result.RelP![resourceId] = entry;
      } else if (typeName === 'AnHd') {
        result.AnHd[resourceId] = entry;
      } else if (typeName === 'Evnt') {
        result.Evnt[resourceId] = entry;
      } else if (typeName === 'NumK') {
        result.NumK[resourceId] = entry;
      } else if (typeName === 'KeyF') {
        result.KeyF[resourceId] = entry;
      } else {
        // Store unknown types as well
        result[typeName] = typeMap;
      }
    }
  }

  return result;
}

/**
 * Parse a skeleton resource using the TypeScript rsrcdump implementation
 * @param bytes The skeleton resource file bytes
 * @returns The parsed skeleton data as a JSON object
 */
export function parseSkeletonRsrcTS(bytes: ArrayBuffer): SkeletonResource {
  // Convert ArrayBuffer to Uint8Array
  const uint8Array = new Uint8Array(bytes);
  
  // Use the TypeScript rsrcdump to parse the skeleton data
  const jsonString = saveToJson(
    uint8Array,
    [], // struct specs - will use default Otto specs
    [], // include types - include all
    [], // exclude types - exclude none
    true // use Otto specs
  );
  
  // Parse the JSON result
  const parsed = JSON.parse(jsonString);
  
  // The skeleton data should be in the parsed result
  // We need to find the skeleton resource in the result
  console.log("Parsed skeleton data:", parsed);
  
  // Transform to expected format
  const transformedData = transformToSkeletonResource(parsed);
  console.log("Transformed skeleton data:", transformedData);
  
  return transformedData;
}