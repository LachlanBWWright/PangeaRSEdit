import { saveToJson } from "../../rsrcdump-ts/rsrcdump";
import type { SkeletonResource } from "../../python/structSpecs/skeleton/skeletonInterface";
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
  unnamedPadding?: number; // Unnamed 2-byte field between name and coords
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
      const resourceName =
        (resourceData as { name?: string })?.name || `Resource_${resourceId}`;
      const hexData = (resourceData as { data?: string })?.data || "";
      let obj: unknown;

      switch (typeName) {
        case "BonP":
          obj = handleBonP(
            resourceName,
            resourceData as BonPRaw[] | { obj?: BonPRaw[] } | undefined,
            hexData,
          );
          break;
        case "BonN":
          obj = handleBonN(
            resourceName,
            resourceData as BonNRaw[] | { obj?: BonNRaw[] } | undefined,
            hexData,
          );
          break;
        case "RelP":
          obj = handleRelP(
            resourceName,
            resourceData as RelPRaw[] | { obj?: RelPRaw[] } | undefined,
            resourceId,
            hexData,
          );
          break;
        case "Evnt":
          obj = handleEvnt(
            resourceName,
            resourceData as EvntRaw[] | { obj?: EvntRaw[] } | undefined,
            resourceId,
            hexData,
          );
          break;
        case "NumK":
          obj = handleNumK(
            resourceName,
            resourceData as NumKRaw[] | { obj?: NumKRaw[] } | undefined,
            hexData,
          );
          break;
        case "KeyF":
          obj = handleKeyF(
            resourceName,
            resourceData as KeyFRaw[] | { obj?: KeyFRaw[] } | undefined,
            resourceId,
            hexData,
          );
          break;
        case "Bone":
          obj = handleBone(
            resourceName,
            resourceData as
              | BoneRaw
              | { data?: string; name?: string }
              | undefined,
            resourceId,
            hexData,
          );
          break;
        case "AnHd":
          obj = handleAnHd(
            resourceName,
            resourceData as
              | AnHdRaw
              | { name?: string; order?: number }
              | undefined,
          );
          break;
        default:
          obj =
            (resourceData as { obj?: unknown })?.obj ?? hexData ?? resourceData;
      }

      const entry = {
        name: resourceName,
        order: resourceIdNum,
        obj,
      };

      if (typeName === "Hedr") result.Hedr[resourceId] = entry;
      else if (typeName === "Bone") result.Bone[resourceId] = entry;
      else if (typeName === "BonP") result.BonP[resourceId] = entry;
      else if (typeName === "BonN") result.BonN[resourceId] = entry;
      else if (typeName === "RelP") result.RelP![resourceId] = entry;
      else if (typeName === "AnHd") result.AnHd[resourceId] = entry;
      else if (typeName === "Evnt") result.Evnt[resourceId] = entry;
      else if (typeName === "NumK") result.NumK[resourceId] = entry;
      else if (typeName === "KeyF") result.KeyF[resourceId] = entry;
      else
        (result as unknown as Record<string, unknown>)[typeName] =
          typeData as unknown;
    }
  }

  return result;
}

/**
 * Parse skeleton resource synchronously using TypeScript parser
 */
export function parseSkeletonRsrcTS(bytes: ArrayBuffer): SkeletonResource {
  const parsed = parseSkeletonRsrcJson(bytes);
  return transformToSkeletonResource(parsed);
}

/**
 * Parse skeleton resource using Pyodide worker (async)
 * @param bytes Skeleton resource binary data
 * @param pyodideWorker Initialized Pyodide worker
 * @returns Promise resolving to parsed SkeletonResource
 */
export async function parseSkeletonRsrcPyodide(
  bytes: ArrayBuffer,
  pyodideWorker: Worker
): Promise<SkeletonResource> {
  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "save_to_json") {
        pyodideWorker.removeEventListener("message", handleMessage);
        pyodideWorker.removeEventListener("error", handleError);
        resolve(event.data.result as SkeletonResource);
      }
    };
    
    const handleError = (error: ErrorEvent) => {
      pyodideWorker.removeEventListener("message", handleMessage);
      pyodideWorker.removeEventListener("error", handleError);
      reject(error);
    };
    
    pyodideWorker.addEventListener("message", handleMessage);
    pyodideWorker.addEventListener("error", handleError);
    
    pyodideWorker.postMessage({
      type: "save_to_json",
      bytes,
      struct_specs: skeletonSpecs,
      include_types: [],
      exclude_types: [],
    });
  });
}

/**
 * Parse skeleton resource with configurable parser
 * @param bytes Skeleton resource binary data
 * @param options Parser options
 * @returns SkeletonResource (sync) or Promise<SkeletonResource> (async with Pyodide)
 */
export function parseSkeletonRsrc(
  bytes: ArrayBuffer,
  options?: {
    usePyodide?: boolean;
    pyodideWorker?: Worker;
  }
): SkeletonResource | Promise<SkeletonResource> {
  const usePyodide = options?.usePyodide ?? true; // Default to Pyodide
  
  if (usePyodide) {
    if (!options?.pyodideWorker) {
      throw new Error("Pyodide worker required when usePyodide is true");
    }
    return parseSkeletonRsrcPyodide(bytes, options.pyodideWorker);
  }
  
  return parseSkeletonRsrcTS(bytes);
}

export function parseSkeletonRsrcJson(bytes: ArrayBuffer): ParsedSkeleton {
  const uint8Array = new Uint8Array(bytes);
  const jsonString = saveToJson(uint8Array, skeletonSpecs, [], [], false);
  const parsed = JSON.parse(jsonString) as ParsedSkeleton;
  return parsed;
}
