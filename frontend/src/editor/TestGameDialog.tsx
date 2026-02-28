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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OTTO_LEVELS,
  DEFAULT_OTTO_LEVEL,
} from "./utils/ottoLevelNumbers";

const WASM_BASE_PATH = `${import.meta.env.BASE_URL}wasm/ottomatic`;
const REMOTE_GAME_URL =
  "https://lachlanbwwright.github.io/OttoMatic-Android";

const MAX_ERROR_LOG_ENTRIES = 50;

type GameStatus = "loading" | "running" | "crashed" | "idle";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levelNumber: number;
  onLevelNumberChange: (n: number) => void;
  terrainRsrcBlob: Blob | null;
  terrainDataBlob: Blob | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeWriteToIframeFS(
  iframe: HTMLIFrameElement,
  path: string,
  data: Uint8Array,
): boolean {
  const contentWindow = iframe.contentWindow;
  if (!contentWindow) return false;

  const moduleObj = Reflect.get(contentWindow, "Module");
  if (!isRecord(moduleObj)) return false;

  const fsObj = Reflect.get(moduleObj, "FS");
  if (!isRecord(fsObj)) return false;

  const writeFile = Reflect.get(fsObj, "writeFile");
  if (typeof writeFile !== "function") return false;

  Reflect.apply(writeFile, fsObj, [path, data]);
  return true;
}

function safeCallCcall(
  iframe: HTMLIFrameElement,
  fnName: string,
  returnType: null,
  argTypes: string[],
  args: unknown[],
): boolean {
  const contentWindow = iframe.contentWindow;
  if (!contentWindow) return false;

  const moduleObj = Reflect.get(contentWindow, "Module");
  if (!isRecord(moduleObj)) return false;

  const ccall = Reflect.get(moduleObj, "ccall");
  if (typeof ccall !== "function") return false;

  Reflect.apply(ccall, moduleObj, [fnName, returnType, argTypes, args]);
  return true;
}

export function TestGameDialog({
  open,
  onOpenChange,
  levelNumber,
  onLevelNumberChange,
  terrainRsrcBlob,
  terrainDataBlob,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const [useLocalWasm, setUseLocalWasm] = useState<boolean | null>(null);
  const [fencesEnabled, setFencesEnabled] = useState(true);

  const levelInfo = OTTO_LEVELS[levelNumber] ?? OTTO_LEVELS[DEFAULT_OTTO_LEVEL];

  // Check if local WASM files are available
  useEffect(() => {
    if (useLocalWasm !== null) return;
    fetch(`${WASM_BASE_PATH}/OttoMatic.js`, { method: "HEAD" })
      .then((res) => { setUseLocalWasm(res.ok); })
      .catch(() => { setUseLocalWasm(false); });
  }, [useLocalWasm]);

  const gameUrl = useLocalWasm
    ? `${WASM_BASE_PATH}/OttoMatic.html?level=${String(levelNumber)}`
    : `${REMOTE_GAME_URL}/?level=${String(levelNumber)}`;

  const appendError = useCallback((msg: string) => {
    setErrorLog((prev) => [...prev.slice(-(MAX_ERROR_LOG_ENTRIES - 1)), msg]);
    setStatus("crashed");
  }, []);

  const handleIframeLoad = useCallback(() => {
    setStatus("running");
    setErrorLog([]);

    const iframe = iframeRef.current;
    if (!iframe) return;

    const writeFileToGame = (
      path: string,
      blob: Blob,
      thenSetPath: boolean,
    ) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (!(result instanceof ArrayBuffer)) return;

        const data = new Uint8Array(result);
        const wrote = safeWriteToIframeFS(iframe, path, data);

        if (!wrote) {
          appendError(
            "Failed to write terrain file to game virtual filesystem (cross-origin restriction).",
          );
          return;
        }

        if (thenSetPath) {
          safeCallCcall(
            iframe,
            "OttoMatic_SetTerrainPath",
            null,
            ["string"],
            [path],
          );
        }
      };
      reader.readAsArrayBuffer(blob);
    };

    if (terrainRsrcBlob && levelInfo) {
      const rsrcPath = `/Data/Terrain/${levelInfo.terrainFile}.rsrc`;
      writeFileToGame(rsrcPath, terrainRsrcBlob, false);
    }

    if (terrainDataBlob && levelInfo) {
      const terPath = `/Data/Terrain/${levelInfo.terrainFile}`;
      writeFileToGame(terPath, terrainDataBlob, true);
    }
  }, [terrainRsrcBlob, terrainDataBlob, levelInfo, appendError]);

  useEffect(() => {
    if (!open) return;

    const onMessage = (e: MessageEvent<unknown>) => {
      const payload = e.data;
      if (
        isRecord(payload) &&
        payload.type === "otto-crash" &&
        typeof payload.message === "string"
      ) {
        appendError(payload.message);
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [open, appendError]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setStatus("idle");
        setErrorLog([]);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleReboot = useCallback(() => {
    setIframeKey((k) => k + 1);
    setStatus("loading");
    setErrorLog([]);
  }, []);

  const handleDownloadTerrain = useCallback(() => {
    if (!terrainRsrcBlob || !levelInfo) return;
    const url = URL.createObjectURL(terrainRsrcBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${levelInfo.terrainFile}.rsrc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [terrainRsrcBlob, levelInfo]);

  const handleToggleFences = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const newState = !fencesEnabled;
    safeCallCcall(iframe, "OttoMatic_SetFenceCollisions", null, ["number"], [newState ? 1 : 0]);
    setFencesEnabled(newState);
  }, [fencesEnabled]);

  const hasTerrainData = terrainRsrcBlob !== null || terrainDataBlob !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Test Level in Otto Matic
            {levelInfo ? ` — ${levelInfo.name} (Level ${String(levelInfo.levelNumber + 1)})` : ""}
          </DialogTitle>
          <DialogDescription>
            {status === "loading" && "Loading game…"}
            {status === "running" &&
              (hasTerrainData
                ? `Game running with custom terrain${useLocalWasm ? " (local WASM)" : " (remote)"}. Terrain injection may be blocked by cross-origin policy — use the in-game upload panel as a fallback.`
                : `Game running with default terrain${useLocalWasm ? " (local WASM)" : " (remote)"}. Compile and download your level first to test custom terrain.`)}
            {status === "crashed" && "The game has encountered an error. Check the log below and try rebooting."}
            {status === "idle" && `Select a level number and start the game.${useLocalWasm === null ? " Checking for local WASM…" : useLocalWasm ? " Using local WASM build." : " Using remote game server."}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium" htmlFor="otto-level-select">
            Level:
          </label>
          <Select
            value={String(levelNumber)}
            onValueChange={(v) => onLevelNumberChange(Number(v))}
          >
            <SelectTrigger id="otto-level-select" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OTTO_LEVELS.map((l) => (
                  <SelectItem key={l.levelNumber} value={String(l.levelNumber)}>
                    {`Lv ${String(l.levelNumber + 1)}: ${l.name}`}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleReboot}>
            {status === "idle" ? "Start Game" : "Reboot Game"}
          </Button>

          {terrainRsrcBlob !== null && status !== "idle" && (
            <Button variant="outline" onClick={handleDownloadTerrain}>
              Download .ter.rsrc
            </Button>
          )}

          {status === "running" && (
            <Button
              variant={fencesEnabled ? "outline" : "destructive"}
              onClick={handleToggleFences}
            >
              {fencesEnabled ? "Fences: On" : "Fences: Off"}
            </Button>
          )}
        </div>

        {status === "crashed" && errorLog.length > 0 && (
          <div className="bg-red-950/60 border border-red-800 rounded p-3 text-sm text-red-200 max-h-32 overflow-y-auto font-mono">
            {errorLog.map((msg, i) => (
              <div key={`${String(i)}-${msg.slice(0, 20)}`}>{msg}</div>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 relative rounded overflow-hidden border border-border bg-black">
          {status === "idle" ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Press &quot;Start Game&quot; to launch Otto Matic
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={gameUrl}
              title="Otto Matic WebGL"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups"
              onLoad={handleIframeLoad}
              onError={() => appendError("Failed to load the game iframe.")}
            />
          )}
        </div>

        <DialogFooter className="flex-row gap-2 justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground self-center">
            Incorrect level data may crash the game. Use &quot;Reboot Game&quot;
            to restart.
          </p>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
