import { plainObjectSchema } from "@/schemas/common";
import type { Nanosaur1LevelData } from "@/data/processors/classicProprocessor";
import type { MightyMikeMap } from "@/schemas/common";
import type { RawNanosaurItem, RawNanosaurAttribute } from "./nanosaurInterfaces";
import { z } from "zod";

function isTileValid(tile: unknown): boolean {
  const schema = z.object({
    rawValue: z.number(),
    tileIndex: z.number(),
  });
  return schema.safeParse(tile).success;
}

function isMapRowValid(row: unknown): boolean {
  return Array.isArray(row) && row.every(isTileValid);
}

/**
 * Type guard to check if an object is a valid Nanosaur1LevelData
 */
export function isNanosaur1LevelData(
  data: unknown,
): data is Nanosaur1LevelData {
  const result = plainObjectSchema.safeParse(data);
  if (!result.success) return false;
  const d = result.data;
  if (!("header" in d && "textureLayer" in d)) return false;
  if (!plainObjectSchema.safeParse(d.header).success) return false;
  if (!Array.isArray(d.textureLayer)) return false;
  if (
    d.textureLayer.length > 0 &&
    !d.textureLayer.every((v: unknown) => z.number().safeParse(v).success)
  )
    return false;
  return true;
}

/**
 * Type guard for RawNanosaurItem
 */
export function isRawNanosaurItem(item: unknown): item is RawNanosaurItem {
  const result = plainObjectSchema.safeParse(item);
  if (!result.success) return false;
  const i = result.data;
  return "type" in i && "x" in i;
}

/**
 * Type guard for RawNanosaurAttribute
 */
export function isRawNanosaurAttribute(
  attr: unknown,
): attr is RawNanosaurAttribute {
  const result = plainObjectSchema.safeParse(attr);
  if (!result.success) return false;
  return "bits" in result.data || "parm0" in result.data;
}

/**
 * Type guard for MightyMikeMap
 */
export function isMightyMikeMap(data: unknown): data is MightyMikeMap {
  const result = plainObjectSchema.safeParse(data);
  if (!result.success) return false;
  const d = result.data;
  if (
    !z.number().safeParse(d.mapWidth).success ||
    !z.number().safeParse(d.mapHeight).success
  )
    return false;
  if (!Array.isArray(d.mapImage)) return false;

  if (!d.mapImage.every(isMapRowValid)) return false;

  return true;
}

/**
 * Type guard for Record<string, unknown>
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return plainObjectSchema.safeParse(value).success;
}
