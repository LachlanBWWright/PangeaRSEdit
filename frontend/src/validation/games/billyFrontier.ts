import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerSimplifiedSchema,
  metadataSchema,
  resourceEntrySchema,
  hexDataEntrySchema,
  itemSchema,
  supertileGridSimplifiedSchema,
  tileAttributeSchema,
  fenceSchema,
  fenceNubSchema,
  liquidSchema,
  splineSchema,
  splineNubSchema,
  splinePointSchema,
  splineItemSchema,
  checkpointSchema,
} from "../levelDataSchemas";

// Billy Frontier uses simplified header (no numTilePages/numTiles) and simplified STgd (no isEmpty)
export const billyFrontierLevelSchema = z
  .object({
    _metadata: metadataSchema,
    Hedr: z.record(z.string(), resourceEntrySchema(headerSimplifiedSchema)),
    STgd: z
      .record(z.string(), resourceEntrySchema(z.array(supertileGridSimplifiedSchema)))
      .optional(),
    Timg: z.record(z.string(), hexDataEntrySchema).optional(),
    Atrb: z
      .record(z.string(), resourceEntrySchema(z.array(tileAttributeSchema)))
      .optional(),
    Itms: z
      .record(z.string(), resourceEntrySchema(z.array(itemSchema)))
      .optional(),
    Layr: z
      .record(z.string(), resourceEntrySchema(z.array(z.number())))
      .optional(),
    YCrd: z.record(z.string(), resourceEntrySchema(z.array(z.number()))).optional(),
    CkPt: z
      .record(z.string(), resourceEntrySchema(z.array(checkpointSchema)))
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
    Fenc: z
      .record(z.string(), resourceEntrySchema(z.array(fenceSchema)))
      .optional(),
    FnNb: z
      .record(z.string(), resourceEntrySchema(z.array(fenceNubSchema)))
      .optional(),
    Liqd: z
      .record(z.string(), resourceEntrySchema(z.array(liquidSchema)))
      .optional(),
  })
  .passthrough();

export type BillyFrontierLevelData = z.infer<typeof billyFrontierLevelSchema>;

export function validateBillyFrontierLevel(data: unknown) {
  return validateLevelData<BillyFrontierLevelData>(
    data,
    billyFrontierLevelSchema,
  );
}
