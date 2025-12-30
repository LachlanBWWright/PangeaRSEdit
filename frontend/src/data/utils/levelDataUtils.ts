import {
  LevelData,
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "../../python/structSpecs/LevelTypes";
import { Result, ok, err } from "../../types/result";

/**
 * Utility functions for combining and splitting level data between atomic types
 * and the complete LevelData structure for file I/O operations
 */

export interface AtomicLevelData {
  headerData: HeaderData | null;
  itemData: ItemData | null;
  liquidData: LiquidData | null;
  fenceData: FenceData | null;
  splineData: SplineData | null;
  terrainData: TerrainData | null;
}

/**
 * Split a complete LevelData into atomic data types
 */
export function splitLevelData(
  levelData: LevelData | null,
): AtomicLevelData {
  if (!levelData) {
    return {
      headerData: null,
      itemData: null,
      liquidData: null,
      fenceData: null,
      splineData: null,
      terrainData: null,
    };
  }

  // Extract atomic data types (guard against missing sub-objects)
  const headerData: HeaderData | null = levelData.Hedr
    ? { Hedr: levelData.Hedr }
    : null;

  const itemData: ItemData | null = levelData.Itms
    ? { Itms: levelData.Itms }
    : null;

  const liquidData: LiquidData | null = levelData.Liqd
    ? { Liqd: levelData.Liqd }
    : null;

  const fenceData: FenceData | null =
    levelData.Fenc && levelData.FnNb
      ? { Fenc: levelData.Fenc, FnNb: levelData.FnNb }
      : null;

  const splineData: SplineData | null =
    levelData.SpNb && levelData.SpPt && levelData.SpIt && levelData.Spln
      ? {
          SpNb: levelData.SpNb,
          SpPt: levelData.SpPt,
          SpIt: levelData.SpIt,
          Spln: levelData.Spln,
        }
      : null;

  // Extract terrain data (tiles, coordinates, etc.) - ensure all required parts exist
  // Note: Bugdom 1 uses Layr + Xlat instead of STgd, so we allow either
  const hasTerrainData =
    levelData.ItCo &&
    (levelData.STgd || levelData.Layr) && // Either STgd (most games) or Layr (Bugdom 1)
    levelData.YCrd &&
    levelData._metadata;

  const terrainData: TerrainData | null = hasTerrainData
    ? {
        Atrb: levelData.Atrb,
        Timg: levelData.Timg,
        ItCo: levelData.ItCo,
        Layr: levelData.Layr,
        STgd: levelData.STgd,
        YCrd: levelData.YCrd,
        alis: levelData.alis,
        _metadata: levelData._metadata,
        ...(levelData.Xlat !== undefined ? { Xlat: levelData.Xlat } : {}),
        ...(levelData.Vcol !== undefined ? { Vcol: levelData.Vcol } : {}),
      }
    : null;

  // Log which atomic fields are missing (null)
  console.log("splitLevelData: null status", {
    headerData: headerData === null,
    itemData: itemData === null,
    liquidData: liquidData === null,
    fenceData: fenceData === null,
    splineData: splineData === null,
    terrainData: terrainData === null,
  });

  return {
    headerData,
    itemData,
    liquidData,
    fenceData,
    splineData,
    terrainData,
  };
}

/**
 * Combine atomic data types back into a complete LevelData
 * Returns a Result instead of throwing
 */
export function combineLevelData(
  atomicData: AtomicLevelData,
): Result<LevelData, Error> {
  const {
    headerData,
    itemData,
    liquidData,
    fenceData,
    splineData,
    terrainData,
  } = atomicData;

  // Header and terrain are critical; optional sections (items, liquids, fences, splines)
  // are allowed to be missing and will simply not be included in the serialized output.
  if (!headerData || !terrainData) {
    return err(new Error("Cannot combine level data: critical header or terrain is missing"));
  }

  // Build combined LevelData progressively using spread
  // LevelData extends TerrainData and HeaderData, plus has optional Partial<> for other types
  const combined: LevelData = {
    ...terrainData,
    ...headerData,
    ...(itemData ?? {}),
    ...(liquidData ?? {}),
    ...(fenceData ?? {}),
    ...(splineData ?? {}),
  };

  return ok(combined);
}

/**
 * Check if all atomic data is available (not null)
 */
export function isAtomicDataComplete(atomicData: AtomicLevelData): boolean {
  return (
    atomicData.headerData !== null &&
    atomicData.itemData !== null &&
    atomicData.liquidData !== null &&
    atomicData.fenceData !== null &&
    atomicData.splineData !== null &&
    atomicData.terrainData !== null
  );
}

/**
 * Basic validation to ensure the object conforms to the minimal shape
 * expected by `rsrcdump.jsonio.json_to_resource_fork`, i.e. keys at
 * the top level that look like resource type names (length <= 4) map
 * to object/dict values where each resource id maps to a wrapper dict.
 */
export function validateResourceForkJson(json_blob: Record<string, unknown>):
  | { ok: true }
  | { ok: false; message: string; badKey?: string; badValueType?: string } {
  if (typeof json_blob !== "object" || json_blob === null || Array.isArray(json_blob)) {
    return { ok: false, message: "Top-level JSON blob must be an object" };
  }

  for (const [key, value] of Object.entries(json_blob)) {
    if (key.length <= 4) {
      if (value === undefined || value === null) {
        continue; // Optional/absent resource sections are allowed
      }
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return {
          ok: false,
          message: `Resource type key '${key}' must map to an object/dict of resource records`,
          badKey: key,
          badValueType: Array.isArray(value) ? "array" : typeof value,
        };
      }
      // Ensure each inner record maps to objects
      for (const [resId, resBlob] of Object.entries(value as Record<string, unknown>)) {
        if (typeof resBlob !== "object" || resBlob === null || Array.isArray(resBlob)) {
          return {
            ok: false,
            message: `Resource record '${resId}' under type '${key}' must be an object/dict`,
            badKey: key,
            badValueType: Array.isArray(resBlob) ? "array" : typeof resBlob,
          };
        }
      }
    }
  }

  return { ok: true };
}

/**
 * Return a shallow copy of the level data with any malformed resource sections removed,
 * so downstream validation/serialization doesn't fail on stray arrays or primitives.
 */
export function sanitizeResourceForkJson(data: unknown): Record<string, unknown> {
  if (typeof data !== "object" || data === null) {
    return {};
  }
  const source = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...source };
  for (const [key, value] of Object.entries(source)) {
    if (key.length > 4) continue;
    if (value === undefined || value === null) continue;
    if (typeof value !== "object" || Array.isArray(value)) {
      delete sanitized[key];
      continue;
    }
    const entry = value as Record<string, unknown>;
    for (const [resId, resVal] of Object.entries(entry)) {
      if (resVal === undefined || resVal === null) continue;
      if (typeof resVal !== "object" || Array.isArray(resVal)) {
        delete entry[resId];
      }
    }
  }
  return sanitized;
}
