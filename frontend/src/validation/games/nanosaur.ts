import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerSimplifiedSchema,
  metadataSchema,
  resourceEntrySchema,
  hexDataEntrySchema,
  itemSchema,
  tileAttributeSchema,
  supertileGridSimplifiedSchema,
} from "../levelDataSchemas";

// Nanosaur (TRT) minimal schema - uses Layr-like arrays but we map to Otto-compatible
export const nanosaurLevelSchema = z
  .object({
    _metadata: metadataSchema,
    Hedr: z.record(z.string(), resourceEntrySchema(headerSimplifiedSchema)),
    Layr: z
      .record(z.string(), resourceEntrySchema(z.array(z.number())))
      .optional(),
    STgd: z
      .record(
        z.string(),
        resourceEntrySchema(z.array(supertileGridSimplifiedSchema)),
      )
      .optional(),
    Atrb: z
      .record(z.string(), resourceEntrySchema(z.array(tileAttributeSchema)))
      .optional(),
    Itms: z
      .record(z.string(), resourceEntrySchema(z.array(itemSchema)))
      .optional(),
    Timg: z.record(z.string(), hexDataEntrySchema).optional(),
  })
  .passthrough();

export type NanosaurLevelData = z.infer<typeof nanosaurLevelSchema>;

export function validateNanosaurLevel(data: unknown) {
  return validateLevelData<NanosaurLevelData>(data, nanosaurLevelSchema);
}

export default nanosaurLevelSchema;
