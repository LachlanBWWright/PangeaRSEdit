import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { GAME_DISPLAY_NAMES, levelLabel } from "./utils/gamePreviewRuntime";
import { GAME_PORT_CONFIGS, getLevelIndex } from "./utils/gamePortConfig";
import {
  advancePreviewSession,
  type PreviewSession,
} from "./utils/previewSessionState";
import type { PreviewVfsFile } from "./utils/gamePreviewRuntime";

interface PangeaScriptStatusJS {
  enabled: boolean;
  configLoaded: boolean;
  bundleLoaded: boolean;
  activeScriptPath: string;
  lastError: string;
  errorCount: number;
  budgetExceededCount: number;
  hooksCalledCount: number;
  scriptsDisabled: boolean;
}

function queryActiveScriptingStatus(): PangeaScriptStatusJS | null {
  const mod = (window as any).Module;
  if (!mod || !mod.ccall) {
    return null;
  }
  try {
    const enabled = Boolean(mod.ccall("PangeaScript_GetStatusEnabled", "number", [], []));
    const configLoaded = Boolean(mod.ccall("PangeaScript_GetStatusConfigLoaded", "number", [], []));
    const bundleLoaded = Boolean(mod.ccall("PangeaScript_GetStatusBundleLoaded", "number", [], []));
    const activeScriptPath = mod.ccall("PangeaScript_GetStatusActiveScriptPath", "string", [], []);
    const lastError = mod.ccall("PangeaScript_GetStatusLastError", "string", [], []);
    const errorCount = mod.ccall("PangeaScript_GetStatusErrorCount", "number", [], []);
    const budgetExceededCount = mod.ccall("PangeaScript_GetStatusBudgetExceededCount", "number", [], []);
    const hooksCalledCount = mod.ccall("PangeaScript_GetStatusHooksCalledCount", "number", [], []);
    const scriptsDisabled = Boolean(mod.ccall("PangeaScript_GetStatusScriptsDisabled", "number", [], []));

    return {
      enabled,
      configLoaded,
      bundleLoaded,
      activeScriptPath,
      lastError,
      errorCount,
      budgetExceededCount,
      hooksCalledCount,
      scriptsDisabled,
    };
  } catch (_) {
    return null;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: Game;
  levelNumber: number;
  onLevelNumberChange: (n: number) => void;
  terrainDataBytes: Uint8Array | null | undefined;
  terrainRsrcBytes: Uint8Array | null | undefined;
  terrainTextureBytes: Uint8Array | null | undefined;
  customFiles?: readonly PreviewVfsFile[];
  /** When true, launch from the title screen without level selection or terrain injection. */
  normalLaunch?: boolean;
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
    customFiles,
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
  const previewStarted = isCurrentPreviewSession && previewSession.started;
  const runToken = isCurrentPreviewSession ? previewSession.runToken : 0;
  const currentLevelInfo =
    config.levels.find((level) => getLevelIndex(level) === levelNumber) ??
    config.levels[0];
  const levelLabelText = currentLevelInfo
    ? levelLabel(currentLevelInfo, config.levels.indexOf(currentLevelInfo))
    : "";

  const [scriptStatus, setScriptStatus] = useState<PangeaScriptStatusJS | null>(null);

  useEffect(() => {
    if (!previewStarted) {
      setScriptStatus(null);
      return;
    }
    const interval = setInterval(() => {
      const status = queryActiveScriptingStatus();
      setScriptStatus(status);
    }, 500);
    return () => clearInterval(interval);
  }, [previewStarted]);

  const handleLevelChange = (value: string) => {
    onLevelNumberChange(Number(value));
    if (previewStarted) {
      setPreviewSession((currentSession) =>
        advancePreviewSession(currentSession, gameType),
      );
    }
  };

  const handleLaunch = () => {
    setPreviewSession((currentSession) =>
      advancePreviewSession(currentSession, gameType),
    );
  };

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[90vw] max-w-[90vw] h-[90vh] flex flex-col"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {normalLaunch
              ? `Play ${GAME_DISPLAY_NAMES[config.game]}`
              : `Preview in ${GAME_DISPLAY_NAMES[config.game]}`}
            {!normalLaunch && levelLabelText ? ` — ${levelLabelText}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          {!normalLaunch && (
            <>
              <label
                className="text-sm font-medium"
                htmlFor="game-level-select"
              >
                {"trackNumber" in (config.levels[0] ?? {})
                  ? "Track:"
                  : "Level:"}
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

        <div className="flex-1 min-h-0 flex gap-4">
          <div
            ref={containerRef}
            className="flex-1 min-h-0 relative rounded overflow-hidden border border-border bg-black"
          >
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
                customFiles={normalLaunch ? undefined : customFiles}
                runToken={runToken}
                normalLaunch={normalLaunch}
              />
            )}
          </div>

          {previewStarted && customFiles && customFiles.length > 0 && (
            <div className="w-80 border rounded-md border-slate-800 bg-slate-950/90 p-4 flex flex-col gap-4 overflow-y-auto max-h-full text-xs text-slate-300">
              <div className="font-semibold text-slate-100 text-sm border-b border-slate-800 pb-2">
                Scripting Runtime Monitor
              </div>

              {scriptStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Host Status:</span>
                    <span
                      className={`font-semibold ${
                        scriptStatus.scriptsDisabled
                          ? "text-red-400"
                          : scriptStatus.enabled
                            ? "text-green-400"
                            : "text-slate-400"
                      }`}
                    >
                      {scriptStatus.scriptsDisabled
                        ? "DISABLED (Too Many Errors)"
                        : scriptStatus.enabled
                          ? "ACTIVE"
                          : "INACTIVE"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Config File:</span>
                    <span
                      className={`font-medium ${
                        scriptStatus.configLoaded ? "text-green-400" : "text-amber-400"
                      }`}
                    >
                      {scriptStatus.configLoaded ? "LOADED" : "NOT FOUND"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Bundle Status:</span>
                    <span
                      className={`font-medium ${
                        scriptStatus.bundleLoaded ? "text-green-400" : "text-amber-400"
                      }`}
                    >
                      {scriptStatus.bundleLoaded ? "LOADED" : "NOT FOUND"}
                    </span>
                  </div>

                  {scriptStatus.configLoaded && scriptStatus.bundleLoaded && scriptStatus.hooksCalledCount > 0 && (
                    <div className="rounded border border-green-900 bg-green-950/20 p-2 text-green-300 flex items-center gap-2">
                      <span className="text-sm">✓</span>
                      <span>Runtime Smoke Check: PASSED</span>
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-2 space-y-1 text-[11px] text-slate-400">
                    <div>Active path:</div>
                    <div className="text-slate-200 truncate" title={scriptStatus.activeScriptPath}>
                      {scriptStatus.activeScriptPath}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-500">Hooks Called</div>
                      <div className="text-lg font-bold text-slate-200">
                        {scriptStatus.hooksCalledCount}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-500">Errors</div>
                      <div
                        className={`text-lg font-bold ${
                          scriptStatus.errorCount > 0 ? "text-red-400" : "text-slate-200"
                        }`}
                      >
                        {scriptStatus.errorCount}
                      </div>
                    </div>
                  </div>

                  {scriptStatus.budgetExceededCount > 0 && (
                    <div className="rounded border border-amber-900 bg-amber-950/20 p-2 text-amber-300">
                      Budget Exceeded: {scriptStatus.budgetExceededCount} times
                    </div>
                  )}

                  {scriptStatus.lastError && (
                    <div className="border-t border-slate-800 pt-2 space-y-1">
                      <div className="text-red-400 font-medium">Last Error:</div>
                      <pre className="bg-slate-900 p-2 rounded text-[10px] text-red-200 overflow-x-auto whitespace-pre-wrap max-h-32">
                        {scriptStatus.lastError}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 italic text-center py-4">
                  Querying scripting status...
                </div>
              )}

              <div className="border-t border-slate-800 pt-3 flex-1 flex flex-col min-h-0">
                <div className="font-semibold text-slate-200 mb-2">Injected VFS Files</div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {customFiles.map((file) => (
                    <div
                      key={file.path}
                      className="p-1.5 rounded bg-slate-900/50 border border-slate-800/80 text-[10px] text-slate-400 font-mono truncate"
                      title={file.path}
                    >
                      {file.path}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
