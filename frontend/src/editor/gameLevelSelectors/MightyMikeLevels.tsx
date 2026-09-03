import type { GlobalsInterface } from "@/data/globals/globals";
import {
  LEVEL_SELECTOR_GLOBALS,
  MIGHTYMIKE_LEVELS,
} from "@/editor/gameLevelSelectors/levelSelectorData";
import { OpenFileButtons } from "@/editor/gameLevelSelectors/levelSelectorRender";
import { ScriptItemDemoButton } from "@/editor/gameLevelSelectors/levelSelectorRender";

export function MightyMikeLevels({
  openFile,
  onCreateScriptItemDemoLevel,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
  onCreateScriptItemDemoLevel: (gameType: GlobalsInterface) => void;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-40">
      <div className="flex flex-col gap-1">
        {OpenFileButtons({
          levels: MIGHTYMIKE_LEVELS,
          globals: LEVEL_SELECTOR_GLOBALS.mightyMike,
          openFile,
        })}
      </div>
      <ScriptItemDemoButton globals={LEVEL_SELECTOR_GLOBALS.mightyMike} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
    </div>
  );
}
