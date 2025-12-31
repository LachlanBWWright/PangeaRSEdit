/**
 * Zod schemas for validating level data
 *
 * These schemas ensure that parsed level data matches the expected types exactly.
 * All validation uses safeParse to return Result types instead of throwing.
 */

import { z } from "zod";
import { Result, ok, err } from "../types/result";

// ============================================================================
// Base Type Schemas
// ============================================================================

/** Schema for tile attributes */
export const tileAttributeSchema = z.object({
  flags: z.number(),
  p0: z.number(),
  p1: z.number(),
});
export type TileAttribute = z.infer<typeof tileAttributeSchema>;

/** Schema for fence nub [x, y] */
export const fenceNubSchema = z.tuple([z.number(), z.number()]);
export type FenceNub = z.infer<typeof fenceNubSchema>;

/** Schema for fence definition */
export const fenceSchema = z.object({
  fenceType: z.number(),
  numNubs: z.number(),
  junkNubListPtr: z.number(),
  bbTop: z.number(),
  bbBottom: z.number(),
  bbLeft: z.number(),
  bbRight: z.number(),
});
export type Fence = z.infer<typeof fenceSchema>;

/** 
 * Schema for Otto Matic header (full format with numTilePages/numTiles)
 * Used by: Otto Matic
 */
export const headerOttoMaticSchema = z.object({
  version: z.number(),
  numItems: z.number(),
  mapWidth: z.number(),
  mapHeight: z.number(),
  numTilePages: z.number(),
  numTiles: z.number(),
  tileSize: z.number(),
  minY: z.number(),
  maxY: z.number(),
  numSplines: z.number(),
  numFences: z.number(),
  numUniqueSupertiles: z.number(),
  numWaterPatches: z.number(),
  numCheckpoints: z.number(),
});
export type HeaderOttoMatic = z.infer<typeof headerOttoMaticSchema>;

// Alias for backward compatibility
export const headerFullSchema = headerOttoMaticSchema;
export type HeaderFull = HeaderOttoMatic;

/** 
 * Schema for Bugdom 1 header (has numTilePages/numTiles but NO numUniqueSupertiles/numWaterPatches/numCheckpoints)
 * Used by: Bugdom 1
 */
export const headerBugdom1Schema = z.object({
  version: z.number(),
  numItems: z.number(),
  mapWidth: z.number(),
  mapHeight: z.number(),
  numTilePages: z.number(),
  numTiles: z.number(),
  tileSize: z.number(),
  minY: z.number(),
  maxY: z.number(),
  numSplines: z.number(),
  numFences: z.number(),
});
export type HeaderBugdom1 = z.infer<typeof headerBugdom1Schema>;

/** 
 * Schema for simplified header (without numTilePages/numTiles)
 * Used by: Bugdom 2, Nanosaur 2, Billy Frontier
 */
export const headerSimplifiedSchema = z.object({
  version: z.number(),
  numItems: z.number(),
  mapWidth: z.number(),
  mapHeight: z.number(),
  tileSize: z.number(),
  minY: z.number(),
  maxY: z.number(),
  numSplines: z.number(),
  numFences: z.number(),
  numUniqueSupertiles: z.number(),
  numWaterPatches: z.number(),
  numCheckpoints: z.number(),
});
export type HeaderSimplified = z.infer<typeof headerSimplifiedSchema>;

/** 
 * Schema for CroMag header (uses numPaths instead of numWaterPatches)
 * Used by: Cro-Mag Rally
 */
export const headerCroMagSchema = z.object({
  version: z.number(),
  numItems: z.number(),
  mapWidth: z.number(),
  mapHeight: z.number(),
  numTilePages: z.number(),
  numTiles: z.number(),
  tileSize: z.number(),
  minY: z.number(),
  maxY: z.number(),
  numSplines: z.number(),
  numFences: z.number(),
  numUniqueSupertiles: z.number(),
  numPaths: z.number(),
  numCheckpoints: z.number(),
});
export type HeaderCroMag = z.infer<typeof headerCroMagSchema>;

/** Schema for terrain item (32-bit coordinates) */
export const itemSchema = z.object({
  x: z.number(),
  z: z.number(),
  type: z.number(),
  flags: z.number(),
  p0: z.number(),
  p1: z.number(),
  p2: z.number(),
  p3: z.number(),
});
export type Item = z.infer<typeof itemSchema>;

/** Schema for liquid/water body */
export const liquidSchema = z.object({
  bBoxBottom: z.number(),
  bBoxLeft: z.number(),
  bBoxRight: z.number(),
  bBoxTop: z.number(),
  flags: z.number(),
  height: z.number(),
  hotSpotX: z.number(),
  hotSpotZ: z.number(),
  numNubs: z.number(),
  reserved: z.number(),
  type: z.number(),
  nubs: z.array(z.tuple([z.number(), z.number()])),
});
export type Liquid = z.infer<typeof liquidSchema>;

/** 
 * Schema for supertile grid (Otto format with isEmpty flag)
 * Used by: Otto Matic, Bugdom 1, Cro-Mag Rally
 */
export const supertileGridOttoSchema = z.object({
  isEmpty: z.boolean(),
  superTileId: z.number(),
  padByte: z.string().optional(),
});
export type SupertileGridOtto = z.infer<typeof supertileGridOttoSchema>;

/** 
 * Schema for supertile grid (simplified format, -1 = empty)
 * Used by: Bugdom 2, Nanosaur 2, Billy Frontier
 */
export const supertileGridSimplifiedSchema = z.object({
  superTileId: z.number(),
});
export type SupertileGridSimplified = z.infer<
  typeof supertileGridSimplifiedSchema
>;

/** Schema for spline nub */
export const splineNubSchema = z.object({
  x: z.number(),
  z: z.number(),
});
export type SplineNub = z.infer<typeof splineNubSchema>;

/** Schema for spline point */
export const splinePointSchema = z.object({
  x: z.number(),
  z: z.number(),
});
export type SplinePoint = z.infer<typeof splinePointSchema>;

/** Schema for spline item */
export const splineItemSchema = z.object({
  flags: z.number(),
  p0: z.number(),
  p1: z.number(),
  p2: z.number(),
  p3: z.number(),
  placement: z.number(),
  type: z.number(),
});
export type SplineItem = z.infer<typeof splineItemSchema>;

/** Schema for spline definition */
export const splineSchema = z.object({
  bbBottom: z.number(),
  bbLeft: z.number(),
  bbRight: z.number(),
  bbTop: z.number(),
  numItems: z.number(),
  numNubs: z.number(),
  numPoints: z.number(),
});
export type Spline = z.infer<typeof splineSchema>;

/** Schema for checkpoint/line marker */
export const checkpointSchema = z.object({
  unused: z.number(),
  infoBits: z.number(),
  x1: z.number(),
  x2: z.number(),
  z1: z.number(),
  z2: z.number(),
});
export type Checkpoint = z.infer<typeof checkpointSchema>;

/** Schema for metadata */
export const metadataSchema = z
  .object({
    file_attributes: z.number(),
    junk1: z.number(),
    junk2: z.number(),
  })
  .loose();
export type Metadata = z.infer<typeof metadataSchema>;

// ============================================================================
// Resource Entry Schemas
// ============================================================================

/** Create a resource entry schema with a specific object schema */
export function resourceEntrySchema<T extends z.ZodType>(objSchema: T) {
  return z.object({
    name: z.string().optional(),
    obj: objSchema,
    order: z.number().optional(),
  });
}

/** Create a hex data resource entry schema */
export const hexDataEntrySchema = z.object({
  name: z.string().optional(),
  data: z.string(),
  order: z.number().optional(),
});

// ============================================================================
// Level Data Schema helpers and notes
//
// Per-game level schemas (e.g. Otto Matic, Bugdom, Nanosaur) should live under
// `frontend/src/validation/games/*` and import the shared base types from this
// file. Keep this file focused on shared base types and generic validators.
// ============================================================================

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate level data using Zod safeParse
 * Returns a Result type instead of throwing
 */
export function validateLevelData<T>(
  data: unknown,
  schema: z.ZodType<T>,
): Result<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  const errorMessage = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  return err(new Error(`Level data validation failed:\n${errorMessage}`));
}

// Per-game level validation functions live in `src/validation/games/*` and
// should import shared helpers and base schemas from this file.

/**
 * Validate a header
 */
export function validateHeader(
  data: unknown,
  simplified: boolean = false,
): Result<HeaderFull | HeaderSimplified> {
  const schema = simplified ? headerSimplifiedSchema : headerFullSchema;
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(new Error(`Header validation failed: ${result.error.message}`));
}

/**
 * Validate items array
 */
export function validateItems(data: unknown): Result<Item[]> {
  const schema = z.array(itemSchema);
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(new Error(`Items validation failed: ${result.error.message}`));
}

/**
 * Validate fences array
 */
export function validateFences(data: unknown): Result<Fence[]> {
  const schema = z.array(fenceSchema);
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(new Error(`Fences validation failed: ${result.error.message}`));
}

/**
 * Validate splines array
 */
export function validateSplines(data: unknown): Result<Spline[]> {
  const schema = z.array(splineSchema);
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(new Error(`Splines validation failed: ${result.error.message}`));
}

/**
 * Validate liquids array
 */
export function validateLiquids(data: unknown): Result<Liquid[]> {
  const schema = z.array(liquidSchema);
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(new Error(`Liquids validation failed: ${result.error.message}`));
}

/**
 * Validate tile attributes array
 */
export function validateTileAttributes(
  data: unknown,
): Result<TileAttribute[]> {
  const schema = z.array(tileAttributeSchema);
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(
    new Error(`Tile attributes validation failed: ${result.error.message}`),
  );
}

/**
 * Partial validation - validates what's present without requiring all fields
 * Note: This function uses permissive validation.
 * For strict validation, use the specific game schema directly.
 */
export function validatePartialLevelDataForSchema(
  data: unknown,
): Result<unknown> {
  // Since partial() isn't universally available on all Zod types,
  // we simply validate that data is an object and return it
  if (typeof data !== "object" || data === null) {
    return err(new Error("Partial level data must be an object"));
  }
  return ok(data);
}
