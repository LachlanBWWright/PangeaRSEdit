import { parseBoneDataFallback } from "../parseHelpers";
import { decodePascalHexString } from "../parseHelpers";
import type { BoneRaw } from "../parseSkeletonRsrcTS";
import { plainObjectSchema, boneRawSchema, getStringField } from "@/schemas/common";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return plainObjectSchema.safeParse(value).success;
}

// Type guard for BoneRaw
function isBoneRaw(value: unknown): value is BoneRaw {
  return boneRawSchema.safeParse(value).success;
}

export function handleBone(
  resourceName: string,
  resourceData:
    | BoneRaw
    | { data?: string; name?: string; obj?: BoneRaw }
    | undefined,
  resourceId: string,
  hexData: string,
): BoneRaw {
  console.log(
    `Checking bone data for ${resourceName} (${resourceId}):`,
    resourceData,
  );

  // Check if data is in the obj field (rsrcdump format)
  let boneData: unknown = resourceData;
  if (isRecord(resourceData) && "obj" in resourceData) {
    boneData = resourceData.obj;
  }

  if (isBoneRaw(boneData)) {
    const rd = boneData;
    const cleanName = decodePascalHexString(rd.name || "") || resourceName;
    const obj: BoneRaw = {
      parentBone: rd.parentBone,
      name: cleanName,
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
    const hex = isRecord(resourceData) ? getStringField(resourceData, "data") : hexData || "";
    const name = isRecord(resourceData) ? getStringField(resourceData, "name", resourceName) : resourceName;
    const obj = parseBoneDataFallback(hex, name);
    console.log(
      `Bone ${obj.name} coordinates from fallback: [${obj.coordX}, ${obj.coordY}, ${obj.coordZ}], parentBone: ${obj.parentBone}`,
    );
    return obj;
  }
}
