/**
 * Parsing helper utilities extracted from parseSkeletonRsrcTS
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
  for (let i = 0; i < bytes.length; i += 12) {
    if (i + 12 <= bytes.length) {
      const time = view.getUint32(i, false);
      const type = view.getUint32(i + 4, false);
      const value = view.getUint32(i + 8, false);
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
    result.push({ numKeyFrames: bytes[i] });
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
  const parentBone = view.getInt32(offset, false);
  offset += 4;

  let name = "";
  for (let i = 0; i < 32 && offset + i < bytes.length; i++) {
    const char = bytes[offset + i];
    if (char === 0) break;
    name += String.fromCharCode(char);
  }
  offset += 32;

  const coordX = view.getFloat32(offset, false);
  offset += 4;
  const coordY = view.getFloat32(offset, false);
  offset += 4;
  const coordZ = view.getFloat32(offset, false);
  offset += 4;

  const numPointsAttachedToBone = view.getUint32(offset, false);
  offset += 4;
  const numNormalsAttachedToBone = view.getUint32(offset, false);
  offset += 4;

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
