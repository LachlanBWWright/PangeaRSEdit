import { useRef, useState } from "react";
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
  terrainTextureBytes: Uint8Array | null | undefined;
  /** When true, launch from the title screen without level selection or terrain injection. */
  normalLaunch?: boolean;
}

interface PreviewSession {
  readonly gameType: Game;
  readonly started: boolean;
  readonly runToken: number;
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
    terrainTextureBytes,
    normalLaunch = false,
  } = props;
  const config = GAME_PORT_CONFIGS[gameType];
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewSession, setPreviewSession] = useState<PreviewSession>({
    gameType,
    started: false,
    runToken: 0,
  });
  const isCurrentPreviewSession = open && previewSession.gameType === gameType;
  const previewStarted =
    isCurrentPreviewSession && previewSession.started;
  const runToken = isCurrentPreviewSession ? previewSession.runToken : 0;
  const currentLevelInfo =
    config.levels.find((level) => getLevelIndex(level) === levelNumber) ??
    config.levels[0];
  const levelLabelText = currentLevelInfo
    ? levelLabel(currentLevelInfo, config.levels.indexOf(currentLevelInfo))
    : "";

  const handleLevelChange = (value: string) => {
    onLevelNumberChange(Number(value));
    if (previewStarted) {
      setPreviewSession((currentSession) => ({
        gameType,
        started: true,
        runToken:
          currentSession.gameType === gameType
            ? currentSession.runToken + 1
            : 1,
      }));
    }
  };

  const handleLaunch = () => {
    setPreviewSession((currentSession) => ({
      gameType,
      started: true,
      runToken:
        currentSession.gameType === gameType
          ? currentSession.runToken + 1
          : 1,
    }));
  };

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] flex flex-col" onEscapeKeyDown={(e) => { e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>
            {normalLaunch
              ? `Play ${GAME_DISPLAY_NAMES[config.game]}`
              : `Preview in ${GAME_DISPLAY_NAMES[config.game]}`}
            {!normalLaunch && levelLabelText ? ` — ${levelLabelText}` : ""}
          </DialogTitle>
          <DialogDescription>
            The game runs directly in the dialog canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          {!normalLaunch && (
            <>
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
            </>
          )}

          <Button variant="outline" onClick={handleLaunch}>
            {previewStarted ? "Reload Game" : "Launch Game"}
          </Button>

          {previewStarted && (
            <Button variant="outline" onClick={handleFullscreen}>
              Fullscreen
            </Button>
          )}
        </div>

        <div ref={containerRef} className="flex-1 min-h-0 relative rounded overflow-hidden border border-border bg-black">
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
              terrainDataBytes={normalLaunch ? null : terrainDataBytes}
              terrainRsrcBytes={normalLaunch ? null : terrainRsrcBytes}
              terrainTextureBytes={normalLaunch ? null : terrainTextureBytes}
              runToken={runToken}
              normalLaunch={normalLaunch}
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
