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
import { Progress } from "@/components/ui/progress";
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

/**
 * Builds the srcdoc HTML for an iframe that hosts the game.
 * The iframe has its own isolated browsing context, preventing script
 * re-declaration errors (ExitStatus, etc.) when the dialog is reopened.
 */
function buildGameIframeSrc(
  basePath: string,
  mainJs: string,
  cdnBaseUrl: string | undefined,
  gameType: Game,
  levelIndex: number,
  bugdomStartLevel: number | undefined,
): string {
  const preloadVars = gameType === Game.BUGDOM && bugdomStartLevel !== undefined
    ? `window.BUGDOM_START_LEVEL = ${String(bugdomStartLevel)};`
    : "";

  const locateFileBody = cdnBaseUrl
    ? `if (path.endsWith('.data')) return '${cdnBaseUrl}/' + path; return '${basePath}/' + path;`
    : `return '${basePath}/' + path;`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: black; overflow: hidden; width: 100vw; height: 100vh; }
  canvas { width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
<canvas id="canvas" tabindex="0"></canvas>
<script>
${preloadVars}
window.Module = {
  canvas: document.getElementById('canvas'),
  locateFile: function(path) { ${locateFileBody} },
  setStatus: function(text) {
    const m = /(\\d+(?:\\.\\d+)?)\\/(\\d+)/.exec(text);
    if (m) {
      window.parent.postMessage({ type: 'progress', downloaded: parseFloat(m[1]), total: parseFloat(m[2]), text: text }, '*');
    } else if (text === '') {
      window.parent.postMessage({ type: 'progress', downloaded: 1, total: 1, text: '' }, '*');
    } else {
      window.parent.postMessage({ type: 'status', text: text }, '*');
    }
  },
  monitorRunDependencies: function(left) {
    if (left === 0) window.parent.postMessage({ type: 'progress', downloaded: 1, total: 1, text: '' }, '*');
  },
  onRuntimeInitialized: function() {
    window.parent.postMessage({ type: 'running', levelIndex: ${String(levelIndex)} }, '*');
  },
  onAbort: function() {
    window.parent.postMessage({ type: 'crashed', msg: 'Game crashed unexpectedly.' }, '*');
  }
};
window.addEventListener('message', function(e) {
  const d = e.data;
  if (!d || !d.cmd) return;
  try {
    if (d.cmd === 'ccall' && window.Module && window.Module.ccall) {
      window.Module.ccall(d.fn, d.returnType || null, d.argTypes || [], d.args || []);
    } else if (d.cmd === 'writeFile' && window.Module && window.Module.FS) {
      window.Module.FS.writeFile(d.path, new Uint8Array(d.data));
      if (d.thenCallFn && window.Module && window.Module.ccall) {
        window.Module.ccall(d.thenCallFn, null, ['string'], [d.thenCallArg]);
      }
    } else if (d.cmd === 'setWindowGlobal') {
      window[d.key] = d.value;
    }
  } catch(err) {
    window.parent.postMessage({ type: 'error', msg: String(err) }, '*');
  }
});
</script>
<script src="${basePath}/${mainJs}" onerror="window.parent.postMessage({type:'crashed',msg:'Failed to load game script: ${mainJs}'},'*')"></script>
</body>
</html>`;
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  /** Interval ref for periodic skip-to-level retries after game starts. */
  const skipRetryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<GameStatus>("idle");
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [gameKey, setGameKey] = useState(0);
  const [fencesEnabled, setFencesEnabled] = useState(true);
  const [godModeEnabled, setGodModeEnabled] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [loadStatusText, setLoadStatusText] = useState<string>("");

  // Refs that capture values at game-start time
  const capturedLevelRef = useRef(levelNumber);
  const terrainRsrcBlobRef = useRef(terrainRsrcBlob);
  const terrainDataBlobRef = useRef(terrainDataBlob);
  useEffect(() => {
    terrainRsrcBlobRef.current = terrainRsrcBlob;
    terrainDataBlobRef.current = terrainDataBlob;
  }, [terrainRsrcBlob, terrainDataBlob]);

  const config = GAME_PORT_CONFIGS[gameType];

  const [fetchedLocalWasm, setFetchedLocalWasm] = useState<boolean | null>(null);
  const useLocalWasm = config.wasmAvailable ? fetchedLocalWasm : false;

  useEffect(() => {
    if (!config.wasmAvailable) return;
    const jsPath = `${import.meta.env.BASE_URL}wasm/${config.wasmDir}/${config.mainJs}`;
    let cancelled = false;
    fetch(jsPath, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) {
          const ct = res.headers.get("content-type") ?? "";
          setFetchedLocalWasm(res.ok && ct.includes("javascript"));
        }
      })
      .catch(() => { if (!cancelled) setFetchedLocalWasm(false); });
    return () => { cancelled = true; };
  }, [gameType, config.wasmAvailable, config.wasmDir, config.mainJs]);

  const appendError = useCallback((msg: string) => {
    setErrorLog((prev) => [...prev.slice(-(MAX_ERROR_LOG_ENTRIES - 1)), msg]);
    setStatus("crashed");
  }, []);

  // Listen for postMessage events from the game iframe
  useEffect(() => {
    if (gameKey === 0) return;

    /** Extracts a typed property from an `unknown` object without assertions. */
    function getProp<T>(
      obj: unknown,
      key: string,
      guard: (v: unknown) => v is T,
    ): T | undefined {
      if (typeof obj !== "object" || obj === null) return undefined;
      const entries = Object.entries(obj);
      const pair = entries.find(([k]) => k === key);
      if (!pair) return undefined;
      return guard(pair[1]) ? pair[1] : undefined;
    }
    const isStr = (v: unknown): v is string => typeof v === "string";
    const isNum = (v: unknown): v is number => typeof v === "number";

    const handleMessage = (e: MessageEvent) => {
      // Only accept messages from our iframe
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      // Treat e.data as unknown by passing it to a parameter typed 'unknown'
      const data: unknown = e.data;
      if (typeof data !== "object" || data === null) return;

      const msgType = getProp(data, "type", isStr);
      if (!msgType) return;

      switch (msgType) {
        case "progress": {
          const downloaded = getProp(data, "downloaded", isNum) ?? 0;
          const total = getProp(data, "total", isNum) ?? 1;
          const text = getProp(data, "text", isStr) ?? "";
          setLoadStatusText(text);
          setLoadProgress(total > 0 ? (downloaded / total) * 100 : null);
          break;
        }
        case "status":
          setLoadStatusText(getProp(data, "text", isStr) ?? "");
          break;
        case "running": {
          setStatus("running");
          const capturedLevel = capturedLevelRef.current;

          /** Send a single skip-to-level ccall for the current game. */
          const sendSkip = (skipCall: ReturnType<typeof config.getSkipToLevelCcall>) => {
            if (!skipCall) return;
            iframeRef.current?.contentWindow?.postMessage({
              cmd: "ccall",
              fn: skipCall.fn,
              returnType: skipCall.returnType,
              argTypes: skipCall.argTypes,
              args: skipCall.args,
            }, "*");
          };

          // Start a periodic retry interval: OttoMatic_SkipToLevel only works once
          // the game's main loop is in a level-playing state. Retry every 2 s for
          // up to 10 attempts (20 s total) to catch when the game enters gameplay.
          if (skipRetryIntervalRef.current) clearInterval(skipRetryIntervalRef.current);
          const skipCall = config.getSkipToLevelCcall?.(capturedLevel);
          if (skipCall) {
            let retryCount = 0;
            skipRetryIntervalRef.current = setInterval(() => {
              sendSkip(skipCall);
              retryCount++;
              if (retryCount >= 10 && skipRetryIntervalRef.current) {
                clearInterval(skipRetryIntervalRef.current);
                skipRetryIntervalRef.current = null;
              }
            }, 2000);
          }

          // Inject terrain for Otto Matic, then skip to level
          if (gameType === Game.OTTO_MATIC) {
            const ottoLevel = OTTO_LEVELS[capturedLevel];
            if (ottoLevel) {
              const rsrcBlob = terrainRsrcBlobRef.current;
              const dataBlob = terrainDataBlobRef.current;
              const terrainPath = `/Data/Terrain/${ottoLevel.terrainFile}`;

              const setPathAndSkip = () => {
                // Tell the game which terrain to load
                iframeRef.current?.contentWindow?.postMessage({
                  cmd: "ccall",
                  fn: "OttoMatic_SetTerrainPath",
                  returnType: null,
                  argTypes: ["string"],
                  args: [terrainPath],
                }, "*");
                // Also send the skip call immediately (interval handles retries)
                sendSkip(skipCall ?? null);
              };

              const writeDataThenFinish = () => {
                if (dataBlob) {
                  dataBlob.arrayBuffer().then((buf) => {
                    iframeRef.current?.contentWindow?.postMessage({
                      cmd: "writeFile",
                      path: terrainPath,
                      data: buf,
                    }, "*", [buf]);
                    setPathAndSkip();
                  }).catch(() => {
                    appendError("Failed to read terrain data blob.");
                    setPathAndSkip();
                  });
                } else {
                  setPathAndSkip();
                }
              };

              if (rsrcBlob) {
                rsrcBlob.arrayBuffer().then((buf) => {
                  iframeRef.current?.contentWindow?.postMessage({
                    cmd: "writeFile",
                    path: `${terrainPath}.rsrc`,
                    data: buf,
                  }, "*", [buf]);
                  writeDataThenFinish();
                }).catch(() => {
                  appendError("Failed to read terrain rsrc blob.");
                  writeDataThenFinish();
                });
              } else {
                writeDataThenFinish();
              }
            }
          }
          break;
        }
        case "crashed":
          appendError(getProp(data, "msg", isStr) ?? "Game crashed.");
          break;
        case "error":
          appendError(getProp(data, "msg", isStr) ?? "Game error.");
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [gameKey, gameType, config, appendError]);

  // Create the game iframe when a game session starts
  useEffect(() => {
    if (gameKey === 0 || !useLocalWasm) return;

    const capturedLevel = capturedLevelRef.current;
    const basePath = `${import.meta.env.BASE_URL}wasm/${config.wasmDir}`;
    const absoluteBasePath = new URL(basePath, window.location.href).href;
    const absoluteCdnUrl = config.cdnBaseUrl;

    const bugdomStartLevel = gameType === Game.BUGDOM ? capturedLevel : undefined;

    const srcdoc = buildGameIframeSrc(
      absoluteBasePath,
      config.mainJs,
      absoluteCdnUrl,
      gameType,
      capturedLevel,
      bugdomStartLevel,
    );

    const iframe = document.createElement("iframe");
    iframe.srcdoc = srcdoc;
    iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:none;";
    // allow-same-origin is required for Emscripten's virtual FS (IDBFS/MemFS) and
    // WASM shared-memory APIs. The iframe content is our own bundled game code, so
    // the same-origin + scripts combination is intentional and safe in this context.
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    iframeRef.current = iframe;

    // The placeholder div will be replaced by the iframe
    const container = document.getElementById("game-iframe-container");
    if (container) container.appendChild(iframe);

    return () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      iframeRef.current = null;
    };
  }, [gameKey, useLocalWasm, gameType, config]);

  /** Send a ccall command to the game iframe. */
  const sendCcall = useCallback((fn: string, argTypes: string[], args: unknown[]) => {
    iframeRef.current?.contentWindow?.postMessage({ cmd: "ccall", fn, returnType: null, argTypes, args }, "*");
  }, []);

  const handleStartOrReboot = useCallback(() => {
    // Clear any pending skip-level interval before starting a new game session
    if (skipRetryIntervalRef.current) {
      clearInterval(skipRetryIntervalRef.current);
      skipRetryIntervalRef.current = null;
    }
    capturedLevelRef.current = levelNumber;
    setStatus("loading");
    setErrorLog([]);
    setFencesEnabled(true);
    setGodModeEnabled(false);
    setSpeedMultiplier(1.0);
    setLoadProgress(0);
    setLoadStatusText("Loading game…");
    setGameKey((k) => k + 1);
  }, [levelNumber]);

  /** Manually trigger a skip-to-level ccall (useful if the auto-retry was too early). */
  const handleManualSkipToLevel = useCallback(() => {
    const skipCall = config.getSkipToLevelCcall?.(capturedLevelRef.current);
    if (!skipCall) return;
    iframeRef.current?.contentWindow?.postMessage({
      cmd: "ccall",
      fn: skipCall.fn,
      returnType: skipCall.returnType,
      argTypes: skipCall.argTypes,
      args: skipCall.args,
    }, "*");
  }, [config]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        // Keep the game running in background — intentionally do NOT reset gameKey or status.
        // forceMount on DialogContent keeps the iframe in the DOM even when closed,
        // so no re-download is needed when reopening. Only error log is cleared.
        setErrorLog([]);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleOpenRemote = useCallback(() => {
    window.open(config.remoteGameUrl(levelNumber), "_blank", "noopener,noreferrer");
  }, [config, levelNumber]);

  const handleToggleFences = useCallback(() => {
    const next = !fencesEnabled;
    const flag = next ? 1 : 0;
    switch (gameType) {
      case Game.OTTO_MATIC:
        sendCcall("OttoMatic_SetFenceCollisions", ["number"], [flag]);
        break;
      case Game.NANOSAUR:
        sendCcall("SetFenceCollisionsEnabled", ["number"], [flag]);
        break;
      case Game.BUGDOM:
        sendCcall("BugdomSetFenceCollision", ["number"], [flag]);
        break;
      case Game.BUGDOM_2:
        sendCcall("gameAPI_setFenceCollisionEnabled", ["number"], [flag]);
        break;
      case Game.CRO_MAG:
        sendCcall("GameCheat_setFenceCollision", ["number"], [flag]);
        break;
      case Game.BILLY_FRONTIER:
        sendCcall("BF_SetFenceCollision", ["number"], [flag]);
        break;
      case Game.NANOSAUR_2:
        sendCcall("Nanosaur2_SetFenceCollisionsEnabled", ["number"], [flag]);
        break;
      default:
        break;
    }
    setFencesEnabled(next);
  }, [fencesEnabled, gameType, sendCcall]);

  const handleToggleGodMode = useCallback(() => {
    const next = !godModeEnabled;
    sendCcall("OttoMatic_SetGodMode", ["number"], [next ? 1 : 0]);
    setGodModeEnabled(next);
  }, [godModeEnabled, sendCcall]);

  const handleSpeedChange = useCallback((values: number[]) => {
    const val = values[0] ?? 1;
    sendCcall("OttoMatic_SetSpeedMultiplier", ["number"], [val]);
    setSpeedMultiplier(val);
  }, [sendCcall]);

  const handleRestoreHealth = useCallback(() => {
    sendCcall("CheatRestoreHealth", [], []);
  }, [sendCcall]);

  const handleFillFuel = useCallback(() => {
    sendCcall("CheatFillFuel", [], []);
  }, [sendCcall]);

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
  const currentLevelInfo =
    config.levels.find((l) => getLevelIndex(l) === levelNumber) ?? config.levels[0];
  const levelLabelText = currentLevelInfo
    ? levelLabel(currentLevelInfo, config.levels.indexOf(currentLevelInfo))
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* forceMount keeps the content (and game iframe) in the DOM when dialog is closed,
          avoiding a full game reload on reopen. CSS 'hidden' visually hides it. */}
      <DialogContent
        forceMount
        className={`max-w-5xl w-[95vw] h-[90vh] flex flex-col${!open ? " hidden" : ""}`}
      >
        <DialogHeader>
          <DialogTitle>
            {`Test Level in ${GAME_DISPLAY_NAMES[config.game]}`}
            {levelLabelText ? ` — ${levelLabelText}` : ""}
          </DialogTitle>
          <DialogDescription>
            {!config.wasmAvailable && "WASM build not yet available for this game."}
            {config.wasmAvailable && useLocalWasm === null && "Checking for local WASM build…"}
            {config.wasmAvailable && useLocalWasm === false &&
              'No local WASM found. Use "Open on GitHub Pages" to play in a new tab.'}
            {config.wasmAvailable && useLocalWasm === true && status === "idle" &&
              'Local WASM detected. Press "Start Game" to launch.'}
            {status === "loading" && "Loading game…"}
            {status === "running" && isOttoMatic &&
              (hasTerrainData
                ? "Game running with custom terrain (local WASM)."
                : "Game running with default terrain.")}
            {status === "running" && !isOttoMatic && "Game running."}
            {status === "crashed" &&
              "The game has encountered an error. Check the log below and try rebooting."}
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

          {config.getSkipToLevelCcall && status === "running" && (
            <Button variant="outline" onClick={handleManualSkipToLevel} title="Manually trigger skip to selected level (if game is in gameplay)">
              Skip to Level {capturedLevelRef.current}
            </Button>
          )}

          {isNanosaur && status === "running" && (
            <>
              <Button variant="outline" onClick={handleRestoreHealth}>
                Restore Health
              </Button>
              <Button variant="outline" onClick={handleFillFuel}>
                Fill Fuel
              </Button>
            </>
          )}
        </div>

        {/* Speed multiplier slider for Otto Matic */}
        {config.hasSpeedMultiplier && status === "running" && (
          <div className="flex items-center gap-3 px-1">
            <span className="text-sm font-medium whitespace-nowrap">
              Player Speed: {speedMultiplier.toFixed(1)}×
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

        {status === "loading" && loadProgress !== null && (
          <div className="flex flex-col gap-1 px-1">
            <Progress value={loadProgress} className="h-2" />
            {loadStatusText && (
              <p className="text-xs text-muted-foreground">{loadStatusText}</p>
            )}
          </div>
        )}

        {/* Game container — iframe lives here when active */}
        <div
          id="game-iframe-container"
          className="flex-1 min-h-0 relative rounded overflow-hidden border border-border bg-black"
        >
          {!config.wasmAvailable ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
              <p>
                No WASM build is available for {GAME_DISPLAY_NAMES[config.game]} yet.
              </p>
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
          ) : gameKey === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Press &quot;Start Game&quot; to launch
            </div>
          ) : null}
          {/* iframe is dynamically appended into this div by the useEffect above */}
        </div>

        <DialogFooter className="flex-row gap-2 justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground self-center">
            Click the game to capture mouse/keyboard. Press Escape or F to release.
          </p>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
