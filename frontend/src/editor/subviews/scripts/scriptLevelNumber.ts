import { atom } from "jotai";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { nativeLevelNumber } from "@/editor/utils/previewLevelNumbers";

export const scriptLevelNumberAtom = atom((get) => {
  const level = get(LevelNumber);
  return level === undefined ? undefined : nativeLevelNumber(get(Globals).GAME_TYPE, level);
});
