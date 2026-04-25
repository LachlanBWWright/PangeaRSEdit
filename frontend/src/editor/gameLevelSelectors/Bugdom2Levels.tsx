import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LevelGrid } from "../LevelGrid";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { TunnelData } from "@/data/tunnelParser/types";
import { createBugdom2TunnelLoader } from "@/editor/gameLevelSelectors/bugdom2TunnelLoader";
import {
  BUGDOM2_STANDARD_LEVELS,
  BUGDOM2_TUNNEL_LEVELS,
  LEVEL_SELECTOR_GLOBALS,
} from "@/editor/gameLevelSelectors/levelSelectorData";
import { OpenFileButtons } from "@/editor/gameLevelSelectors/levelSelectorRender";

export function Bugdom2Levels({
  openFile,
  onTunnelLoad,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
  onTunnelLoad?: (data: TunnelData, fileName: string) => void;
}) {
  const tunnelLoader = useCallback(
    (path: string, fileName: string) => {
      const loader = createBugdom2TunnelLoader({ onTunnelLoad });
      return loader(path, fileName);
    },
    [onTunnelLoad],
  );

  return (
    <LevelGrid title="Bugdom 2 Levels">
      {OpenFileButtons({
        levels: BUGDOM2_STANDARD_LEVELS.slice(0, 3),
        globals: LEVEL_SELECTOR_GLOBALS.bugdom2,
        openFile,
      })}
      {BUGDOM2_TUNNEL_LEVELS.slice(0, 1).map((level) => (
        <Button
          key={level.path}
          onClick={() => tunnelLoader(level.path, level.fileName)}
        >
          {level.label}
        </Button>
      ))}
      {OpenFileButtons({
        levels: BUGDOM2_STANDARD_LEVELS.slice(3, 5),
        globals: LEVEL_SELECTOR_GLOBALS.bugdom2,
        openFile,
      })}
      {BUGDOM2_TUNNEL_LEVELS.slice(1).map((level) => (
        <Button
          key={level.path}
          onClick={() => tunnelLoader(level.path, level.fileName)}
        >
          {level.label}
        </Button>
      ))}
      {OpenFileButtons({
        levels: BUGDOM2_STANDARD_LEVELS.slice(5),
        globals: LEVEL_SELECTOR_GLOBALS.bugdom2,
        openFile,
      })}
    </LevelGrid>
  );
}
