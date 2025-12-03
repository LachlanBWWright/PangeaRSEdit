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

/** Schema for header (full format with numTilePages/numTiles) */
export const headerFullSchema = z.object({
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
export type HeaderFull = z.infer<typeof headerFullSchema>;

/** Schema for header (simplified format without numTilePages/numTiles) */
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

/** Schema for CroMag header (uses numPaths instead of numWaterPatches) */
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

/** Schema for supertile grid (Otto format with isEmpty flag) */
export const supertileGridOttoSchema = z.object({
  isEmpty: z.boolean(),
  superTileId: z.number(),
  padByte: z.string().optional(),
});
export type SupertileGridOtto = z.infer<typeof supertileGridOttoSchema>;

/** Schema for supertile grid (simplified format, -1 = empty) */
export const supertileGridSimplifiedSchema = z.object({
  superTileId: z.number(),
});
export type SupertileGridSimplified = z.infer<typeof supertileGridSimplifiedSchema>;

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
export const metadataSchema = z.object({
  file_attributes: z.number(),
  junk1: z.number(),
  junk2: z.number(),
});
export type Metadata = z.infer<typeof metadataSchema>;

// ============================================================================
// Resource Entry Schemas
// ============================================================================

/** Create a resource entry schema with a specific object schema */
function resourceEntrySchema<T extends z.ZodTypeAny>(objSchema: T) {
  return z.object({
    name: z.string().optional(),
    obj: objSchema,
    order: z.number().optional(),
  });
}

/** Create a hex data resource entry schema */
const hexDataEntrySchema = z.object({
  name: z.string().optional(),
  data: z.string(),
  order: z.number().optional(),
});

// ============================================================================
// Level Data Schemas
// ============================================================================

/** Schema for Otto Matic level data */
export const ottoMaticLevelSchema = z.object({
  _metadata: metadataSchema,
  
  // Header (required)
  Hedr: z.record(z.string(), resourceEntrySchema(headerFullSchema)),
  
  // Terrain data (required)
  Atrb: z.record(z.string(), resourceEntrySchema(z.array(tileAttributeSchema))),
  ItCo: z.record(z.string(), hexDataEntrySchema),
  YCrd: z.record(z.string(), resourceEntrySchema(z.array(z.number()))),
  alis: z.record(z.string(), hexDataEntrySchema),
  
  // Optional terrain data
  Layr: z.record(z.string(), resourceEntrySchema(z.array(z.number()))).optional(),
  STgd: z.record(z.string(), resourceEntrySchema(z.array(supertileGridOttoSchema))).optional(),
  Timg: z.record(z.string(), hexDataEntrySchema).optional(),
  Xlat: z.record(z.string(), resourceEntrySchema(z.array(z.object({ idx: z.number() })))).optional(),
  Vcol: z.record(z.string(), hexDataEntrySchema).optional(),
  
  // Items (optional)
  Itms: z.record(z.string(), resourceEntrySchema(z.array(itemSchema))).optional(),
  
  // Fences (optional)
  Fenc: z.record(z.string(), resourceEntrySchema(z.array(fenceSchema))).optional(),
  FnNb: z.record(z.string(), resourceEntrySchema(z.array(fenceNubSchema))).optional(),
  
  // Splines (optional)
  Spln: z.record(z.string(), resourceEntrySchema(z.array(splineSchema))).optional(),
  SpNb: z.record(z.string(), resourceEntrySchema(z.array(splineNubSchema))).optional(),
  SpPt: z.record(z.string(), resourceEntrySchema(z.array(splinePointSchema))).optional(),
  SpIt: z.record(z.string(), resourceEntrySchema(z.array(splineItemSchema))).optional(),
  
  // Liquids (optional)
  Liqd: z.record(z.string(), resourceEntrySchema(z.array(liquidSchema))).optional(),
  
  // Checkpoints (optional)
  CkPt: z.record(z.string(), resourceEntrySchema(z.array(checkpointSchema))).optional(),
}).passthrough(); // Allow additional properties we might not know about

export type OttoMaticLevelData = z.infer<typeof ottoMaticLevelSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate level data using Zod safeParse
 * Returns a Result type instead of throwing
 */
export function validateLevelData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): Result<T, Error> {
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  const errorMessage = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  return err(new Error(`Level data validation failed:\n${errorMessage}`));
}

/**
 * Validate Otto Matic level data
 */
export function validateOttoMaticLevel(data: unknown): Result<OttoMaticLevelData, Error> {
  return validateLevelData<OttoMaticLevelData>(data, ottoMaticLevelSchema);
}

/**
 * Validate a header
 */
export function validateHeader(data: unknown, simplified: boolean = false): Result<HeaderFull | HeaderSimplified, Error> {
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
export function validateItems(data: unknown): Result<Item[], Error> {
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
export function validateFences(data: unknown): Result<Fence[], Error> {
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
export function validateSplines(data: unknown): Result<Spline[], Error> {
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
export function validateLiquids(data: unknown): Result<Liquid[], Error> {
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
export function validateTileAttributes(data: unknown): Result<TileAttribute[], Error> {
  const schema = z.array(tileAttributeSchema);
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(new Error(`Tile attributes validation failed: ${result.error.message}`));
}

/**
 * Partial validation - validates what's present without requiring all fields
 */
export function validatePartialLevelData(data: unknown): Result<Partial<OttoMaticLevelData>, Error> {
  const partialSchema = ottoMaticLevelSchema.partial();
  const result = partialSchema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(new Error(`Partial level data validation failed: ${result.error.message}`));
}
