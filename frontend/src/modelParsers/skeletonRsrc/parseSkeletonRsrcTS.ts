import { saveToJson } from "../../rsrcdump-ts/rsrcdump";
import type { SkeletonResource } from "../../python/structSpecs/skeleton/skeletonInterface";
import { skeletonSpecs } from "../../python/structSpecs/skeleton/skeleton";

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
function parseRelPData(
  hexData: string,
): { relOffsetX: number; relOffsetY: number; relOffsetZ: number }[] {
  if (!hexData || hexData.length === 0) return [];

  const result: {
    relOffsetX: number;
    relOffsetY: number;
    relOffsetZ: number;
  }[] = [];

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
function parseEvntData(
  hexData: string,
): { time: number; type: number; value: number }[] {
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
 * Parse hex data for Bone entries (fallback for when rsrcdump doesn't parse correctly)
 */
function parseBoneDataFallback(hexData: string, boneName: string): any {
  console.log(
    `parseBoneDataFallback called for ${boneName} with hexData length: ${hexData.length}`,
  );
  console.log(`Raw hex data: ${hexData}`);

  if (!hexData || hexData.length === 0) {
    return {
      parentBone: -1,
      name: boneName,
      relX: 0,
      relY: 0,
      relZ: 0,
      relRotX: 0,
      relRotY: 0,
      relRotZ: 0,
      numPointsAttached: 0,
      attachedPointList: [],
    };
  }

  // Convert hex string to bytes
  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }

  const view = new DataView(bytes.buffer);

  // Parse bone data structure according to extended Otto Matic format
  let offset = 0;

  // name: 32 bytes (char array)
  const nameBytes = bytes.slice(offset, offset + 32);
  const name = String.fromCharCode(...nameBytes).split("\0")[0] || boneName;
  offset += 32;

  // parentBone: 4 bytes (long/i32)
  const parentBone = view.getInt32(offset, false); // big endian for Mac
  offset += 4;

  // relX, relY, relZ: 12 bytes (3 floats)
  const relX = view.getFloat32(offset, false); // big endian
  offset += 4;
  const relY = view.getFloat32(offset, false);
  offset += 4;
  const relZ = view.getFloat32(offset, false);
  offset += 4;

  // relRotX, relRotY, relRotZ: 12 bytes (3 floats)
  const relRotX = view.getFloat32(offset, false);
  offset += 4;
  const relRotY = view.getFloat32(offset, false);
  offset += 4;
  const relRotZ = view.getFloat32(offset, false);
  offset += 4;

  console.log(
    `Bone ${name} coordinates: [${relX}, ${relY}, ${relZ}], rotations: [${relRotX}, ${relRotY}, ${relRotZ}]`,
  );

  // numPointsAttached: 4 bytes (long/i32)
  const numPointsAttached = view.getInt32(offset, false);
  offset += 4;

  // attachedPointList: 100 longs (400 bytes)
  const attachedPointList: number[] = [];
  for (let i = 0; i < 100 && offset + 4 <= bytes.length; i++) {
    const pointIndex = view.getInt32(offset, false);
    attachedPointList.push(pointIndex);
    offset += 4;
  }

  return {
    parentBone,
    name,
    relX,
    relY,
    relZ,
    relRotX,
    relRotY,
    relRotZ,
    numPointsAttached,
    attachedPointList,
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
        tick,
        accelerationMode,
        coordX,
        coordY,
        coordZ,
        rotationX,
        rotationY,
        rotationZ,
        scaleX,
        scaleY,
        scaleZ,
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
    KeyF: {},
  };

  // Transform each resource type
  for (const [typeName, typeData] of Object.entries(rawData)) {
    if (typeName === "_metadata") continue;

    console.log(`Processing type: ${typeName}`, typeData);

    const typeMap = typeData as { [key: string]: any };
    for (const [resourceId, resourceData] of Object.entries(typeMap)) {
      const resourceIdNum = parseInt(resourceId, 10);

      // Parse the binary data based on the resource type
      let obj: any;
      const hexData = resourceData.data || "";

      if (typeName === "BonP") {
        // Check if rsrcdump already parsed the data correctly
        if (
          Array.isArray(resourceData) &&
          resourceData.length > 0 &&
          resourceData[0].pointIndex !== undefined
        ) {
          obj = resourceData;
        } else {
          obj = parseBonPData(hexData);
        }
      } else if (typeName === "BonN") {
        // Check if rsrcdump already parsed the data correctly
        if (
          Array.isArray(resourceData) &&
          resourceData.length > 0 &&
          resourceData[0].normal !== undefined
        ) {
          obj = resourceData;
        } else {
          obj = parseBonNData(hexData);
        }
      } else if (typeName === "RelP") {
        // Check if rsrcdump already parsed the data correctly
        if (
          Array.isArray(resourceData) &&
          resourceData.length > 0 &&
          resourceData[0].relOffsetX !== undefined
        ) {
          obj = resourceData;
        } else {
          obj = parseRelPData(hexData);
        }
      } else if (typeName === "Evnt") {
        // Check if rsrcdump already parsed the data correctly
        if (
          Array.isArray(resourceData) &&
          resourceData.length > 0 &&
          resourceData[0].time !== undefined
        ) {
          obj = resourceData;
        } else {
          obj = parseEvntData(hexData);
        }
      } else if (typeName === "NumK") {
        // Check if rsrcdump already parsed the data correctly
        if (
          Array.isArray(resourceData) &&
          resourceData.length > 0 &&
          resourceData[0].numKeyFrames !== undefined
        ) {
          obj = resourceData;
        } else {
          obj = parseNumKData(hexData);
        }
      } else if (typeName === "KeyF") {
        // Check if rsrcdump already parsed the keyframe data correctly
        // resourceData should have structure: { name: string, obj: KeyFrame[] }
        if (
          resourceData?.obj &&
          Array.isArray(resourceData.obj) &&
          resourceData.obj.length > 0 &&
          resourceData.obj[0].tick !== undefined
        ) {
          // Use the already parsed data from rsrcdump
          obj = resourceData.obj;
          console.log(
            `KeyF ${resourceId} data from rsrcdump:`,
            obj.length,
            "keyframes",
          );
        } else if (resourceData?.obj && Array.isArray(resourceData.obj)) {
          // rsrcdump parsed it as an array but it might be empty or malformed
          obj = resourceData.obj;
          console.log(
            `KeyF ${resourceId} empty/malformed from rsrcdump:`,
            obj.length,
            "keyframes",
          );
        } else {
          // Check what we actually got from rsrcdump
          console.log(`KeyF ${resourceId} raw resourceData:`, resourceData);
          console.log(
            `KeyF ${resourceId} resourceData type:`,
            typeof resourceData,
          );
          console.log(
            `KeyF ${resourceId} resourceData.keys:`,
            Object.keys(resourceData || {}),
          );

          // Fallback to manual hex parsing
          const hexData = resourceData.data || "";
          console.log(`KeyF ${resourceId} hex data length:`, hexData.length);
          obj = parseKeyFData(hexData);
          console.log(
            `KeyF ${resourceId} parsed from hex:`,
            obj.length,
            "keyframes",
          );
        }
      } else if (typeName === "Bone") {
        // Check if rsrcdump already parsed the bone data correctly
        console.log(`Checking bone data for ${resourceId}:`, resourceData);
        console.log(`Bone ${resourceId} raw hex data:`, resourceData.data);
        if (
          resourceData.obj &&
          resourceData.obj.parentBone !== undefined &&
          resourceData.obj.relX !== undefined &&
          resourceData.obj.relY !== undefined &&
          resourceData.obj.relZ !== undefined
        ) {
          // Use the already parsed data from rsrcdump
          obj = {
            parentBone: resourceData.obj.parentBone,
            name: resourceData.obj.name || `Bone_${resourceId}`,
            relX: resourceData.obj.relX,
            relY: resourceData.obj.relY,
            relZ: resourceData.obj.relZ,
            relRotX: resourceData.obj.relRotX || 0,
            relRotY: resourceData.obj.relRotY || 0,
            relRotZ: resourceData.obj.relRotZ || 0,
            numPointsAttached: resourceData.obj.numPointsAttached || 0,
            attachedPointList: resourceData.obj.attachedPointList || [],
          };
          console.log(
            `Bone ${obj.name} coordinates from rsrcdump: [${obj.relX}, ${obj.relY}, ${obj.relZ}], parentBone: ${obj.parentBone}`,
          );
        } else {
          // Fallback to manual hex parsing
          console.log(
            `Bone ${resourceId} falling back to manual parsing. resourceData:`,
            resourceData,
          );
          const hexData = resourceData.data || "";
          obj = parseBoneDataFallback(
            hexData,
            resourceData.name || `Bone_${resourceId}`,
          );
          console.log(
            `Bone ${obj.name} coordinates from fallback: [${obj.coordX}, ${obj.coordY}, ${obj.coordZ}], parentBone: ${obj.parentBone}`,
          );
          console.log(
            `Bone ${obj.name} coordinates from fallback: [${obj.coordX}, ${obj.coordY}, ${obj.coordZ}], parentBone: ${obj.parentBone}`,
          );
        }
      } else if (typeName === "AnHd") {
        // Check if rsrcdump already parsed the animation header correctly
        if (
          resourceData.animName !== undefined &&
          resourceData.numAnimEvents !== undefined
        ) {
          obj = {
            animName: resourceData.animName,
            numAnimEvents: resourceData.numAnimEvents,
          };
        } else {
          // AnHd is a single object, not an array
          // For now, keep the hex data - we'll need to parse this properly later
          obj = {
            animName: resourceData.name || `Anim_${resourceId}`,
            numAnimEvents: 0,
          };
        }
      } else {
        // For other types, keep the raw data
        obj = hexData;
      }

      // Create the expected structure for each resource type
      const entry = {
        name: resourceData.name || `Resource_${resourceId}`,
        order: resourceIdNum,
        obj: obj,
      };

      // Add to the appropriate section
      if (typeName === "Hedr") {
        result.Hedr[resourceId] = entry;
      } else if (typeName === "Bone") {
        result.Bone[resourceId] = entry;
      } else if (typeName === "BonP") {
        result.BonP[resourceId] = entry;
      } else if (typeName === "BonN") {
        result.BonN[resourceId] = entry;
      } else if (typeName === "RelP") {
        result.RelP![resourceId] = entry;
      } else if (typeName === "AnHd") {
        result.AnHd[resourceId] = entry;
      } else if (typeName === "Evnt") {
        result.Evnt[resourceId] = entry;
      } else if (typeName === "NumK") {
        result.NumK[resourceId] = entry;
      } else if (typeName === "KeyF") {
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
  console.log(
    "=== parseSkeletonRsrcTS called with bytes length:",
    bytes.byteLength,
  );

  // Convert ArrayBuffer to Uint8Array
  const uint8Array = new Uint8Array(bytes);

  // Use the TypeScript rsrcdump to parse the skeleton data with skeleton specs
  const jsonString = saveToJson(
    uint8Array,
    skeletonSpecs, // struct specs - include skeleton specs
    [], // include types - include all
    [], // exclude types - exclude none
    false, // don't use Otto specs since we're providing skeleton specs
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
