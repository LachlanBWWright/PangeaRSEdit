import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerBugdom1Schema,
  itemSchema,
  metadataSchema,
  resourceEntrySchema,
  hexDataEntrySchema,
  fenceSchema,
  fenceNubSchema,
  splineSchema,
  splineNubSchema,
  splinePointSchema,
  splineItemSchema,
  liquidSchema,
  supertileGridOttoSchema,
  tileAttributeSchema,
} from "../levelDataSchemas";

// Bugdom 1 level validation - uses Layr and tile images are
// stored in resource fork entries. Uses STgd with isEmpty flag.
// Header has numTilePages/numTiles but NO numUniqueSupertiles/numWaterPatches/numCheckpoints
export const bugdomLevelSchema = z
  .object({
    _metadata: metadataSchema,
    Hedr: z.record(z.string(), resourceEntrySchema(headerBugdom1Schema)),
    Layr: z
      .record(z.string(), resourceEntrySchema(z.array(z.number())))
      .optional(),
    STgd: z
      .record(z.string(), resourceEntrySchema(z.array(supertileGridOttoSchema)))
      .optional(),
    Timg: z.record(z.string(), hexDataEntrySchema).optional(),
    Atrb: z
      .record(z.string(), resourceEntrySchema(z.array(tileAttributeSchema)))
      .optional(),
    Itms: z
      .record(z.string(), resourceEntrySchema(z.array(itemSchema)))
      .optional(),
    YCrd: z.record(z.string(), resourceEntrySchema(z.array(z.number()))).optional(),
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
  })
  .passthrough();

export type BugdomLevelData = z.infer<typeof bugdomLevelSchema>;

export function validateBugdomLevel(data: unknown) {
  return validateLevelData<BugdomLevelData>(data, bugdomLevelSchema);
}
