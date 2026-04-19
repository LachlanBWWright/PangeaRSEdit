import { Game } from "../../data/globals/globals";
import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";

export const GAME_DISPLAY_NAMES: Readonly<Record<Game, string>> = {
  [Game.OTTO_MATIC]: "Otto Matic",
  [Game.NANOSAUR]: "Nanosaur",
  [Game.BUGDOM]: "Bugdom",
  [Game.BUGDOM_2]: "Bugdom 2",
  [Game.CRO_MAG]: "Cro-Mag Rally",
  [Game.BILLY_FRONTIER]: "Billy Frontier",
  [Game.MIGHTY_MIKE]: "Mighty Mike",
  [Game.NANOSAUR_2]: "Nanosaur 2",
};

export interface PreviewTerrainPaths {
  readonly dataPath: string;
  readonly rsrcPath: string | null;
}

export interface PreviewRuntimeModule {
  canvas: HTMLCanvasElement;
  arguments: string[];
  preInit?: Array<() => void>;
  preRun: Array<() => void>;
  locateFile: (path: string) => string;
  webglContextAttributes?: {
    powerPreference?: string;
    antialias?: boolean;
    preserveDrawingBuffer?: boolean;
  };
  setStatus?: (text: string) => void;
  monitorRunDependencies?: (left: number) => void;
  onRuntimeInitialized?: () => void;
  onAbort?: (reason: unknown) => void;
  FS?: {
    writeFile: (path: string, data: Uint8Array) => void;
    analyzePath?: (path: string) => { exists: boolean };
    mkdir?: (path: string) => void;
  };
  FS_createPath?: (
    parent: string,
    path: string,
    canRead: boolean,
    canWrite: boolean,
  ) => void;
  ccall?: (
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
  ) => unknown;
  calledRun?: boolean;
}

type PreviewWindow = Window & {
    Module?: PreviewRuntimeModule;
    SetCustomTerrainFile?: (path: string) => unknown;
  };

export function levelLabel(info: AnyLevelInfo, idx: number): string {
  if ("trackNumber" in info) {
    return `Track ${String(info.trackNumber)}: ${info.name}`;
  }
  if ("areaNumber" in info) {
    return `Area ${String(info.areaNumber + 1)}: ${info.name}`;
  }
  return `Lv ${String(idx + 1)}: ${info.name}`;
}

export function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function buildGameArguments(
  config: GamePortConfig,
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
      return [];
    case Game.MIGHTY_MIKE:
      return ["--level", `${String(Math.floor(levelNumber / 3))}:${String(levelNumber % 3)}`];
    case Game.NANOSAUR_2:
      return ["--level", String(levelNumber)];
    default:
      return [];
  }
}

export function getPreviewTerrainPaths(
  info: AnyLevelInfo | undefined,
  config: GamePortConfig,
): PreviewTerrainPaths | null {
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

export function buildPreviewAssetBaseUrl(config: GamePortConfig): string {
  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  return new URL(`.generated/pangea-ports/wasm/${config.wasmDir}/`, appBaseUrl).href;
}

function ensureDir(vfs: NonNullable<PreviewRuntimeModule["FS"]>, path: string): void {
  try {
    if (typeof vfs.analyzePath === "function" && vfs.analyzePath(path).exists) {
      return;
    }
  } catch {
    // Fall through and let mkdir handle the race.
  }
  try {
    vfs.mkdir?.(path);
  } catch {
    // Ignore existing-path races.
  }
}

function ensurePreviewPrefsDirs(module: PreviewRuntimeModule, config: GamePortConfig): void {
  const fsCreatePath = module.FS_createPath;

  if (typeof fsCreatePath === "function") {
    try {
      fsCreatePath("/", "home", true, true);
      fsCreatePath("/home", "web_user", true, true);
      fsCreatePath("/home/web_user", ".config", true, true);
      fsCreatePath(`/home/web_user/.config`, config.prefsFolderName, true, true);
      return;
    } catch {
      // Fall back to the FS API below if the generated helper is unavailable.
    }
  }

  const vfs = module.FS;
  if (!vfs) {
    return;
  }

  ensureDir(vfs, "/home");
  ensureDir(vfs, "/home/web_user");
  ensureDir(vfs, "/home/web_user/.config");
  ensureDir(vfs, `/home/web_user/.config/${config.prefsFolderName}`);
}

export function applyPreviewGlobals(
  win: PreviewWindow,
  config: GamePortConfig,
  levelNumber: number,
): () => void {
  const previousValues = new Map<string, unknown>();
  const setGlobal = (key: string, value: unknown) => {
    previousValues.set(key, Reflect.get(win, key));
    Reflect.set(win, key, value);
  };

  if (config.game === Game.NANOSAUR) {
    setGlobal("SetCustomTerrainFile", (path: string) => {
      const module = win.Module;
      return module?.ccall?.("SetCustomTerrainFile", null, ["string"], [path]);
    });
  }

  if (config.game === Game.BUGDOM) {
    setGlobal("BUGDOM_NO_FENCE_COLLISION", false);
  }

  const preloadVars = config.getPreLoadVars?.(levelNumber) ?? {};
  for (const [key, value] of Object.entries(preloadVars)) {
    setGlobal(key, value);
  }

  if (
    config.game === Game.OTTO_MATIC ||
    config.game === Game.NANOSAUR ||
    config.game === Game.BUGDOM ||
    config.game === Game.BUGDOM_2 ||
    config.game === Game.NANOSAUR_2
  ) {
    setGlobal("_startLevel", levelNumber);
  }
  if (config.game === Game.NANOSAUR) {
    setGlobal("_skipMenu", 1);
  }
  if (config.game === Game.CRO_MAG) {
    setGlobal("_track", levelNumber);
  }

  return () => {
    for (const [key, value] of previousValues.entries()) {
      if (typeof value === "undefined") {
        delete (win as unknown as Record<string, unknown>)[key];
      } else {
        Reflect.set(win, key, value);
      }
    }
  };
}

export interface PreviewModuleOptions {
  readonly config: GamePortConfig;
  readonly levelNumber: number;
  readonly currentLevelInfo: AnyLevelInfo | undefined;
  readonly canvas: HTMLCanvasElement;
  readonly assetBaseUrl: string;
  readonly cacheBustToken: string;
  readonly terrainBytes: Uint8Array | null;
  readonly terrainPaths: PreviewTerrainPaths | null;
  readonly onStatus: (text: string) => void;
  readonly onError: (text: string) => void;
}

export function createPreviewModule(
  options: PreviewModuleOptions,
): PreviewRuntimeModule {
  const {
    config,
    levelNumber,
    currentLevelInfo,
    canvas,
    assetBaseUrl,
    cacheBustToken,
    terrainBytes,
    terrainPaths,
    onStatus,
    onError,
  } = options;

  let runtimeInitialized = false;

  return {
    canvas,
    webglContextAttributes: {
      powerPreference: "high-performance",
      antialias: false,
      preserveDrawingBuffer: false,
    },
    arguments: buildGameArguments(config, levelNumber, terrainPaths?.dataPath ?? null),
    preInit: [
      () => {
        const module = (window as unknown as PreviewWindow).Module;
        if (!module) {
          return;
        }

        ensurePreviewPrefsDirs(module, config);
      },
    ],
    preRun: [
      () => {
        const module = (window as unknown as PreviewWindow).Module;
        if (!module) {
          return;
        }

        ensurePreviewPrefsDirs(module, config);
      },
    ],
    locateFile: (path: string) => new URL(path, assetBaseUrl).href + `?v=${cacheBustToken}`,
    setStatus: (text: string) => {
      onStatus(text);
    },
    monitorRunDependencies: (left: number) => {
      if (runtimeInitialized) return;
      onStatus(left > 0 ? `Loading game… (${left})` : "Starting game…");
    },
    onRuntimeInitialized: () => {
      runtimeInitialized = true;
      onStatus("");

      const module = (window as unknown as PreviewWindow).Module;
      if (!module) {
        return;
      }

      if (terrainBytes && terrainPaths) {
        const vfs = module.FS;
        if (!vfs) {
          onError("Preview terrain injection skipped: FS is unavailable.");
          return;
        }
        if (typeof vfs.mkdir === "function") {
          ensureDir(vfs, "/Data");
          ensureDir(vfs, "/Data/Terrain");
        }
        if (typeof vfs.writeFile !== "function") {
          onError("Preview terrain injection skipped: FS.writeFile is unavailable.");
          return;
        }
        // For RSRC_FORK games the terrain bytes are the resource fork.
        // Write only to the .rsrc sidecar so the data fork (often much larger)
        // is not overwritten with the wrong content.
        if (terrainPaths.rsrcPath) {
          vfs.writeFile(terrainPaths.rsrcPath, terrainBytes);
        } else {
          vfs.writeFile(terrainPaths.dataPath, terrainBytes);
        }

        if (
          config.terrain?.setPathFn &&
          config.terrain.getSetPathArg &&
          currentLevelInfo &&
          "terrainFile" in currentLevelInfo
        ) {
          module.ccall?.(config.terrain.setPathFn, null, ["string"], [
            config.terrain.getSetPathArg(currentLevelInfo.terrainFile),
          ]);
        }
      }

      const skipToLevel = config.getSkipToLevelCcall?.(levelNumber);
      if (skipToLevel) {
        module.ccall?.(
          skipToLevel.fn,
          skipToLevel.returnType,
          skipToLevel.argTypes,
          skipToLevel.args,
        );
      }
    },
    onAbort: (reason: unknown) => {
      const message =
        typeof reason === "string"
          ? reason
          : reason instanceof Error
            ? reason.message
            : "Game runtime aborted.";
      onError(message);
    },
  };
}

export async function loadPreviewRuntime(
  module: PreviewRuntimeModule,
  scriptUrl: string,
): Promise<() => void> {
  let stopped = false;
  const pendingRafIds = new Set<number>();
  const realRaf = window.requestAnimationFrame.bind(window);
  const realCaf = window.cancelAnimationFrame.bind(window);

  function gameRaf(callback: FrameRequestCallback): number {
    const id = realRaf((time: number) => {
      pendingRafIds.delete(id);
      if (!stopped) callback(time);
    });
    pendingRafIds.add(id);
    return id;
  }

  function gameCaf(id: number): void {
    pendingRafIds.delete(id);
    realCaf(id);
  }

  const response = await fetch(scriptUrl, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Failed to load ${scriptUrl}: ${response.status}`);
  }

  const source = await response.text();
  // Shadow requestAnimationFrame/cancelAnimationFrame so that the game's main
  // loop uses our tracked wrappers. This lets us cancel the loop on cleanup
  // without patching the real global (which would affect React/Three.js).
  const runner = new Function(
    "module",
    "window",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    `"use strict"; var Module = module;\n${source}\nreturn Module;`,
  ) as (
    module: PreviewRuntimeModule,
    window: Window,
    raf: (cb: FrameRequestCallback) => number,
    caf: (id: number) => void,
  ) => PreviewRuntimeModule;
  runner(module, window, gameRaf, gameCaf);

  return () => {
    stopped = true;
    for (const id of pendingRafIds) realCaf(id);
    pendingRafIds.clear();
  };
}
