import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Game } from "../data/globals/globals";
import {
  GAME_PORT_CONFIGS,
  getLevelIndex,
  type AnyLevelInfo,
} from "./utils/gamePortConfig";
import { OTTO_LEVELS } from "./utils/ottoLevelNumbers";

const MAX_ERROR_LOG_ENTRIES = 50;

type GameStatus = "loading" | "running" | "crashed" | "idle";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: Game;
  levelNumber: number;
  onLevelNumberChange: (n: number) => void;
  terrainRsrcBlob: Blob | null;
  terrainDataBlob: Blob | null;
}

/** Apply pre-load window globals required before the game script is executed. */
function applyPreLoadVars(gameType: Game, levelIndex: number): void {
  if (gameType === Game.BUGDOM) {
    window.BUGDOM_START_LEVEL = levelIndex;
  }
}

/** Remove pre-load window globals set by applyPreLoadVars. */
function clearPreLoadVars(gameType: Game): void {
  if (gameType === Game.BUGDOM) {
    delete window.BUGDOM_START_LEVEL;
  }
}

/** Call the fence-collision toggle for the active game via its published API. */
function callFenceCollision(gameType: Game, enabled: boolean): void {
  const flag = enabled ? 1 : 0;
  switch (gameType) {
    case Game.OTTO_MATIC:
      window.Module?.ccall?.("OttoMatic_SetFenceCollisions", null, ["number"], [flag]);
      break;
    case Game.NANOSAUR:
      window.SetFenceCollisionsEnabled?.(flag);
      break;
    case Game.BUGDOM:
      window.Module?.ccall?.("BugdomSetFenceCollision", null, ["number"], [flag]);
      break;
    case Game.BUGDOM_2:
      window.gameAPI?.setFenceCollisionEnabled(enabled);
      break;
    case Game.CRO_MAG:
      window.GameCheat?.setFenceCollision(flag);
      break;
    case Game.BILLY_FRONTIER:
      window.Module?.ccall?.("BF_SetFenceCollision", null, ["number"], [flag]);
      break;
    case Game.NANOSAUR_2:
      window.Module?.ccall?.("Nanosaur2_SetFenceCollisionsEnabled", null, ["number"], [flag]);
      break;
    default:
      break;
  }
}

/** Otto Matic only: god mode toggle via Module.ccall. */
function callGodMode(enabled: boolean): void {
  window.Module?.ccall?.("OttoMatic_SetGodMode", null, ["number"], [enabled ? 1 : 0]);
}

/** Otto Matic only: movement speed multiplier via Module.ccall. */
function callSpeedMultiplier(value: number): void {
  window.Module?.ccall?.("OttoMatic_SetSpeedMultiplier", null, ["number"], [value]);
}

/** Nanosaur only: restore health via exported JS function. */
function callRestoreHealth(): void {
  window.CheatRestoreHealth?.();
}

/** Nanosaur only: fill fuel via exported JS function. */
function callFillFuel(): void {
  window.CheatFillFuel?.();
}

/** Write a terrain blob to the game's virtual FS and call the set-path function. */
function injectTerrainBlob(
  path: string,
  blob: Blob,
  thenCallFn: string | null,
  thenCallArg: string | null,
  appendError: (msg: string) => void,
): void {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (!(result instanceof ArrayBuffer)) return;
    const data = new Uint8Array(result);
    const fs = window.Module?.FS;
    if (!fs) {
      appendError("Game filesystem not available — terrain injection failed.");
      return;
    }
    fs.writeFile(path, data);
    if (thenCallFn && thenCallArg) {
      window.Module?.ccall?.(thenCallFn, null, ["string"], [thenCallArg]);
    }
  };
  reader.readAsArrayBuffer(blob);
}

/** Map a Game enum value to its display name. */
const GAME_DISPLAY_NAMES: Readonly<Record<Game, string>> = {
  [Game.OTTO_MATIC]: "Otto Matic",
  [Game.NANOSAUR]: "Nanosaur",
  [Game.BUGDOM]: "Bugdom",
  [Game.BUGDOM_2]: "Bugdom 2",
  [Game.CRO_MAG]: "Cro-Mag Rally",
  [Game.BILLY_FRONTIER]: "Billy Frontier",
  [Game.MIGHTY_MIKE]: "Mighty Mike",
  [Game.NANOSAUR_2]: "Nanosaur 2",
};
function levelLabel(info: AnyLevelInfo, idx: number): string {
  if ("trackNumber" in info) {
    return `Track ${String(info.trackNumber)}: ${info.name}`;
  }
  if ("areaNumber" in info) {
    return `Area ${String(info.areaNumber + 1)}: ${info.name}`;
  }
  return `Lv ${String(idx + 1)}: ${info.name}`;
}

export function TestGameDialog({
  open,
  onOpenChange,
  gameType,
  levelNumber,
  onLevelNumberChange,
  terrainRsrcBlob,
  terrainDataBlob,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const [status, setStatus] = useState<GameStatus>("idle");
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [gameKey, setGameKey] = useState(0);
  const [fetchedLocalWasm, setFetchedLocalWasm] = useState<boolean | null>(null);
  const [fencesEnabled, setFencesEnabled] = useState(true);
  const [godModeEnabled, setGodModeEnabled] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);

  // Refs that capture values at game-start time
  const capturedLevelRef = useRef(levelNumber);
  const terrainRsrcBlobRef = useRef(terrainRsrcBlob);
  const terrainDataBlobRef = useRef(terrainDataBlob);
  useEffect(() => {
    terrainRsrcBlobRef.current = terrainRsrcBlob;
    terrainDataBlobRef.current = terrainDataBlob;
  }, [terrainRsrcBlob, terrainDataBlob]);

  const config = GAME_PORT_CONFIGS[gameType];

  // For games without a WASM build, we know immediately — no fetch needed.
  // For games that have a build, null means "still checking".
  const [fetchedLocalWasm, setFetchedLocalWasm] = useState<boolean | null>(null);
  const useLocalWasm = config.wasmAvailable ? fetchedLocalWasm : false;

  // Detect whether local WASM files are present for games that do have a build
  useEffect(() => {
    if (!config.wasmAvailable) return;
    const jsPath = `${import.meta.env.BASE_URL}wasm/${config.wasmDir}/${config.mainJs}`;
    let cancelled = false;
    fetch(jsPath, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) {
          // Reject SPA fallback responses (text/html) — only accept actual JS files
          const ct = res.headers.get("content-type") ?? "";
          setFetchedLocalWasm(res.ok && ct.includes("javascript"));
        }
      })
      .catch(() => { if (!cancelled) setFetchedLocalWasm(false); });
    return () => { cancelled = true; };
  }, [gameType, config.wasmAvailable, config.wasmDir, config.mainJs, setFetchedLocalWasm]);

  const appendError = useCallback((msg: string) => {
    setErrorLog((prev) => [...prev.slice(-(MAX_ERROR_LOG_ENTRIES - 1)), msg]);
    setStatus("crashed");
  }, []);

  // Load / reload the game via canvas + dynamic script injection
  useEffect(() => {
    if (gameKey === 0 || !useLocalWasm || !canvasRef.current) return;

    const capturedLevel = capturedLevelRef.current;
    const basePath = `${import.meta.env.BASE_URL}wasm/${config.wasmDir}`;
    const canvas = canvasRef.current;

    applyPreLoadVars(gameType, capturedLevel);

    window.Module = {
      canvas,
      locateFile: (path) => `${basePath}/${path}`,
      onRuntimeInitialized: () => {
        setStatus("running");

        // Skip to the selected level after runtime is ready
        const skipCall = config.getSkipToLevelCcall?.(capturedLevel);
        if (skipCall) {
          window.Module?.ccall?.(
            skipCall.fn,
            skipCall.returnType,
            skipCall.argTypes,
            skipCall.args,
          );
        }

        // Inject terrain for Otto Matic (rsrc + data forks)
        if (gameType === Game.OTTO_MATIC) {
          const ottoLevel = OTTO_LEVELS[capturedLevel];
          if (ottoLevel) {
            const rsrcBlob = terrainRsrcBlobRef.current;
            const dataBlob = terrainDataBlobRef.current;
            if (rsrcBlob) {
              injectTerrainBlob(
                `/Data/Terrain/${ottoLevel.terrainFile}.rsrc`,
                rsrcBlob,
                null,
                null,
                appendError,
              );
            }
            if (dataBlob) {
              injectTerrainBlob(
                `/Data/Terrain/${ottoLevel.terrainFile}`,
                dataBlob,
                "OttoMatic_SetTerrainPath",
                `/Data/Terrain/${ottoLevel.terrainFile}`,
                appendError,
              );
            }
          }
        }
      },
      onAbort: () => { appendError("Game crashed unexpectedly."); },
    };

    const script = document.createElement("script");
    script.src = `${basePath}/${config.mainJs}`;
    script.onerror = () => {
      appendError(`Failed to load game script: ${config.mainJs}`);
      setStatus("crashed");
    };
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      clearPreLoadVars(gameType);
      delete window.Module;
    };
  }, [gameKey, useLocalWasm, gameType, config, appendError]);

  const handleStartOrReboot = useCallback(() => {
    capturedLevelRef.current = levelNumber;
    // Clean up any running game before starting fresh
    if (scriptRef.current && document.body.contains(scriptRef.current)) {
      document.body.removeChild(scriptRef.current);
      scriptRef.current = null;
    }
    clearPreLoadVars(gameType);
    delete window.Module;
    setStatus("loading");
    setErrorLog([]);
    setFencesEnabled(true);
    setGodModeEnabled(false);
    setSpeedMultiplier(1.0);
    setGameKey((k) => k + 1);
  }, [levelNumber, gameType]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        if (scriptRef.current && document.body.contains(scriptRef.current)) {
          document.body.removeChild(scriptRef.current);
          scriptRef.current = null;
        }
        clearPreLoadVars(gameType);
        delete window.Module;
        setStatus("idle");
        setGameKey(0);
        setErrorLog([]);
      }
      onOpenChange(next);
    },
    [onOpenChange, gameType],
  );

  const handleOpenRemote = useCallback(() => {
    window.open(config.remoteGameUrl(levelNumber), "_blank", "noopener,noreferrer");
  }, [config, levelNumber]);

  const handleToggleFences = useCallback(() => {
    const next = !fencesEnabled;
    callFenceCollision(gameType, next);
    setFencesEnabled(next);
  }, [fencesEnabled, gameType]);

  const handleToggleGodMode = useCallback(() => {
    const next = !godModeEnabled;
    callGodMode(next);
    setGodModeEnabled(next);
  }, [godModeEnabled]);

  const handleSpeedChange = useCallback((values: number[]) => {
    const val = values[0] ?? 1;
    callSpeedMultiplier(val);
    setSpeedMultiplier(val);
  }, []);

  const handleDownloadOttoTerrain = useCallback(() => {
    if (!terrainRsrcBlob) return;
    const ottoLevel = OTTO_LEVELS[levelNumber];
    if (!ottoLevel) return;
    const url = URL.createObjectURL(terrainRsrcBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ottoLevel.terrainFile}.rsrc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [terrainRsrcBlob, levelNumber]);

  const isOttoMatic = gameType === Game.OTTO_MATIC;
  const isNanosaur = gameType === Game.NANOSAUR;
  const hasTerrainData = terrainRsrcBlob !== null || terrainDataBlob !== null;
  const currentLevelInfo = config.levels.find(
    (l) => getLevelIndex(l) === levelNumber,
  ) ?? config.levels[0];
  const levelLabelText = currentLevelInfo
    ? levelLabel(currentLevelInfo, config.levels.indexOf(currentLevelInfo))
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {`Test Level in ${GAME_DISPLAY_NAMES[config.game]}`}
            {levelLabelText ? ` — ${levelLabelText}` : ""}
          </DialogTitle>
          <DialogDescription>
            {!config.wasmAvailable && "WASM build not yet available for this game."}
            {config.wasmAvailable && useLocalWasm === null && "Checking for local WASM build…"}
            {config.wasmAvailable && useLocalWasm === false && "No local WASM found. Use \"Open on GitHub Pages\" to play in a new tab."}
            {config.wasmAvailable && useLocalWasm === true && status === "idle" && "Local WASM detected. Press \"Start Game\" to launch."}
            {status === "loading" && "Loading game…"}
            {status === "running" && isOttoMatic && (hasTerrainData ? "Game running with custom terrain (local WASM)." : "Game running with default terrain.")}
            {status === "running" && !isOttoMatic && "Game running."}
            {status === "crashed" && "The game has encountered an error. Check the log below and try rebooting."}
          </DialogDescription>
        </DialogHeader>

        {/* Controls bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium" htmlFor="game-level-select">
            {config.levels === GAME_PORT_CONFIGS[Game.CRO_MAG].levels ? "Track:" : "Level:"}
          </label>
          <Select
            value={String(levelNumber)}
            onValueChange={(v) => onLevelNumberChange(Number(v))}
          >
            <SelectTrigger id="game-level-select" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.levels.map((l, idx) => (
                <SelectItem key={getLevelIndex(l)} value={String(getLevelIndex(l))}>
                  {levelLabel(l, idx)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {useLocalWasm && (
            <Button variant="outline" onClick={handleStartOrReboot}>
              {status === "idle" ? "Start Game" : "Reboot Game"}
            </Button>
          )}

          {config.wasmAvailable && useLocalWasm === false && (
            <Button variant="outline" onClick={handleOpenRemote}>
              Open on GitHub Pages ↗
            </Button>
          )}

          {isOttoMatic && terrainRsrcBlob !== null && status !== "idle" && (
            <Button variant="outline" onClick={handleDownloadOttoTerrain}>
              Download .ter.rsrc
            </Button>
          )}

          {config.hasFenceCollision && status === "running" && (
            <Button
              variant={fencesEnabled ? "outline" : "destructive"}
              onClick={handleToggleFences}
            >
              {fencesEnabled ? "Fences: On" : "Fences: Off"}
            </Button>
          )}

          {config.hasGodMode && status === "running" && (
            <Button
              variant={godModeEnabled ? "destructive" : "outline"}
              onClick={handleToggleGodMode}
            >
              {godModeEnabled ? "God Mode: On" : "God Mode: Off"}
            </Button>
          )}

          {isNanosaur && status === "running" && (
            <>
              <Button variant="outline" onClick={callRestoreHealth}>Restore Health</Button>
              <Button variant="outline" onClick={callFillFuel}>Fill Fuel</Button>
            </>
          )}
        </div>

        {/* Speed multiplier slider for Otto Matic */}
        {config.hasSpeedMultiplier && status === "running" && (
          <div className="flex items-center gap-3 px-1">
            <span className="text-sm font-medium whitespace-nowrap">
              Speed: {speedMultiplier.toFixed(1)}×
            </span>
            <Slider
              className="w-40"
              min={0.25}
              max={4}
              step={0.25}
              value={[speedMultiplier]}
              onValueChange={handleSpeedChange}
            />
          </div>
        )}

        {status === "crashed" && errorLog.length > 0 && (
          <div className="bg-red-950/60 border border-red-800 rounded p-3 text-sm text-red-200 max-h-32 overflow-y-auto font-mono">
            {errorLog.map((msg, i) => (
              <div key={`${String(i)}-${msg.slice(0, 20)}`}>{msg}</div>
            ))}
          </div>
        )}

        {/* Game canvas */}
        <div className="flex-1 min-h-0 relative rounded overflow-hidden border border-border bg-black">
          {!config.wasmAvailable ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
              <p>No WASM build is available for {GAME_DISPLAY_NAMES[config.game]} yet.</p>
              <Button variant="outline" onClick={handleOpenRemote}>
                View Repository ↗
              </Button>
            </div>
          ) : useLocalWasm === false ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
              <p>
                Build the WASM port locally and place the output in{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  {`frontend/public/wasm/${config.wasmDir}/`}
                </code>
                , or play directly on GitHub Pages.
              </p>
              <Button variant="outline" onClick={handleOpenRemote}>
                Open on GitHub Pages ↗
              </Button>
            </div>
          ) : status === "idle" ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Press &quot;Start Game&quot; to launch
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              id="canvas"
              className="w-full h-full"
              tabIndex={0}
            />
          )}
        </div>

        <DialogFooter className="flex-row gap-2 justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground self-center">
            Click the canvas to capture mouse/keyboard. Press Escape or F to release.
          </p>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
