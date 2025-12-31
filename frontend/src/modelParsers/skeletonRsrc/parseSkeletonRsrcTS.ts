import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import { isOk } from "../../types/result";
import type { 
  SkeletonResource,
  HedrEntry,
  BoneEntry,
  BonPEntry,
  BonNEntry,
  RelPEntry,
  AnHdEntry,
  EvntEntry,
  NumKEntry,
  KeyFEntry,
} from "../../python/structSpecs/skeleton/skeletonInterface";
import { skeletonSpecs } from "../../python/structSpecs/skeleton/skeleton";

// Handlers split into separate modules
import { handleBonP } from "./handlers/bonp";
import { handleBonN } from "./handlers/bonn";
import { handleRelP } from "./handlers/relp";
import { handleEvnt } from "./handlers/evnt";
import { handleNumK } from "./handlers/numk";
import { handleKeyF } from "./handlers/keyf";
import { handleBone } from "./handlers/bone";
import { handleAnHd } from "./handlers/anhd";

// Types derived from `skeletonSpecs` (approximate, shaped to the saveToJson output)
type ResourceMap<T> = Record<string, T>;

export interface HedrRaw {
  version: number;
  numAnims: number;
  numJoints: number;
  num3DMFLimbs: number;
}
export interface BoneRaw {
  parentBone: number;
  name: string;
  coordX: number;
  coordY: number;
  coordZ: number;
  numPointsAttachedToBone: number;
  numNormalsAttachedToBone: number;
  reserved0?: number;
  reserved1?: number;
  reserved2?: number;
  reserved3?: number;
  reserved4?: number;
  reserved5?: number;
  reserved6?: number;
  reserved7?: number;
}
export interface BonPRaw {
  pointIndex: number;
}
export interface BonNRaw {
  normal: number;
}
export interface RelPRaw {
  relOffsetX: number;
  relOffsetY?: number;
  relOffsetZ?: number;
} // often stored as numeric fields per entry
export interface AnHdRaw {
  animName: string;
  numAnimEvents: number;
}
export interface EvntRaw {
  time: number;
  type: number;
  value: number;
}
export interface NumKRaw {
  numKeyFrames: number;
}
// KeyF entries are typically arrays of keyframe objects or numeric arrays; keep loose typing
export type KeyFRaw = Record<string, unknown>;

export interface ParsedSkeleton {
  _metadata?: Record<string, unknown>;
  Hedr?: ResourceMap<HedrRaw>;
  Bone?: ResourceMap<BoneRaw>;
  BonP?: ResourceMap<BonPRaw>;
  BonN?: ResourceMap<BonNRaw>;
  RelP?: ResourceMap<RelPRaw>;
  AnHd?: ResourceMap<AnHdRaw>;
  Evnt?: ResourceMap<EvntRaw>;
  NumK?: ResourceMap<NumKRaw>;
  KeyF?: ResourceMap<KeyFRaw>;
  Nams?: ResourceMap<string[]>;
  Bnds?: ResourceMap<unknown>;
  [key: string]: unknown;
}

/**
 * Transform the raw parsed skeleton data into the expected SkeletonResource format
 */
function transformToSkeletonResource(
  rawData: ParsedSkeleton,
): SkeletonResource {
  const result: SkeletonResource = {
    _metadata: rawData?._metadata,
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

  if (!rawData) return result;

  for (const [typeName, typeData] of Object.entries(rawData)) {
    if (typeName === "_metadata") continue;
    for (const [resourceId, resourceData] of Object.entries(typeData || {})) {
      const resourceIdNum = parseInt(resourceId, 10);
      const resourceName = resourceData?.name || `Resource_${resourceId}`;
      const hexData = resourceData?.data || "";
      let obj: unknown;

      switch (typeName) {
        case "BonP":
          obj = handleBonP(resourceName, resourceData, hexData);
          break;
        case "BonN":
          obj = handleBonN(resourceName, resourceData, hexData);
          break;
        case "RelP":
          obj = handleRelP(resourceName, resourceData, resourceId, hexData);
          break;
        case "Evnt":
          obj = handleEvnt(resourceName, resourceData, resourceId, hexData);
          break;
        case "NumK":
          obj = handleNumK(resourceName, resourceData, hexData);
          break;
        case "KeyF":
          obj = handleKeyF(resourceName, resourceData, resourceId, hexData);
          break;
        case "Bone":
          obj = handleBone(resourceName, resourceData, resourceId, hexData);
          break;
        case "AnHd":
          obj = handleAnHd(resourceName, resourceData);
          break;
        default:
          obj = resourceData?.obj ?? hexData ?? resourceData;
      }

      const baseEntry = {
        name: resourceName,
        order: resourceIdNum,
        obj,
      };

      // Assign entries to their proper record fields
      // The obj type is validated by the struct specs during parsing
      if (typeName === "Hedr") result.Hedr[resourceId] = baseEntry;
      else if (typeName === "Bone") result.Bone[resourceId] = baseEntry;
      else if (typeName === "BonP") result.BonP[resourceId] = baseEntry;
      else if (typeName === "BonN") result.BonN[resourceId] = baseEntry;
      else if (typeName === "RelP") result.RelP[resourceId] = baseEntry;
      else if (typeName === "AnHd") result.AnHd[resourceId] = baseEntry;
      else if (typeName === "Evnt") result.Evnt[resourceId] = baseEntry;
      else if (typeName === "NumK") result.NumK[resourceId] = baseEntry;
      else if (typeName === "KeyF") result.KeyF[resourceId] = baseEntry;
      else result[typeName] = typeData;
    }
  }

  return result;
}

/**
 * Parse skeleton resource using TypeScript parser
 */
export async function parseSkeletonRsrc(bytes: ArrayBuffer): Promise<SkeletonResource> {
  const parsed = await parseSkeletonRsrcJson(bytes);
  return transformToSkeletonResource(parsed);
}

export async function parseSkeletonRsrcJson(bytes: ArrayBuffer): Promise<ParsedSkeleton> {
  const uint8Array = new Uint8Array(bytes);
  const result = await saveToJson(uint8Array, skeletonSpecs, [], []);
  if (!isOk(result)) {
    const errorMessage = result.ok ? "" : result.error;
    return Promise.reject(errorMessage);
  }
  const parsed = JSON.parse(result.value);
  return parsed;
}
