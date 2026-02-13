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

// Type guard helper
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Type guard for LevelData - checks for required keys
export function isLevelDataLike(value: unknown): value is LevelData {
  if (!isRecord(value)) return false;
  // Hedr and _metadata are always required for a valid LevelData
  if (!("Hedr" in value) || !("_metadata" in value)) return false;
  // At least one terrain key must exist
  if (!("STgd" in value || "Layr" in value)) return false;
  // ItCo and YCrd are also required for terrain
  if (!("ItCo" in value) || !("YCrd" in value)) return false;
  return true;
}

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
export function splitLevelData(levelData: LevelData | null): AtomicLevelData {
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

  // Collect extra resource types not handled by named atomic sections
  // (e.g. Splt, Liqd hex data) so they survive the split/combine cycle
  const knownKeys = new Set([
    "Hedr",
    "Itms",
    "Liqd",
    "Fenc",
    "FnNb",
    "Spln",
    "SpNb",
    "SpPt",
    "SpIt",
    "Atrb",
    "Timg",
    "ItCo",
    "Layr",
    "STgd",
    "YCrd",
    "alis",
    "Xlat",
    "Vcol",
    "_metadata",
  ]);
  const extraResources: Record<string, unknown> = {};
  if (isRecord(levelData)) {
    for (const [key, value] of Object.entries(levelData)) {
      if (!knownKeys.has(key) && value !== undefined) {
        extraResources[key] = value;
      }
    }
  }

  const terrainData: TerrainData | null = hasTerrainData
    ? {
        Atrb: levelData.Atrb,
        Timg: levelData.Timg,
        ItCo: levelData.ItCo,
        Layr: levelData.Layr,
        STgd: levelData.STgd,
        YCrd: levelData.YCrd,
        alis: levelData.alis,
        _metadata: {
          ...levelData._metadata,
          ...(Object.keys(extraResources).length > 0
            ? { _extraResources: extraResources }
            : {}),
        },
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
    return err(
      new Error(
        "Cannot combine level data: critical header or terrain is missing",
      ),
    );
  }

  // Build combined object progressively, only including sections that exist
  const combined: Record<string, unknown> = {
    ...terrainData,
    ...headerData,
  };

  if (itemData) Object.assign(combined, itemData);
  if (liquidData) Object.assign(combined, liquidData);
  if (fenceData) Object.assign(combined, fenceData);
  if (splineData) Object.assign(combined, splineData);

  // Restore extra resource types preserved in _metadata._extraResources
  if (isRecord(combined._metadata)) {
    const metadata = combined._metadata;
    const extra = metadata._extraResources;
    if (isRecord(extra)) {
      for (const [key, value] of Object.entries(extra)) {
        if (!(key in combined) && value !== undefined) {
          combined[key] = value;
        }
      }
      Reflect.deleteProperty(metadata, "_extraResources");
    }
  }

  // Validate and return as LevelData
  if (isLevelDataLike(combined)) {
    return ok(combined);
  }
  return err(new Error("Combined data is not valid LevelData"));
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

export interface ResourceForkValidationError {
  message: string;
  badKey?: string;
  badValueType?: string;
}

/**
 * Basic validation to ensure the object conforms to the minimal shape
 * expected by `rsrcdump.jsonio.json_to_resource_fork`, i.e. keys at
 * the top level that look like resource type names (length <= 4) map
 * to object/dict values where each resource id maps to a wrapper dict.
 */
export function validateResourceForkJson(
  json_blob: Record<string, unknown>,
): Result<void, ResourceForkValidationError> {
  if (!isRecord(json_blob)) {
    return err({ message: "Top-level JSON blob must be an object" });
  }
  for (const [key, value] of Object.entries(json_blob)) {
    if (key.length <= 4) {
      if (value === undefined || value === null) {
        continue; // Optional/absent resource sections are allowed
      }
      if (!isRecord(value)) {
        return err({
          message: `Resource type key '${key}' must map to an object/dict of resource records`,
          badKey: key,
          badValueType: Array.isArray(value) ? "array" : typeof value,
        });
      }
      // Ensure each inner record maps to objects
      for (const [resId, resBlob] of Object.entries(value)) {
        if (!isRecord(resBlob)) {
          return err({
            message: `Resource record '${resId}' under type '${key}' must be an object/dict`,
            badKey: key,
            badValueType: Array.isArray(resBlob) ? "array" : typeof resBlob,
          });
        }
        // Optionally: check for required fields in resource records (e.g., 'obj', 'name', 'order')
        if (!("obj" in resBlob)) {
          return err({
            message: `Resource record '${resId}' under type '${key}' is missing required 'obj' field`,
            badKey: key,
            badValueType: "missing_obj",
          });
        }
      }
    }
  }
  return ok(undefined);
}

/**
 * Return a shallow copy of the level data with any malformed resource sections removed,
 * so downstream validation/serialization doesn't fail on stray arrays or primitives.
 * Also removes resource types with empty arrays (rsrcdump-ts throws on 0 resources).
 */
export function sanitizeResourceForkJson(
  data: unknown,
): Record<string, unknown> {
  if (!isRecord(data)) {
    return {};
  }
  const source = data;
  const sanitized: Record<string, unknown> = {};
  if ("_metadata" in source) {
    sanitized._metadata = source._metadata;
  }
  for (const [key, value] of Object.entries(source)) {
    if (key === "_metadata") {
      continue;
    }
    if (key.length > 4) {
      continue;
    }
    if (value === undefined || value === null) {
      continue;
    }
    if (!isRecord(value)) {
      continue;
    }
    const entry = value;
    const cleanedEntry: Record<string, unknown> = {};
    for (const [resId, resVal] of Object.entries(entry)) {
      if (resVal === undefined || resVal === null) {
        continue;
      }
      if (!isRecord(resVal)) {
        continue;
      }
      // Check if the resource entry has a non-empty obj array
      const obj = resVal.obj;
      if (!Array.isArray(obj)) {
        continue;
      }
      if (obj.length === 0) {
        // Skip empty array resources - rsrcdump throws on 0 resources
        continue;
      }
      cleanedEntry[resId] = resVal;
    }
    // If all resources in this type were empty, remove the entire type
    if (Object.keys(cleanedEntry).length > 0) {
      sanitized[key] = cleanedEntry;
    }
  }
  return sanitized;
}
