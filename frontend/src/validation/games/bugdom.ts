import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerFullSchema,
  itemSchema,
  metadataSchema,
  resourceEntrySchema,
  hexDataEntrySchema,
  tileAttributeSchema,
  fenceSchema,
  fenceNubSchema,
  splineSchema,
  splineNubSchema,
  splinePointSchema,
  splineItemSchema,
  liquidSchema,
  checkpointSchema,
} from "../levelDataSchemas";

// Minimal Bugdom (1) level validation - Bugdom uses Layr and tile images are
// stored in resource fork entries. This schema is intentionally permissive
// using `passthrough()` so non-validated properties are allowed.
export const bugdomLevelSchema = z
  .object({
    _metadata: metadataSchema,
    Hedr: z.record(z.string(), resourceEntrySchema(headerFullSchema)),
    Layr: z
      .record(z.string(), resourceEntrySchema(z.array(z.number())))
      .optional(),
    Timg: z.record(z.string(), hexDataEntrySchema).optional(),
    Itms: z
      .record(z.string(), resourceEntrySchema(z.array(itemSchema)))
      .optional(),
    Fenc: z
      .record(z.string(), resourceEntrySchema(z.array(fenceSchema)))
      .optional(),
    FnNb: z
      .record(z.string(), resourceEntrySchema(z.array(fenceNubSchema)))
      .optional(),
    Spln: z
      .record(z.string(), resourceEntrySchema(z.array(splineSchema)))
      .optional(),
    SpNb: z
      .record(z.string(), resourceEntrySchema(z.array(splineNubSchema)))
      .optional(),
    SpPt: z
      .record(z.string(), resourceEntrySchema(z.array(splinePointSchema)))
      .optional(),
    SpIt: z
      .record(z.string(), resourceEntrySchema(z.array(splineItemSchema)))
      .optional(),
    Liqd: z
      .record(z.string(), resourceEntrySchema(z.array(liquidSchema)))
      .optional(),
    CkPt: z
      .record(z.string(), resourceEntrySchema(z.array(checkpointSchema)))
      .optional(),
  })
  .passthrough();

export type BugdomLevelData = z.infer<typeof bugdomLevelSchema>;

export function validateBugdomLevel(data: unknown) {
  return validateLevelData<BugdomLevelData>(data, bugdomLevelSchema);
}

export default bugdomLevelSchema;
