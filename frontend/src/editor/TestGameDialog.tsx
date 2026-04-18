import { useCallback, useRef, useState } from "react";
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
import {
  GAME_PORT_CONFIGS,
  getLevelIndex,
  type AnyLevelInfo,
} from "./utils/gamePortConfig";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: Game;
  levelNumber: number;
  onLevelNumberChange: (n: number) => void;
  terrainRsrcBlob: Blob | null;
  terrainDataBlob: Blob | null;
  terrainDataBase64: string | null;
}

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

interface PreviewModule {
  FS?: {
    writeFile: (path: string, data: Uint8Array) => void;
  };
  ccall?: (
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
  ) => unknown;
}

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

function isPreviewModule(value: unknown): value is PreviewModule {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const fs: unknown = Reflect.get(value, "FS");
  const ccall: unknown = Reflect.get(value, "ccall");
  if (!isFunction(ccall)) {
    return false;
  }

  if (typeof fs !== "object" || fs === null) {
    return false;
  }
  const writeFile: unknown = Reflect.get(fs, "writeFile");
  return isFunction(writeFile);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPreviewTerrainPaths(
  info: AnyLevelInfo | undefined,
  config: (typeof GAME_PORT_CONFIGS)[Game],
): { dataPath: string; rsrcPath: string | null } | null {
  if (!info || !("terrainFile" in info)) {
    return null;
  }
  const dataPath = config.terrain?.getDataPath
    ? config.terrain.getDataPath(info.terrainFile)
    : `/Data/Terrain/${info.terrainFile}`;
  const rsrcPath = config.terrain?.getRsrcPath
    ? config.terrain.getRsrcPath(info.terrainFile)
    : null;
  return { dataPath, rsrcPath };
}

async function waitForPreviewModule(
  targetWindow: WindowProxy | Window | null | undefined,
): Promise<PreviewModule | null> {
  if (!targetWindow) {
    return null;
  }
  for (let i = 0; i < 150; i += 1) {
    const candidate: unknown = Reflect.get(targetWindow, "Module");
    if (isPreviewModule(candidate)) {
      return candidate;
    }
    await sleep(100);
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildGameArguments(
  config: (typeof GAME_PORT_CONFIGS)[Game],
  levelNumber: number,
  terrainPath: string | null,
): string[] {
  switch (config.game) {
    case Game.OTTO_MATIC:
      return terrainPath
        ? ["--level", String(levelNumber), "--terrain", terrainPath]
        : ["--level", String(levelNumber)];
    case Game.NANOSAUR:
      return ["--level", String(levelNumber), "--skip-menu"];
    case Game.BUGDOM:
      return [];
    case Game.BUGDOM_2:
      return ["--level", String(levelNumber)];
    case Game.CRO_MAG:
      return ["--track", String(levelNumber), "--car", "1"];
    case Game.BILLY_FRONTIER:
      return ["--level", String(levelNumber)];
    case Game.MIGHTY_MIKE:
      return ["--level", `${String(Math.floor(levelNumber / 3))}:${String(levelNumber % 3)}`];
    case Game.NANOSAUR_2:
      return ["--level", String(levelNumber)];
    default:
      return [];
  }
}

function buildPreviewHtml(
  config: (typeof GAME_PORT_CONFIGS)[Game],
  levelNumber: number,
  terrainBase64: string | null,
  previewTerrainPaths: { dataPath: string; rsrcPath: string | null } | null,
): string {
  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const localAssetBase = new URL(`.generated/pangea-ports/wasm/${config.wasmDir}/`, appBaseUrl).href;
  const args = buildGameArguments(config, levelNumber, previewTerrainPaths?.dataPath ?? null);
  const previewUrl = new URL(`games/pangea-ports/games/${config.siteLaunchPath}`, appBaseUrl);
  previewUrl.search = config.buildLaunchQuery(levelNumber).toString();
  const extraGlobalBootstrap = [
    `window._startLevel = ${String(levelNumber)};`,
    config.game === Game.NANOSAUR ? "window._skipMenu = 1;" : "",
    config.game === Game.CRO_MAG ? `window._track = ${String(levelNumber)};` : "",
    config.game === Game.BUGDOM ? `window.BUGDOM_START_LEVEL = ${String(levelNumber)};` : "",
    config.game === Game.BUGDOM_2 ? `window._startLevel = ${String(levelNumber)};` : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(GAME_DISPLAY_NAMES[config.game])} Preview</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
    #loading-card {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 0.75rem;
      color: #e6edf3;
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(180deg, rgba(0,0,0,0.92), rgba(6,10,14,0.98));
      z-index: 2;
    }
    #canvas {
      display: block;
      width: 100vw;
      height: 100vh;
      outline: none;
      background: #000;
    }
    #status {
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="loading-card">
    <div style="font-size:18px;font-weight:600;">Launching ${escapeHtml(GAME_DISPLAY_NAMES[config.game])}</div>
    <div id="status">Preparing game runtime…</div>
  </div>
  <canvas id="canvas" tabindex="-1"></canvas>
  <script>
	    function decodeBase64ToBytes(base64) {
	      var binary = atob(base64);
	      var bytes = new Uint8Array(binary.length);
	      for (var i = 0; i < binary.length; i += 1) {
	        bytes[i] = binary.charCodeAt(i);
	      }
	      return bytes;
	    }

	    if (typeof history !== "undefined" && typeof history.replaceState === "function") {
	      history.replaceState(null, "", ${JSON.stringify(previewUrl.pathname + previewUrl.search)});
	    }
	    window.__previewLevel = ${String(levelNumber)};
	    window.__previewTerrainBase64 = ${JSON.stringify(terrainBase64)};
	    ${extraGlobalBootstrap}
	    window.Module = {
	      canvas: document.getElementById('canvas'),
	      arguments: ${JSON.stringify(args)},
	      preRun: [
	        function () {
	          if (!window.__previewTerrainBase64 || !${JSON.stringify(Boolean(previewTerrainPaths))}) return;
	          var bytes = decodeBase64ToBytes(window.__previewTerrainBase64);
	          var vfs =
	            typeof FS !== "undefined"
	              ? FS
	              : (typeof Module !== "undefined" && Module && Module.FS ? Module.FS : null);
	          if (!vfs || typeof vfs.writeFile !== "function") {
	            console.warn("Preview terrain preload skipped: FS.writeFile is unavailable");
	            return;
	          }
	          if (typeof vfs.analyzePath === "function" && typeof vfs.mkdir === "function") {
	            if (!vfs.analyzePath('/Data').exists) vfs.mkdir('/Data');
	            if (!vfs.analyzePath('/Data/Terrain').exists) vfs.mkdir('/Data/Terrain');
	          }
	          vfs.writeFile(${JSON.stringify(previewTerrainPaths?.dataPath ?? "")}, bytes);
	          ${previewTerrainPaths?.rsrcPath ? `vfs.writeFile(${JSON.stringify(previewTerrainPaths.rsrcPath)}, bytes);` : ""}
	        }
	      ],
	      locateFile: function(path) {
	        return new URL(path, ${JSON.stringify(localAssetBase)}).href;
      },
      setStatus: function(text) {
        var el = document.getElementById('status');
        var card = document.getElementById('loading-card');
        if (!text) {
          if (card) card.style.display = 'none';
          return;
        }
        if (el) el.textContent = text;
      },
      monitorRunDependencies: function(left) {
        var el = document.getElementById('status');
        if (el) el.textContent = left > 0 ? ('Loading game… (' + left + ')') : 'Starting game…';
      }
    };
    ${config.game === Game.NANOSAUR ? "window.SetCustomTerrainFile = function(path) { return Module.ccall('SetCustomTerrainFile', null, ['string'], [path]); };" : ""}
    ${config.game === Game.BUGDOM ? "window.BUGDOM_NO_FENCE_COLLISION = false;" : ""}
  </script>
  <script src="${escapeHtml(`${localAssetBase}${config.mainJs}`)}"></script>
</body>
</html>`;
}

export function TestGameDialog(props: Props) {
  const {
    open,
    onOpenChange,
    gameType,
    levelNumber,
    onLevelNumberChange,
    terrainDataBlob,
    terrainDataBase64,
  } = props;
  const config = GAME_PORT_CONFIGS[gameType];
  const [previewStarted, setPreviewStarted] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const currentLevelInfo =
    config.levels.find((level) => getLevelIndex(level) === levelNumber) ??
    config.levels[0];
  const previewTerrainPaths = getPreviewTerrainPaths(currentLevelInfo, config);
  const levelLabelText = currentLevelInfo
    ? levelLabel(currentLevelInfo, config.levels.indexOf(currentLevelInfo))
    : "";

  const previewHtml = buildPreviewHtml(
    config,
    levelNumber,
    terrainDataBase64,
    previewTerrainPaths,
  );

  const sourceLabel = "Direct game shell preview.";

  const injectPreviewIntoWindow = useCallback(
    async (targetWindow: Window | null | undefined) => {
      if (!targetWindow || !terrainDataBlob || !previewTerrainPaths) {
        return;
      }

      const module = await waitForPreviewModule(targetWindow);
      if (!module) {
        return;
      }

      const bytes = new Uint8Array(await terrainDataBlob.arrayBuffer());
      const fs = module.FS;
      if (!fs) {
        return;
      }
      fs.writeFile(previewTerrainPaths.dataPath, bytes);
      if (previewTerrainPaths.rsrcPath) {
        fs.writeFile(previewTerrainPaths.rsrcPath, bytes);
      }

      if (
        config.game !== Game.OTTO_MATIC &&
        config.terrain?.setPathFn &&
        config.terrain.getSetPathArg &&
        currentLevelInfo &&
        "terrainFile" in currentLevelInfo
      ) {
        const ccall = module.ccall;
        if (!ccall) {
          return;
        }
        ccall(config.terrain.setPathFn, null, ["string"], [
          config.terrain.getSetPathArg(currentLevelInfo.terrainFile),
        ]);
      }
    },
    [config, currentLevelInfo, previewTerrainPaths, terrainDataBlob],
  );

  const handleStartPreview = () => {
    setPreviewStarted(true);
    setPreviewKey((currentKey) => currentKey + 1);
  };

  const handleOpenInNewTab = () => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) return;
    previewWindow.document.open();
    previewWindow.document.write(previewHtml);
    previewWindow.document.close();
    void injectPreviewIntoWindow(previewWindow);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {`Preview in ${GAME_DISPLAY_NAMES[config.game]}`}
            {levelLabelText ? ` — ${levelLabelText}` : ""}
          </DialogTitle>
          <DialogDescription>
            {sourceLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium" htmlFor="game-level-select">
            {"trackNumber" in (config.levels[0] ?? {}) ? "Track:" : "Level:"}
          </label>
          <Select
            value={String(levelNumber)}
            onValueChange={(value) => onLevelNumberChange(Number(value))}
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

          <Button variant="outline" onClick={handleStartPreview}>
            {previewStarted ? "Reload Preview" : "Start Preview"}
          </Button>

          <Button variant="outline" onClick={handleOpenInNewTab}>
            Open in New Tab ↗
          </Button>
        </div>

        <div className="flex-1 min-h-0 relative rounded overflow-hidden border border-border bg-black">
          {!previewStarted ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center p-6">
              Launch the direct game shell to jump straight into the selected level.
            </div>
          ) : (
            <iframe
              ref={previewFrameRef}
              key={`${String(previewKey)}-${String(levelNumber)}`}
              title={`${GAME_DISPLAY_NAMES[config.game]} preview`}
              srcDoc={previewHtml}
              onLoad={() => {
                void injectPreviewIntoWindow(previewFrameRef.current?.contentWindow);
              }}
              className="absolute inset-0 h-full w-full border-0 bg-black"
              allow="fullscreen"
            />
          )}
        </div>

        <DialogFooter className="flex-row gap-2 justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground self-center">
            The level selector stays here; the game shell opens directly below.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
