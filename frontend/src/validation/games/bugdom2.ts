import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";
import { createSimplifiedLevelSchema } from "./sharedSchemas";

export const bugdom2LevelSchema = createSimplifiedLevelSchema();

export type Bugdom2LevelData = z.infer<typeof bugdom2LevelSchema>;

export function validateBugdom2Level(data: unknown) {
  return validateLevelData<Bugdom2LevelData>(data, bugdom2LevelSchema);
}
