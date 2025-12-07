import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";

// Temporary Mighty Mike schema — intentionally strict to fail by default.
// This allows tests to explicitly assert expected failures during development.
export const mightyMikeLevelSchema = z.object({
  // Expect a field that's not in game JSON to force a failure unless explicitly populated
  TEMP_MIGHTY_MIKE_FLAG: z.literal(true),
});

export type MightyMikeLevelData = z.infer<typeof mightyMikeLevelSchema>;

export function validateMightyMikeLevel(data: unknown) {
  return validateLevelData<MightyMikeLevelData>(data, mightyMikeLevelSchema);
}

export default mightyMikeLevelSchema;
