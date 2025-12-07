import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerFullSchema,
  metadataSchema,
  resourceEntrySchema,
  hexDataEntrySchema,
  itemSchema,
  supertileGridOttoSchema,
  tileAttributeSchema,
} from "../levelDataSchemas";

// Nanosaur 2 uses full header and STgd entries with isEmpty like Otto
export const nanosaur2LevelSchema = z
  .object({
    _metadata: metadataSchema,
    Hedr: z.record(z.string(), resourceEntrySchema(headerFullSchema)),
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
  })
  .passthrough();

export type Nanosaur2LevelData = z.infer<typeof nanosaur2LevelSchema>;

export function validateNanosaur2Level(data: unknown) {
  return validateLevelData<Nanosaur2LevelData>(data, nanosaur2LevelSchema);
}

export default nanosaur2LevelSchema;
