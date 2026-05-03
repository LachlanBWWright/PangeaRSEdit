import { LevelGrid } from "../LevelGrid";
import type { GlobalsInterface } from "@/data/globals/globals";
import {
  CROMAG_LEVEL_GROUPS,
  LEVEL_SELECTOR_GLOBALS,
} from "@/editor/gameLevelSelectors/levelSelectorData";
import { OpenFileButtons } from "@/editor/gameLevelSelectors/levelSelectorRender";

export function CroMagLevels({
  openFile,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
}) {
  return (
    <>
      {CROMAG_LEVEL_GROUPS.map((group) => (
        <LevelGrid key={group.title} title={group.title}>
          {OpenFileButtons({
            levels: group.levels,
            globals: LEVEL_SELECTOR_GLOBALS.croMag,
            openFile,
          })}
        </LevelGrid>
      ))}
    </>
  );
}
