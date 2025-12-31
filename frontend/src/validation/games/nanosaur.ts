import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerOttoMaticSchema,
  metadataSchema,
  resourceEntrySchema,
  hexDataEntrySchema,
} from "../levelDataSchemas";

// Nanosaur 1 level data is converted by nanosaur1LevelToLevelData to an Otto-like structure
// with full header including numTilePages/numTiles. Since Nanosaur 1 doesn't have STgd data
// (uses individual tiles), we allow flexible structure.
export const nanosaurLevelSchema = z
  .object({
    _metadata: metadataSchema,
    // Use Otto-like full header since nanosaur1LevelToLevelData produces that
    Hedr: z.record(z.string(), resourceEntrySchema(headerOttoMaticSchema)),
    Layr: z
      .record(z.string(), resourceEntrySchema(z.array(z.number())))
      .optional(),
    Atrb: z
      .record(z.string(), resourceEntrySchema(z.array(z.any()))) // Nanosaur Atrb has different fields
      .optional(),
    YCrd: z
      .record(z.string(), resourceEntrySchema(z.array(z.number())))
      .optional(),
    Itms: z
      .record(z.string(), resourceEntrySchema(z.array(z.any()))) // Nanosaur items have different fields
      .optional(),
    Timg: z.record(z.string(), hexDataEntrySchema).optional(),
    ItCo: z.record(z.string(), hexDataEntrySchema).optional(),
    alis: z.record(z.string(), hexDataEntrySchema).optional(),
    // Nanosaur 1 does not have fences/splines/liquids but we include empty records
    Fenc: z
      .record(z.string(), resourceEntrySchema(z.array(z.any())))
      .optional(),
    Liqd: z
      .record(z.string(), resourceEntrySchema(z.array(z.any())))
      .optional(),
    Spln: z
      .record(z.string(), resourceEntrySchema(z.array(z.any())))
      .optional(),
    STgd: z
      .record(z.string(), resourceEntrySchema(z.array(z.any())))
      .optional(),
  })
  .loose();

export type NanosaurLevelData = z.infer<typeof nanosaurLevelSchema>;

export function validateNanosaurLevel(data: unknown) {
  return validateLevelData<NanosaurLevelData>(data, nanosaurLevelSchema);
}
