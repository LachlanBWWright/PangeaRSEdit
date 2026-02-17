import { parseBoneDataFallback } from "../parseHelpers";
import type { BoneRaw } from "../parseSkeletonRsrcTS";

// Type guard for checking if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Type guard for BoneRaw
function isBoneRaw(value: unknown): value is BoneRaw {
  if (!isRecord(value)) return false;
  return (
    typeof value.parentBone === "number" &&
    typeof value.coordX === "number" &&
    typeof value.coordY === "number" &&
    typeof value.coordZ === "number"
  );
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
    // Handle Pascal string format: 1 byte length + name characters (up to 31 bytes)
    // The name field is 32 bytes total in File_BoneDefinitionType
    let cleanName = rd.name || resourceName;

    // Check if this is a Pascal string format: [length][name...]
    if (cleanName.length >= 1) {
      const lengthByte = cleanName.charCodeAt(0);
      // If 1st char is a small number (1-31) indicating name length
      if (
        lengthByte > 0 &&
        lengthByte <= 31 &&
        lengthByte <= cleanName.length - 1
      ) {
        console.log(
          `[bone handler] Detected Pascal string: length=${lengthByte}, total_len=${cleanName.length}`,
        );
        // Skip 1-byte length, read name
        cleanName = cleanName.substring(1, 1 + lengthByte);
        console.log(`[bone handler] After strip: ${JSON.stringify(cleanName)}`);
      }
    }

    // Also truncate at first null character to avoid corruption from padding
    const nullIndex = cleanName.indexOf("\0");
    if (nullIndex >= 0) {
      cleanName = cleanName.substring(0, nullIndex);
    }
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
    const hex = isRecord(resourceData) && typeof resourceData.data === "string"
      ? resourceData.data
      : hexData || "";
    const name = isRecord(resourceData) && typeof resourceData.name === "string"
      ? resourceData.name
      : resourceName;
    const obj = parseBoneDataFallback(hex, name);
    console.log(
      `Bone ${obj.name} coordinates from fallback: [${obj.coordX}, ${obj.coordY}, ${obj.coordZ}], parentBone: ${obj.parentBone}`,
    );
    return obj;
  }
}
