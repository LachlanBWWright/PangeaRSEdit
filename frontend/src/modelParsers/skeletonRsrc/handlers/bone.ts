import { parseBoneDataFallback } from "../parseHelpers";
import type { BoneRaw } from "../parseSkeletonRsrcTS";

export function handleBone(
  resourceName: string,
  resourceData: BoneRaw | { data?: string; name?: string; obj?: BoneRaw } | undefined,
  resourceId: string,
  hexData: string,
): BoneRaw {
  console.log(
    `Checking bone data for ${resourceName} (${resourceId}):`,
    resourceData,
  );
  
  // Check if data is in the obj field (rsrcdump format)
  const boneData = (resourceData as { obj?: BoneRaw })?.obj || resourceData;
  
  if (
    boneData &&
    (boneData as BoneRaw).parentBone !== undefined &&
    (boneData as BoneRaw).coordX !== undefined &&
    (boneData as BoneRaw).coordY !== undefined &&
    (boneData as BoneRaw).coordZ !== undefined
  ) {
    const rd = boneData as BoneRaw;
    // Handle Pascal string format: 2 bytes padding + length byte + name characters
    let cleanName = rd.name || resourceName;
    
    // Check if this is a Pascal string with 2-byte padding prefix
    // Format: [padding0][padding1][length][name...]
    if (cleanName.length >= 3) {
      const lengthByte = cleanName.charCodeAt(2); // Length is at position 2 (after 2 padding bytes)
      // If 3rd char is a small number (1-29) indicating name length
      if (lengthByte > 0 && lengthByte <= 29 && lengthByte <= cleanName.length - 3) {
        console.log(`[bone handler] Detected Pascal string with padding: length=${lengthByte}, total_len=${cleanName.length}`);
        console.log(`[bone handler] Original: ${JSON.stringify(cleanName.substring(0, Math.min(15, cleanName.length)))}`);
        // Skip 2-byte padding + 1-byte length, read name
        cleanName = cleanName.substring(3, 3 + lengthByte);
        console.log(`[bone handler] After strip: ${JSON.stringify(cleanName)}`);
      }
    }
    
    // Also truncate at first null character to avoid corruption from padding
    const nullIndex = cleanName.indexOf('\0');
    if (nullIndex >= 0) {
      cleanName = cleanName.substring(0, nullIndex);
    }
    const obj: BoneRaw = {
      parentBone: rd.parentBone,
      name: cleanName,
      unnamedPadding: (rd as any).unnamedPadding,
      coordX: rd.coordX,
      coordY: rd.coordY,
      coordZ: rd.coordZ,
      numPointsAttachedToBone: rd.numPointsAttachedToBone || 0,
      numNormalsAttachedToBone: rd.numNormalsAttachedToBone || 0,
      reserved0: rd.reserved0,
      reserved1: rd.reserved1,
      reserved2: rd.reserved2,
      reserved3: rd.reserved3,
      reserved4: rd.reserved4,
      reserved5: rd.reserved5,
      reserved6: rd.reserved6,
      reserved7: rd.reserved7,
    };
    console.log(
      `Bone ${obj.name} coordinates from rsrcdump: [${obj.coordX}, ${obj.coordY}, ${obj.coordZ}], parentBone: ${obj.parentBone}`,
    );
    return obj;
  } else {
    console.log(
      `Bone ${resourceName} (${resourceId}) falling back to manual parsing. resourceData:`,
      resourceData,
    );
    const hex = (resourceData as { data?: string })?.data || hexData || "";
    const obj = parseBoneDataFallback(
      hex,
      (resourceData as { name?: string })?.name || resourceName,
    );
    console.log(
      `Bone ${obj.name} coordinates from fallback: [${obj.coordX}, ${obj.coordY}, ${obj.coordZ}], parentBone: ${obj.parentBone}`,
    );
    return obj;
  }
}
