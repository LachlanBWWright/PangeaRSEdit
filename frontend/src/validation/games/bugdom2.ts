import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerFullSchema,
  metadataSchema,
  resourceEntrySchema,
  hexDataEntrySchema,
  itemSchema,
  fenceSchema,
  fenceNubSchema,
  splineSchema,
  splineNubSchema,
  splinePointSchema,
  splineItemSchema,
  liquidSchema,
  checkpointSchema,
  supertileGridSimplifiedSchema,
} from "../levelDataSchemas";

// Bugdom 2 uses a -1 sentinel in STgd and nearly identical structure to Otto
export const bugdom2LevelSchema = z
  .object({
    _metadata: metadataSchema,
    Hedr: z.record(z.string(), resourceEntrySchema(headerFullSchema)),
    STgd: z
      .record(
        z.string(),
        resourceEntrySchema(z.array(supertileGridSimplifiedSchema)),
      )
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

export type Bugdom2LevelData = z.infer<typeof bugdom2LevelSchema>;

export function validateBugdom2Level(data: unknown) {
  return validateLevelData<Bugdom2LevelData>(data, bugdom2LevelSchema);
}
