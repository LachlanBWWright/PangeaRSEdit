import { Nanosaur1LevelData } from "@/data/processors/classicProprocessor";
import { MightyMikeMap } from "@/python/structSpecs/mightyMikeInterface";
import { RawNanosaurItem, RawNanosaurAttribute } from "./nanosaurInterfaces";

/**
 * Type guard to check if an object is a valid Nanosaur1LevelData
 */
export function isNanosaur1LevelData(
  data: unknown,
): data is Nanosaur1LevelData {
  if (!isRecord(data)) return false;
  const d = data; // narrowed by isRecord(data)
  if (!("header" in d && "textureLayer" in d)) return false;
  if (!isRecord(d.header)) return false;
  if (!Array.isArray(d.textureLayer)) return false;
  // textureLayer is a flat number[] (one tile-index per entry)
  if (
    d.textureLayer.length > 0 &&
    !d.textureLayer.every((v: unknown) => typeof v === "number")
  )
    return false;
  return true;
}

/**
 * Type guard for RawNanosaurItem
 */
export function isRawNanosaurItem(item: unknown): item is RawNanosaurItem {
  if (typeof item !== "object" || item === null) return false;
  const i = item;
  // We check for the specific field 'parm' which distinguishes it from standard TerrainItem
  // Nanosaur items must have 'type' and 'x'
  return "type" in i && "x" in i; // Basic check, we assume if it's in the list it's correct
}

/**
 * Type guard for RawNanosaurAttribute
 */
export function isRawNanosaurAttribute(
  attr: unknown,
): attr is RawNanosaurAttribute {
  if (typeof attr !== "object" || attr === null) return false;
  return "bits" in attr || "parm0" in attr;
}

/**
 * Type guard for MightyMikeMap
 */
export function isMightyMikeMap(data: unknown): data is MightyMikeMap {
  if (!isRecord(data)) return false;
  const d = data;
  if (typeof d.mapWidth !== "number" || typeof d.mapHeight !== "number")
    return false;
  if (!Array.isArray(d.mapImage)) return false;

  // mapImage should be a 2D array of tile value objects with numeric fields
  if (
    !d.mapImage.every(
      (row: unknown) =>
        Array.isArray(row) &&
        row.every((tile: unknown) => {
          if (!isRecord(tile)) return false;
          const t = tile; // narrowed by isRecord(tile)
          return (
            typeof t.rawValue === "number" && typeof t.tileIndex === "number"
          );
        }),
    )
  )
    return false;

  return true;
}

/**
 * Type guard for Record<string, unknown>
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
