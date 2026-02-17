import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import { createSimplifiedLevelSchema } from "./sharedSchemas";

export const billyFrontierLevelSchema = createSimplifiedLevelSchema();

export type BillyFrontierLevelData = z.infer<typeof billyFrontierLevelSchema>;

export function validateBillyFrontierLevel(data: unknown) {
  return validateLevelData<BillyFrontierLevelData>(
    data,
    billyFrontierLevelSchema,
  );
}
