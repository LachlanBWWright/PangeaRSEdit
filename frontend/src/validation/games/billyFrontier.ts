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

// Billy Frontier uses isEmpty like Otto but with JPG/TIMG assets
export const billyFrontierLevelSchema = z
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

export type BillyFrontierLevelData = z.infer<typeof billyFrontierLevelSchema>;

export function validateBillyFrontierLevel(data: unknown) {
  return validateLevelData<BillyFrontierLevelData>(
    data,
    billyFrontierLevelSchema,
  );
}

export default billyFrontierLevelSchema;
