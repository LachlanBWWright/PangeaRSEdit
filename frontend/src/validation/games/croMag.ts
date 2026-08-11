import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerCroMagSchema,
  metadataSchema,
  resourceEntrySchema,
  hexDataEntrySchema,
  itemSchema,
  tileAttributeSchema,
  supertileGridOttoSchema,
  checkpointSchema,
  pathDefinitionSchema,
  pathPointSchema,
} from "../levelDataSchemas";

// Cro-Mag Rally similar to Otto except header uses numPaths instead of numWaterPatches
export const croMagLevelSchema = z
  .object({
    _metadata: metadataSchema,
    Hedr: z.record(z.string(), resourceEntrySchema(headerCroMagSchema)),
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
    Path: z
      .record(z.string(), resourceEntrySchema(z.array(pathDefinitionSchema)))
      .optional(),
    PaPt: z
      .record(z.string(), resourceEntrySchema(z.array(pathPointSchema)))
      .optional(),
    CkPt: z
      .record(z.string(), resourceEntrySchema(z.array(checkpointSchema)))
      .optional(),
  })
  .passthrough();

export type CroMagLevelData = z.infer<typeof croMagLevelSchema>;

export function validateCroMagLevel(data: unknown) {
  return validateLevelData<CroMagLevelData>(data, croMagLevelSchema);
}
