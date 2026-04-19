import { Game } from "../../data/globals/globals";
import { Result } from "neverthrow";
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
  postRun?: Array<() => void>;
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
  if (typeof vfs.analyzePath === "function") {
    const analyzeResult = Result.fromThrowable(
      () => vfs.analyzePath!(path),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
    if (analyzeResult.isOk() && analyzeResult.value.exists) return;
  }
  Result.fromThrowable(
    () => { vfs.mkdir?.(path); },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();
}

function ensurePreviewPrefsDirs(module: PreviewRuntimeModule, config: GamePortConfig): void {
  const fsCreatePath = module.FS_createPath;

  if (typeof fsCreatePath === "function") {
    const createResult = Result.fromThrowable(
      () => {
        fsCreatePath("/", "home", true, true);
        fsCreatePath("/home", "web_user", true, true);
        fsCreatePath("/home/web_user", ".config", true, true);
        fsCreatePath(`/home/web_user/.config`, config.prefsFolderName, true, true);
      },
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
    if (createResult.isOk()) return;
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
  /** Bytes for the data-fork terrain path (.ter images for STANDARD, compiled .ter for TRT_FILE). */
  readonly terrainDataBytes: Uint8Array | null;
  /** Bytes for the resource-fork terrain path (.ter.rsrc map data for STANDARD / RSRC_FORK). */
  readonly terrainRsrcBytes: Uint8Array | null;
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
    terrainDataBytes,
    terrainRsrcBytes,
    terrainPaths,
    onStatus,
    onError,
  } = options;

  let runtimeInitialized = false;
  // Fallback: if the game's Emscripten build never fires onRuntimeInitialized or
  // postRun (e.g. emscripten_exit_with_live_runtime builds), clear the overlay
  // after a generous timeout so the user isn't stuck on the loading screen.
  let overlayFallbackTimer: ReturnType<typeof window.setTimeout> | undefined;
  function scheduleOverlayFallback(): void {
    if (overlayFallbackTimer !== undefined) return;
    overlayFallbackTimer = window.setTimeout(() => {
      if (!runtimeInitialized) {
        runtimeInitialized = true;
        onStatus("");
      }
    }, 8_000);
  }
  function clearOverlayFallback(): void {
    if (overlayFallbackTimer !== undefined) {
      window.clearTimeout(overlayFallbackTimer);
      overlayFallbackTimer = undefined;
    }
  }

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
        // Schedule overlay fallback here — preRun is reliably called just before
        // main() so the timer starts as late as possible to minimise false fires.
        scheduleOverlayFallback();
      },
    ],
    locateFile: (path: string) => new URL(path, assetBaseUrl).href + `?v=${cacheBustToken}`,
    setStatus: (text: string) => {
      // Block non-empty status updates after the runtime is up (they would re-show
      // the loading overlay). Always pass empty-string through so that builds which
      // never fire onRuntimeInitialized/postRun can still clear the overlay via the
      // standard Emscripten "setStatus('')" call.
      if (!runtimeInitialized || text === "") {
        onStatus(text);
      }
    },
    monitorRunDependencies: (left: number) => {
      if (runtimeInitialized) return;
      onStatus(left > 0 ? `Loading game… (${left})` : "Starting game…");
    },
    onRuntimeInitialized: () => {
      clearOverlayFallback();
      runtimeInitialized = true;
      onStatus("");

      const module = (window as unknown as PreviewWindow).Module;
      if (!module) {
        return;
      }

      if (terrainPaths && (terrainDataBytes ?? terrainRsrcBytes)) {
        const vfs = module.FS;
        if (!vfs) {
          onError("Preview terrain injection skipped: FS is unavailable.");
          return;
        }
        if (typeof vfs.writeFile !== "function") {
          onError("Preview terrain injection skipped: FS.writeFile is unavailable.");
          return;
        }
        if (typeof vfs.mkdir === "function") {
          ensureDir(vfs, "/Data");
          ensureDir(vfs, "/Data/Terrain");
        }

        // Write the data-fork file (.ter images for STANDARD, compiled level for TRT_FILE).
        if (terrainDataBytes) {
          const writeDataResult = Result.fromThrowable(
            () => vfs.writeFile(terrainPaths.dataPath, terrainDataBytes),
            (e) => (e instanceof Error ? e : new Error(String(e))),
          )();
          if (writeDataResult.isErr()) {
            onError(`Failed to write terrain data file: ${writeDataResult.error.message}`);
            return;
          }
        }

        // Write the resource-fork sidecar (.ter.rsrc map data for STANDARD / RSRC_FORK).
        if (terrainRsrcBytes && terrainPaths.rsrcPath) {
          const writeRsrcResult = Result.fromThrowable(
            () => vfs.writeFile(terrainPaths.rsrcPath!, terrainRsrcBytes),
            (e) => (e instanceof Error ? e : new Error(String(e))),
          )();
          if (writeRsrcResult.isErr()) {
            onError(`Failed to write terrain rsrc file: ${writeRsrcResult.error.message}`);
            return;
          }
        }

        if (
          config.terrain?.setPathFn &&
          config.terrain.getSetPathArg &&
          currentLevelInfo &&
          "terrainFile" in currentLevelInfo
        ) {
          Result.fromThrowable(
            () => module.ccall?.(
              config.terrain!.setPathFn!,
              null,
              ["string"],
              [config.terrain!.getSetPathArg!(currentLevelInfo.terrainFile)],
            ),
            (e) => (e instanceof Error ? e : new Error(String(e))),
          )();
        }
      }

      const skipToLevel = config.getSkipToLevelCcall?.(levelNumber);
      if (skipToLevel) {
        Result.fromThrowable(
          () => module.ccall?.(
            skipToLevel.fn,
            skipToLevel.returnType,
            skipToLevel.argTypes,
            skipToLevel.args,
          ),
          (e) => (e instanceof Error ? e : new Error(String(e))),
        )();
      }
    },
    postRun: [
      () => {
        clearOverlayFallback();
        runtimeInitialized = true;
        onStatus("");
      },
    ],
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
  const pendingTimerIds = new Set<number>();
  const realRaf = window.requestAnimationFrame.bind(window);
  const realCaf = window.cancelAnimationFrame.bind(window);
  const realSetTimeout = window.setTimeout.bind(window);
  const realClearTimeout = window.clearTimeout.bind(window);

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

  function gameSetTimeout(callback: () => void, delay?: number): number {
    const cb = callback;
    const id = realSetTimeout(() => {
      pendingTimerIds.delete(id);
      if (!stopped) cb();
    }, delay);
    pendingTimerIds.add(id);
    return id;
  }

  function gameClearTimeout(id?: number): void {
    if (typeof id === "number") {
      pendingTimerIds.delete(id);
    }
    realClearTimeout(id);
  }

  // Track AudioContext instances created by the game so they can be closed on cleanup.
  const trackedAudioContexts = new Set<AudioContext>();
  const savedAudioContext = AudioContext;
  class TrackedAudioContext extends AudioContext {
    constructor(opts?: AudioContextOptions) {
      super(opts);
      trackedAudioContexts.add(this);
    }
  }
  Result.fromThrowable(
    () => { window.AudioContext = TrackedAudioContext; },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();

  const response = await fetch(scriptUrl, { credentials: "same-origin" });
  if (!response.ok) {
    window.AudioContext = savedAudioContext;
    throw new Error(`Failed to load ${scriptUrl}: ${response.status}`);
  }

  const source = await response.text();
  // Shadow requestAnimationFrame, cancelAnimationFrame, setTimeout, and
  // clearTimeout so the game's main loop and deferred callbacks use our
  // tracked wrappers.  On cleanup, all pending callbacks are cancelled
  // without touching the real globals.
  const runner = new Function(
    "module",
    "window",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "setTimeout",
    "clearTimeout",
    `"use strict"; var Module = module;\n${source}\nreturn Module;`,
  ) as (
    module: PreviewRuntimeModule,
    window: Window,
    raf: (cb: FrameRequestCallback) => number,
    caf: (id: number) => void,
    st: (cb: () => void, delay?: number) => number,
    ct: (id?: number) => void,
  ) => PreviewRuntimeModule;
  runner(module, window, gameRaf, gameCaf, gameSetTimeout, gameClearTimeout);

  return () => {
    stopped = true;
    for (const id of pendingRafIds) realCaf(id);
    for (const id of pendingTimerIds) realClearTimeout(id);
    pendingRafIds.clear();
    pendingTimerIds.clear();
    // Restore the original AudioContext constructor and close any contexts the game opened.
    Result.fromThrowable(
      () => { window.AudioContext = savedAudioContext; },
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
    for (const ctx of trackedAudioContexts) {
      Result.fromThrowable(
        () => ctx.close(),
        (e) => (e instanceof Error ? e : new Error(String(e))),
      )();
    }
    trackedAudioContexts.clear();
  };
}
