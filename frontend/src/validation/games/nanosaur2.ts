import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import { createSimplifiedLevelSchema } from "./sharedSchemas";

export const nanosaur2LevelSchema = createSimplifiedLevelSchema();

export type Nanosaur2LevelData = z.infer<typeof nanosaur2LevelSchema>;

export function validateNanosaur2Level(data: unknown) {
  return validateLevelData<Nanosaur2LevelData>(data, nanosaur2LevelSchema);
}
