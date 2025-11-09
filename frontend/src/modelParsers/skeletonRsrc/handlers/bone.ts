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
    const obj: BoneRaw = {
      parentBone: rd.parentBone,
      name: rd.name || resourceName,
      coordX: rd.coordX,
      coordY: rd.coordY,
      coordZ: rd.coordZ,
      numPointsAttachedToBone: rd.numPointsAttachedToBone || 0,
      numNormalsAttachedToBone: rd.numNormalsAttachedToBone || 0,
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
