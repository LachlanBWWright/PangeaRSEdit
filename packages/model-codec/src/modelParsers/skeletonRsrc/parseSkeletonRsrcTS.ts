import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import { Result, ResultAsync, err, errAsync, ok } from "neverthrow";
import { z } from "zod";
import { mapCodecError } from "../../schemas/common";
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
import type { HedrRaw, AnHdRaw } from "./rawTypes";
export type { HedrRaw, BoneRaw, BonPRaw, BonNRaw, RelPRaw, AnHdRaw, EvntRaw, NumKRaw, KeyFRaw } from "./rawTypes";

// Types derived from `skeletonSpecs` (approximate, shaped to the saveToJson output)
type ResourceMap = Record<string, { name?: string; data?: string; obj?: unknown }>;

export interface ParsedSkeleton {
  _metadata?: Record<string, unknown>;
  Hedr?: ResourceMap;
  Bone?: ResourceMap;
  BonP?: ResourceMap;
  BonN?: ResourceMap;
  RelP?: ResourceMap;
  AnHd?: ResourceMap;
  Evnt?: ResourceMap;
  NumK?: ResourceMap;
  KeyF?: ResourceMap;
  Nams?: ResourceMap;
  Bnds?: ResourceMap;
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
    const entries = z.record(z.string(), z.unknown()).safeParse(typeData);
    if (!entries.success) continue;
    for (const [resourceId, resourceValue] of Object.entries(entries.data)) {
      const entry = resourceEntrySchema.safeParse(resourceValue);
      if (!entry.success) continue;
      const resourceData = entry.data;
      const resourceIdNum = parseInt(resourceId, 10);
      const resourceName = resourceData?.name || `Resource_${resourceId}`;
      const hexData = resourceData?.data || "";

      // Assign entries to their proper typed records
      // Each handler returns the correctly typed object
      if (typeName === "Hedr") {
        // Hedr should be parsed from structured fields only.
        const hedrObj = resourceData?.obj ?? resourceData;
        const header = headerSchema.safeParse(hedrObj);
        if (header.success) {
          result.Hedr[resourceId] = {
            name: resourceName,
            order: resourceIdNum,
            obj: header.data,
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

const headerSchema = z.object({
  version: z.number(), numAnims: z.number(), numJoints: z.number(),
  num3DMFLimbs: z.number(),
});
const resourceEntrySchema = z.object({
  name: z.string().optional(), data: z.string().optional(), obj: z.unknown().optional(),
}).passthrough();
const rawSkeletonSchema = z.record(z.string(), z.unknown()).refine(
  (value) => ["Hedr", "Bone", "BonP", "BonN", "RelP", "AnHd", "Evnt", "NumK", "KeyF", "Nams", "Bnds"].some((key) => key in value),
  "Invalid skeleton structure",
);

export function parseSkeletonRsrcResult(bytes: ArrayBuffer): ResultAsync<SkeletonResource, string> {
  return parseSkeletonRsrcJsonResult(bytes).map(transformToSkeletonResource);
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

function normalizeResource(resourceType: string, raw: z.infer<typeof resourceEntrySchema>) {
  if (resourceType === "AnHd") {
    const animation = z.object({ animName: z.string(), numAnimEvents: z.number() }).safeParse(raw.obj);
    if (animation.success) {
      raw.obj = { ...animation.data, animName: decodePascalHexString(animation.data.animName) };
      return raw;
    }
  }
  if (raw.obj !== undefined || raw.data === undefined) return raw;
  const fallback = resourceType === "Hedr" ? parseHedrFallback(raw.data)
    : resourceType === "AnHd" ? parseAnHdFallback(raw.data) : undefined;
  if (fallback) {
    raw.obj = fallback;
    delete raw.data;
    delete raw.conversion_error;
  }
  return raw;
}

function parseSkeletonJson(json: string): Result<ParsedSkeleton, string> {
  const decoded = Result.fromThrowable((text: string): unknown => JSON.parse(text), mapCodecError)(json);
  if (decoded.isErr()) return err(decoded.error);
  const validated = rawSkeletonSchema.safeParse(decoded.value);
  if (!validated.success) return err("Invalid skeleton structure");
  const parsed: ParsedSkeleton = {};
  for (const [resourceType, value] of Object.entries(validated.data)) {
    if (resourceType === "_metadata") {
      const metadata = z.record(z.string(), z.unknown()).safeParse(value);
      if (metadata.success) parsed._metadata = metadata.data;
      continue;
    }
    const entries = z.record(z.string(), resourceEntrySchema).safeParse(value);
    if (!entries.success) return err(`Invalid skeleton resources: ${resourceType}`);
    parsed[resourceType] = Object.fromEntries(Object.entries(entries.data).map(
      ([id, entry]) => [id, normalizeResource(resourceType, entry)],
    ));
  }
  return ok(parsed);
}

export function parseSkeletonRsrcJsonResult(bytes: ArrayBuffer): ResultAsync<ParsedSkeleton, string> {
  const invoke = Result.fromThrowable(
    () => saveToJson(new Uint8Array(bytes), skeletonSpecs, [], []), mapCodecError,
  )();
  if (invoke.isErr()) return errAsync(invoke.error);
  return ResultAsync.fromPromise(invoke.value, mapCodecError)
    .andThen((result) => result.ok ? parseSkeletonJson(result.value) : err(String(result.error)));
}
