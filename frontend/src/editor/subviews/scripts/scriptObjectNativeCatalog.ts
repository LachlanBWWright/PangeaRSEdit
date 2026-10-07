import type { z } from "zod";
import { BugdomGlobals, Bugdom2Globals, OttoGlobals, NanosaurGlobals, Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals } from "@/data/globals/globals";
import { getGameMapper } from "@/data/items/mappers";
import { DEFAULT_ITEM_MODEL_PARAMS } from "@/data/items/itemModelPreview";
import { objectPreviewGame } from "./scriptObjectModelPreview";
import type { scriptNativeVisualGroupSchema } from "./scriptNativeVisualGroups";

type ModelBank = z.infer<typeof scriptNativeVisualGroupSchema>;
export interface NativeObjectModelOption {
  readonly id: string;
  readonly label: string;
  readonly bank: ModelBank;
  readonly index: number;
  readonly itemType: number;
  readonly level: number;
  readonly file: string;
}
const globalsOptions = [BugdomGlobals, Bugdom2Globals, OttoGlobals, NanosaurGlobals, Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals];
const bugdomBanks: Readonly<Record<string, ModelBank>> = {
  "global_models1.3dmf": "global", "global_models2.3dmf": "global2",
  "lawn_models1.3dmf": "lawn", "lawn_models2.3dmf": "lawn2", "pond_models.3dmf": "pond",
  "forest_models.3dmf": "forest", "beehive_models.3dmf": "hive", "night_models.3dmf": "night", "anthill_models.3dmf": "anthill",
};
const bugdom2Banks: Readonly<Record<string, ModelBank>> = {
  "global.bg3d": "global", "foliage.bg3d": "foliage", "level1_garden.bg3d": "garden",
  "level2_sidewalk.bg3d": "sidewalk", "level5_playroom.bg3d": "playroom", "level6_closet.bg3d": "closet",
  "level8_garbage.bg3d": "garbage", "level9_balsa.bg3d": "balsa", "level10_park.bg3d": "park",
};
function bankForFile(gameId: string, file: string): ModelBank | undefined {
  const name = file.toLowerCase();
  if (gameId === "Bugdom-android") return bugdomBanks[name];
  if (gameId === "Bugdom2-Android") return bugdom2Banks[name];
  if (name === "global.bg3d" || name === "global_models.3dmf") return "global";
  return undefined;
}

export function getObjectNativeModelOptions(gameId: string): readonly NativeObjectModelOption[] {
  const game = objectPreviewGame(gameId);
  const globals = globalsOptions.find((option) => option.GAME_TYPE === game);
  const mapper = getGameMapper(game);
  if (!globals || !mapper) return [];
  const options = new Map<string, NativeObjectModelOption>();
  for (const itemType of mapper.getMappedTypes()) {
    for (let level = 0; level < 12; level++) {
      const mapping = mapper.getMapping(itemType, level, DEFAULT_ITEM_MODEL_PARAMS);
      if (!mapping || mapping.modelPath !== "models" || mapping.verificationStatus === "approximate") continue;
      const bank = bankForFile(gameId, mapping.modelFile);
      if (!bank) continue;
      const id = `${bank}:${mapping.modelIndex}`;
      if (options.has(id)) continue;
      options.set(id, { id, label: globals.ITEM_TYPES[itemType] ?? `Model ${mapping.modelIndex}`, bank, index: mapping.modelIndex, itemType, level, file: mapping.modelFile });
    }
  }
  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label));
}
