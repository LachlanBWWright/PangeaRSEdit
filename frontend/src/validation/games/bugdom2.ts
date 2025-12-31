import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerSimplifiedSchema,
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
  tileAttributeSchema,
} from "../levelDataSchemas";

// Bugdom 2 uses simplified header (no numTilePages/numTiles) and simplified STgd (no isEmpty)
export const bugdom2LevelSchema = z
  .object({
    _metadata: metadataSchema,
    Hedr: z.record(z.string(), resourceEntrySchema(headerSimplifiedSchema)),
    STgd: z
      .record(
        z.string(),
        resourceEntrySchema(z.array(supertileGridSimplifiedSchema)),
      )
      .optional(),
    Timg: z.record(z.string(), hexDataEntrySchema).optional(),
    Atrb: z
      .record(z.string(), resourceEntrySchema(z.array(tileAttributeSchema)))
      .optional(),
    Layr: z
      .record(z.string(), resourceEntrySchema(z.array(z.number())))
      .optional(),
    YCrd: z
      .record(z.string(), resourceEntrySchema(z.array(z.number())))
      .optional(),
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
  .loose();

export type Bugdom2LevelData = z.infer<typeof bugdom2LevelSchema>;

export function validateBugdom2Level(data: unknown) {
  return validateLevelData<Bugdom2LevelData>(data, bugdom2LevelSchema);
}
