import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Game } from "../data/globals/globals";
import { GamePreviewHost } from "./GamePreviewHost";
import {
  GAME_DISPLAY_NAMES,
  levelLabel,
} from "./utils/gamePreviewRuntime";
import {
  GAME_PORT_CONFIGS,
  getLevelIndex,
} from "./utils/gamePortConfig";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: Game;
  levelNumber: number;
  onLevelNumberChange: (n: number) => void;
  terrainDataBytes: Uint8Array | null | undefined;
  terrainRsrcBytes: Uint8Array | null | undefined;
}

export function TestGameDialog(props: Props) {
  const {
    open,
    onOpenChange,
    gameType,
    levelNumber,
    onLevelNumberChange,
    terrainDataBytes,
    terrainRsrcBytes,
  } = props;
  const config = GAME_PORT_CONFIGS[gameType];
  const [previewStarted, setPreviewStarted] = useState(false);
  const [runToken, setRunToken] = useState(0);
  const currentLevelInfo =
    config.levels.find((level) => getLevelIndex(level) === levelNumber) ??
    config.levels[0];
  const levelLabelText = currentLevelInfo
    ? levelLabel(currentLevelInfo, config.levels.indexOf(currentLevelInfo))
    : "";

  useEffect(() => {
    if (!open) {
      setPreviewStarted(false);
      setRunToken(0);
    }
  }, [gameType, open]);

  const handleLevelChange = (value: string) => {
    onLevelNumberChange(Number(value));
    if (previewStarted) {
      setRunToken((currentToken) => currentToken + 1);
    }
  };

  const handleLaunch = () => {
    setPreviewStarted(true);
    setRunToken((currentToken) => currentToken + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {`Preview in ${GAME_DISPLAY_NAMES[config.game]}`}
            {levelLabelText ? ` — ${levelLabelText}` : ""}
          </DialogTitle>
          <DialogDescription>
            The game runs directly in the dialog canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium" htmlFor="game-level-select">
            {"trackNumber" in (config.levels[0] ?? {}) ? "Track:" : "Level:"}
          </label>
          <Select
            value={String(levelNumber)}
            onValueChange={handleLevelChange}
          >
            <SelectTrigger id="game-level-select" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.levels.map((level, idx) => (
                <SelectItem
                  key={getLevelIndex(level)}
                  value={String(getLevelIndex(level))}
                >
                  {levelLabel(level, idx)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleLaunch}>
            {previewStarted ? "Reload Game" : "Launch Game"}
          </Button>
        </div>

        <div className="flex-1 min-h-0 relative rounded overflow-hidden border border-border bg-black">
          {!previewStarted ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center p-6">
              Launch the game to load it directly into the canvas below.
            </div>
          ) : (
            <GamePreviewHost
              key={`${String(gameType)}-${String(runToken)}`}
              config={config}
              levelNumber={levelNumber}
              currentLevelInfo={currentLevelInfo}
              terrainDataBytes={terrainDataBytes}
              terrainRsrcBytes={terrainRsrcBytes}
              runToken={runToken}
            />
          )}
        </div>

        <DialogFooter className="flex-row gap-2 justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground self-center">
            The preview stays inside the editor popup.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
