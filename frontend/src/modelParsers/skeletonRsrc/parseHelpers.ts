/**
 * Parsing helper utilities extracted from parseSkeletonRsrc
 */
import type { BoneRaw, KeyFRaw } from "./parseSkeletonRsrcTS";

export function parseBonPData(hexData: string): { pointIndex: number }[] {
  if (!hexData || hexData.length === 0) return [];

  const result: { pointIndex: number }[] = [];
  for (let i = 0; i < hexData.length; i += 4) {
    const hexValue = hexData.substring(i, i + 4);
    if (hexValue.length === 4) {
      const pointIndex = parseInt(hexValue, 16);
      result.push({ pointIndex });
    }
  }
  return result;
}

export function parseBonNData(hexData: string): { normal: number }[] {
  if (!hexData || hexData.length === 0) return [];

  const result: { normal: number }[] = [];
  for (let i = 0; i < hexData.length; i += 4) {
    const hexValue = hexData.substring(i, i + 4);
    if (hexValue.length === 4) {
      const normal = parseInt(hexValue, 16);
      result.push({ normal });
    }
  }
  return result;
}

export function parseRelPData(
  hexData: string,
): { relOffsetX: number; relOffsetY: number; relOffsetZ: number }[] {
  if (!hexData || hexData.length === 0) return [];

  const result: {
    relOffsetX: number;
    relOffsetY: number;
    relOffsetZ: number;
  }[] = [];

  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }

  const view = new DataView(bytes.buffer);
  for (let i = 0; i < bytes.length; i += 12) {
    if (i + 12 <= bytes.length) {
      const relOffsetX = view.getFloat32(i, false);
      const relOffsetY = view.getFloat32(i + 4, false);
      const relOffsetZ = view.getFloat32(i + 8, false);
      result.push({ relOffsetX, relOffsetY, relOffsetZ });
    }
  }

  return result;
}

export function parseEvntData(
  hexData: string,
): { time: number; type: number; value: number }[] {
  if (!hexData || hexData.length === 0) return [];

  const result: { time: number; type: number; value: number }[] = [];
  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }

  const view = new DataView(bytes.buffer);
  // AnimEventType: short time (2 bytes) + byte type (1 byte) + byte value (1 byte) = 4 bytes per event
  // Matches spec: Evnt:hBB+:time,type,value
  for (let i = 0; i < bytes.length; i += 4) {
    if (i + 4 <= bytes.length) {
      const time = view.getInt16(i, false); // short (2 bytes, signed)
      const type = bytes[i + 2] ?? 0; // byte (1 byte, unsigned)
      const value = bytes[i + 3] ?? 0; // byte (1 byte, unsigned)
      result.push({ time, type, value });
    }
  }

  return result;
}

export function parseNumKData(hexData: string): { numKeyFrames: number }[] {
  if (!hexData || hexData.length === 0) return [];

  const result: { numKeyFrames: number }[] = [];
  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }
  for (let i = 0; i < bytes.length; i++) {
    result.push({ numKeyFrames: bytes[i] ?? 0 });
  }
  return result;
}

export function parseBoneDataFallback(
  hexData: string,
  boneName: string,
): BoneRaw {
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

  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }

  const view = new DataView(bytes.buffer);
  let offset = 0;
  // File_BoneDefinitionType layout from file.h:
  // int32_t parentBone (4 bytes)
  // unsigned char name[32] (32 bytes)
  // OGLPoint3D coord (12 bytes = 3 floats)
  // uint16_t numPointsAttachedToBone (2 bytes)
  // uint16_t numNormalsAttachedToBone (2 bytes)
  // uint32_t reserved[8] (32 bytes)
  // Total: 84 bytes
  const parentBone = view.getInt32(offset, false);
  offset += 4;

  // Parse Pascal string from 32-byte name field
  let name = "";
  // Check if first byte is a length byte (Pascal string format)
  const lengthByte = bytes[offset] ?? 0;
  if (lengthByte > 0 && lengthByte <= 31) {
    // Pascal string: length byte + up to 31 chars
    for (let i = 1; i <= lengthByte && offset + i < bytes.length; i++) {
      const char = bytes[offset + i] ?? 0;
      if (char === 0) break;
      name += String.fromCharCode(char);
    }
  } else {
    // Raw null-terminated string
    for (let i = 0; i < 32 && offset + i < bytes.length; i++) {
      const char = bytes[offset + i] ?? 0;
      if (char === 0) break;
      name += String.fromCharCode(char);
    }
  }
  offset += 32;

  const coordX = view.getFloat32(offset, false);
  offset += 4;
  const coordY = view.getFloat32(offset, false);
  offset += 4;
  const coordZ = view.getFloat32(offset, false);
  offset += 4;

  // uint16_t fields for point/normal counts
  const numPointsAttachedToBone = view.getUint16(offset, false);
  offset += 2;
  const numNormalsAttachedToBone = view.getUint16(offset, false);
  offset += 2;

  // Read reserved fields (8 uint32s = 32 bytes)
  const reserved0 =
    bytes.length >= offset + 4 ? view.getUint32(offset, false) : 0;
  const reserved1 =
    bytes.length >= offset + 8 ? view.getUint32(offset + 4, false) : 0;
  const reserved2 =
    bytes.length >= offset + 12 ? view.getUint32(offset + 8, false) : 0;
  const reserved3 =
    bytes.length >= offset + 16 ? view.getUint32(offset + 12, false) : 0;
  const reserved4 =
    bytes.length >= offset + 20 ? view.getUint32(offset + 16, false) : 0;
  const reserved5 =
    bytes.length >= offset + 24 ? view.getUint32(offset + 20, false) : 0;
  const reserved6 =
    bytes.length >= offset + 28 ? view.getUint32(offset + 24, false) : 0;
  const reserved7 =
    bytes.length >= offset + 32 ? view.getUint32(offset + 28, false) : 0;

  const finalName = name.length > 0 ? name : boneName;

  return {
    parentBone,
    name: finalName,
    coordX,
    coordY,
    coordZ,
    numPointsAttachedToBone,
    numNormalsAttachedToBone,
    reserved0,
    reserved1,
    reserved2,
    reserved3,
    reserved4,
    reserved5,
    reserved6,
    reserved7,
  };
}

export function parseKeyFData(hexData: string): KeyFRaw[] {
  if (!hexData || hexData.length === 0) return [];

  const result: KeyFRaw[] = [];
  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
  }

  const view = new DataView(bytes.buffer);
  for (let i = 0; i < bytes.length; i += 44) {
    if (i + 44 <= bytes.length) {
      // KeyF format: ii3f3f3f = 2 int32s + 9 float32s
      // IMPORTANT: tick and accelerationMode are int32, NOT float32!
      const tick = view.getInt32(i, false); // big-endian int32
      const accelerationMode = view.getInt32(i + 4, false); // big-endian int32
      const coordX = view.getFloat32(i + 8, false); // big-endian float32
      const coordY = view.getFloat32(i + 12, false);
      const coordZ = view.getFloat32(i + 16, false);
      const rotationX = view.getFloat32(i + 20, false);
      const rotationY = view.getFloat32(i + 24, false);
      const rotationZ = view.getFloat32(i + 28, false);
      const scaleX = view.getFloat32(i + 32, false);
      const scaleY = view.getFloat32(i + 36, false);
      const scaleZ = view.getFloat32(i + 40, false);

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
