import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import {
  headerFullSchema,
  tileAttributeSchema,
  fenceSchema,
  fenceNubSchema,
  liquidSchema,
  splineSchema,
  splineNubSchema,
  splinePointSchema,
  splineItemSchema,
  itemSchema,
  checkpointSchema,
  metadataSchema,
  resourceEntrySchema,
  hexDataEntrySchema,
  supertileGridOttoSchema,
} from "../levelDataSchemas";

// Otto-specific level schema (moved from central file)
export const LevelDataSchema = z
  .object({
    _metadata: metadataSchema,
    Hedr: z.record(z.string(), resourceEntrySchema(headerFullSchema)),
    Atrb: z.record(
      z.string(),
      resourceEntrySchema(z.array(tileAttributeSchema)),
    ),
    ItCo: z.record(z.string(), hexDataEntrySchema),
    YCrd: z.record(z.string(), resourceEntrySchema(z.array(z.number()))),
    alis: z.record(z.string(), hexDataEntrySchema),
    Layr: z
      .record(z.string(), resourceEntrySchema(z.array(z.number())))
      .optional(),
    STgd: z
      .record(z.string(), resourceEntrySchema(z.array(supertileGridOttoSchema)))
      .optional(),
    Timg: z.record(z.string(), hexDataEntrySchema).optional(),
    Xlat: z
      .record(
        z.string(),
        resourceEntrySchema(z.array(z.object({ idx: z.number() }))),
      )
      .optional(),
    Vcol: z.record(z.string(), hexDataEntrySchema).optional(),
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

export type OttoMaticLevelData = z.infer<typeof LevelDataSchema>;

export function validateOttoMaticLevel(data: unknown) {
  return validateLevelData<OttoMaticLevelData>(data, LevelDataSchema);
}

export function validatePartialOttoMaticLevel(data: unknown) {
  return validateLevelData<Partial<OttoMaticLevelData>>(
    data,
    LevelDataSchema.partial(),
  );
}
