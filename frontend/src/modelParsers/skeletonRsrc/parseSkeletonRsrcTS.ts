import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import type {
  SkeletonResource,
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
import { decodePascalHexString } from "./parseHelpers";

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
  relOffsetY: number;
  relOffsetZ: number;
}
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
// KeyF: Keyframe entry - matches KeyFObj from skeletonInterface
export interface KeyFRaw {
  tick: number;
  accelerationMode: number;
  coordX: number;
  coordY: number;
  coordZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

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
  const result: {
    _metadata?: Record<string, unknown>;
    Hedr: NonNullable<SkeletonResource["Hedr"]>;
    Bone: NonNullable<SkeletonResource["Bone"]>;
    BonP: NonNullable<SkeletonResource["BonP"]>;
    BonN: NonNullable<SkeletonResource["BonN"]>;
    RelP: NonNullable<SkeletonResource["RelP"]>;
    AnHd: NonNullable<SkeletonResource["AnHd"]>;
    Evnt: NonNullable<SkeletonResource["Evnt"]>;
    NumK: NonNullable<SkeletonResource["NumK"]>;
    KeyF: NonNullable<SkeletonResource["KeyF"]>;
  } = {
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

      // Assign entries to their proper typed records
      // Each handler returns the correctly typed object
      if (typeName === "Hedr") {
        // Hedr should be parsed from structured fields only.
        const hedrObj = resourceData?.obj ?? resourceData;
        if (isHedrRaw(hedrObj)) {
          result.Hedr[resourceId] = {
            name: resourceName,
            order: resourceIdNum,
            obj: hedrObj,
          };
        }
      } else if (typeName === "Bone") {
        const boneObj = handleBone(resourceName, resourceData, resourceId, hexData);
        result.Bone[resourceId] = {
          name: resourceName,
          order: resourceIdNum,
          obj: boneObj,
        };
      } else if (typeName === "BonP") {
        const bonpObj = handleBonP(resourceName, resourceData, hexData);
        result.BonP[resourceId] = {
          name: resourceName,
          order: resourceIdNum,
          obj: bonpObj,
        };
      } else if (typeName === "BonN") {
        const bonnObj = handleBonN(resourceName, resourceData, hexData);
        result.BonN[resourceId] = {
          name: resourceName,
          order: resourceIdNum,
          obj: bonnObj,
        };
      } else if (typeName === "RelP" && result.RelP) {
        const relpObj = handleRelP(resourceName, resourceData, resourceId, hexData);
        result.RelP[resourceId] = {
          name: resourceName,
          order: resourceIdNum,
          obj: relpObj,
        };
      } else if (typeName === "AnHd") {
        const anhdObj = handleAnHd(resourceName, resourceData);
        result.AnHd[resourceId] = {
          name: resourceName,
          order: resourceIdNum,
          obj: anhdObj,
        };
      } else if (typeName === "Evnt") {
        const evntObj = handleEvnt(resourceName, resourceData, resourceId, hexData);
        result.Evnt[resourceId] = {
          name: resourceName,
          order: resourceIdNum,
          obj: evntObj,
        };
      } else if (typeName === "NumK") {
        const numkObj = handleNumK(resourceName, resourceData, hexData);
        result.NumK[resourceId] = {
          name: resourceName,
          order: resourceIdNum,
          obj: numkObj,
        };
      } else if (typeName === "KeyF") {
        const keyfObj = handleKeyF(resourceName, resourceData, resourceId, hexData);
        result.KeyF[resourceId] = {
          name: resourceName,
          order: resourceIdNum,
          obj: keyfObj,
        };
      }
    }
  }

  return result;
}

// Helper to check if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Type guard for HedrRaw
function isHedrRaw(value: unknown): value is HedrRaw {
  if (!isRecord(value)) return false;
  return typeof value.version === 'number' && 
         typeof value.numAnims === 'number' && 
         typeof value.numJoints === 'number';
}

/**
 * Parse skeleton resource using TypeScript parser
 */
export async function parseSkeletonRsrc(
  bytes: ArrayBuffer,
): Promise<SkeletonResource> {
  const parsed = await parseSkeletonRsrcJson(bytes);
  return transformToSkeletonResource(parsed);
}

function parseHedrFallback(hexData: string | undefined): HedrRaw | undefined {
  if (!hexData || hexData.length < 8) {
    return undefined;
  }

  const bytes = new Uint8Array(hexData.length / 2);
  for (let i = 0; i < hexData.length; i += 2) {
    const byte = Number.parseInt(hexData.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      return undefined;
    }
    bytes[i / 2] = byte;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const values: number[] = [];
  for (let i = 0; i < 4 && i * 2 + 2 <= bytes.length; i += 1) {
    values.push(view.getUint16(i * 2, true));
  }

  if (values.length === 4) {
    return {
      version: values[0] ?? 0,
      numAnims: values[1] ?? 0,
      numJoints: values[2] ?? 0,
      num3DMFLimbs: values[3] ?? 0,
    };
  }

  return undefined;
}

function parseAnHdFallback(hexData: string | undefined): AnHdRaw | undefined {
  if (!hexData || hexData.length < 4) {
    return undefined;
  }

  const animName = decodePascalHexString(hexData);
  if (!animName) {
    return undefined;
  }

  return {
    animName,
    numAnimEvents: 0,
  };
}

export async function parseSkeletonRsrcJson(
  bytes: ArrayBuffer,
): Promise<ParsedSkeleton> {
  const uint8Array = new Uint8Array(bytes);
  const result = await saveToJson(uint8Array, skeletonSpecs, [], []);
  if (!result.ok) {
    return Promise.reject(new Error(String(result.error)));
  }
  const parsed: unknown = JSON.parse(result.value);
  if (isRecord(parsed)) {
    for (const [resourceType, entries] of Object.entries(parsed)) {
      if (!isRecord(entries)) {
        continue;
      }
      for (const resource of Object.values(entries)) {
        if (!isRecord(resource)) {
          continue;
        }
        const raw = resource;

        if (resourceType === "AnHd") {
          if (raw.obj !== undefined && isRecord(raw.obj)) {
            const animName = raw.obj.animName;
            if (typeof animName === "string") {
              raw.obj.animName = decodePascalHexString(animName);
            }
          } else if (raw.data !== undefined) {
            const fallback = parseAnHdFallback(typeof raw.data === "string" ? raw.data : undefined);
            if (fallback) {
              raw.obj = fallback;
              delete raw.data;
              delete raw.conversion_error;
            }
          }
          continue;
        }

        if (raw.obj !== undefined || raw.data === undefined) {
          continue;
        }

        const fallback =
          resourceType === "Hedr"
            ? parseHedrFallback(typeof raw.data === "string" ? raw.data : undefined)
            : undefined;

        if (fallback) {
          raw.obj = fallback;
          delete raw.data;
          delete raw.conversion_error;
        }
      }
    }
  }
  // Validate the parsed structure at runtime
  if (!isParsedSkeleton(parsed)) {
    return Promise.reject(new Error("Invalid skeleton structure"));
  }
  return parsed;
}

// Type guard for ParsedSkeleton
function isParsedSkeleton(value: unknown): value is ParsedSkeleton {
  if (!isRecord(value)) return false;
  const knownResourceTypes = [
    "Hedr",
    "Bone",
    "BonP",
    "BonN",
    "RelP",
    "AnHd",
    "Evnt",
    "NumK",
    "KeyF",
    "Nams",
    "Bnds",
  ];
  return knownResourceTypes.some((resourceType) => resourceType in value);
}
