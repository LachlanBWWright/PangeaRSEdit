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
    // Handle Pascal string format: first byte is length, followed by characters
    let cleanName = rd.name || resourceName;
    
    // Check if this is a Pascal string (first char is length byte)
    if (cleanName.length > 0) {
      const firstCharCode = cleanName.charCodeAt(0);
      // If first char is a small number (0-32) and matches or is close to string length-1,
      // it's likely a Pascal string length prefix
      if (firstCharCode > 0 && firstCharCode <= 32 && firstCharCode <= cleanName.length - 1) {
        console.log(`[bone handler] Detected Pascal string: first=${firstCharCode}, total_len=${cleanName.length}`);
        console.log(`[bone handler] Original: ${JSON.stringify(cleanName.substring(0, 10))}`);
        // Strip the length prefix
        cleanName = cleanName.substring(1, 1 + firstCharCode);
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
