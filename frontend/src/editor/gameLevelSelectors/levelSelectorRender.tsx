import { Button } from "@/components/ui/button";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { NamedLevelPath } from "@/editor/gameLevelSelectors/levelSelectorData";

interface RenderOpenFileButtonsArgs {
  readonly levels: readonly NamedLevelPath[];
  readonly globals: GlobalsInterface;
  readonly openFile: (url: string, gameType: GlobalsInterface) => void;
}

export function OpenFileButtons({
  levels,
  globals,
  openFile,
}: RenderOpenFileButtonsArgs) {
  return levels.map((level) => (
    <Button key={level.path} onClick={() => openFile(level.path, globals)}>
      {level.label}
    </Button>
  ));
}
