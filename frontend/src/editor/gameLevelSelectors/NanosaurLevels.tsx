import { Button } from "@/components/ui/button";
import { LevelGrid } from "../LevelGrid";
import { NanosaurGlobals, type GlobalsInterface } from "@/data/globals/globals";
import { ScriptItemDemoButton } from "./levelSelectorRender";

export function NanosaurLevels({
  openFile,
  onCreateScriptItemDemoLevel,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
  onCreateScriptItemDemoLevel: (gameType: GlobalsInterface) => void;
}) {
  return (
    <LevelGrid title="Nanosaur Levels">
      <Button
        onClick={() =>
          openFile("assets/nanosaur/terrain/Level1.ter", NanosaurGlobals)
        }
      >
        Default
      </Button>
      <Button
        onClick={() =>
          openFile("assets/nanosaur/terrain/Level1Pro.ter", NanosaurGlobals)
        }
      >
        Extreme
      </Button>
      <ScriptItemDemoButton globals={NanosaurGlobals} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
    </LevelGrid>
  );
}
