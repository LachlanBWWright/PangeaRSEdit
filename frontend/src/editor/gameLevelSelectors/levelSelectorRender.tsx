import { Button } from "@/components/ui/button";
import { WandSparkles } from "lucide-react";
import { useFeatureFlags } from "@/config/useFeatureFlags";
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

export function ScriptItemDemoButton({
  globals,
  onCreateScriptItemDemoLevel,
}: {
  readonly globals: GlobalsInterface;
  readonly onCreateScriptItemDemoLevel: (gameType: GlobalsInterface) => void;
}) {
  const featureFlags = useFeatureFlags();
  if (!featureFlags.scriptItemDemoLevels) return null;

  return (
    <Button
      variant="outline"
      onClick={() => onCreateScriptItemDemoLevel(globals)}
      className="mt-2 w-full border-amber-700 text-amber-200 hover:bg-amber-950/40"
    >
      <WandSparkles className="mr-2 h-4 w-4" />
      Script Item Demo Level
    </Button>
  );
}
