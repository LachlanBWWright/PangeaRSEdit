import { Game } from "../../data/globals/globals";
import { Result, ResultAsync } from "neverthrow";
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
  readonly texturePath?: string;
  /**
   * Additional data-fork path to write the same bytes to.
   * Used for MightyMike where the WASM may look for either lowercase or
   * capitalized terrain filenames on the case-sensitive Emscripten VFS.
   */
  readonly altDataPath?: string;
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
  /** Removes a file from the VFS. Exposed by all Emscripten builds including those that don't expose Module.FS. */
  FS_unlink?: (path: string) => void;
  /** Creates a data file in the VFS. Used as a fallback write mechanism when Module.FS is absent. */
  FS_createDataFile?: (
    parent: string,
    name: string,
    data: Uint8Array,
    canRead: boolean,
    canWrite: boolean,
    canOwn: boolean,
  ) => void;
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

export class PreviewRuntimeLoadError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "PreviewRuntimeLoadError";
    this.status = status;
  }
}

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
  normalLaunch = false,
): string[] {
  // Normal launch = start from the title screen / main menu without level injection.
  if (normalLaunch) return [];
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
  if (config.game === Game.NANOSAUR) {
    return {
      dataPath: "/Data/Terrain/Level1.ter",
      rsrcPath: null,
      texturePath: "/Data/Terrain/Level1.trt",
    };
  }
  if (!info || !("terrainFile" in info)) {
    return null;
  }
  const dataPath = config.terrain?.getDataPath
    ? config.terrain.getDataPath(info.terrainFile)
    : `/Data/Terrain/${info.terrainFile}`;
  const rsrcPath = config.terrain?.getRsrcPath
    ? config.terrain.getRsrcPath(info.terrainFile)
    : null;

  // For MightyMike the WASM may store terrain under a capitalized filename
  // (e.g. "Jurassic.map-1" vs "jurassic.map-1"). Write to both paths so that
  // whichever case the compiled game uses, the injected file is found.
  if (config.game === Game.MIGHTY_MIKE) {
    const filename = info.terrainFile;
    const capitalizedFilename = filename.charAt(0).toUpperCase() + filename.slice(1);
    const capitalizedPath = `/Data/Terrain/${capitalizedFilename}`;
    const altDataPath = capitalizedPath !== dataPath ? capitalizedPath : undefined;
    return { dataPath, rsrcPath, altDataPath };
  }

  return { dataPath, rsrcPath };
}

export function buildPreviewAssetBaseUrls(config: GamePortConfig): string[] {
  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const generatedBase = new URL(`.generated/pangea-ports/wasm/${config.wasmDir}/`, appBaseUrl).href;
  const legacyBase = new URL(`wasm/${config.wasmDir}/`, appBaseUrl).href;
  return generatedBase === legacyBase
    ? [generatedBase]
    : [generatedBase, legacyBase];
}

export function buildPreviewAssetBaseUrl(config: GamePortConfig): string {
  return buildPreviewAssetBaseUrls(config)[0] ?? "";
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
  terrainPaths: PreviewTerrainPaths | null,
  normalLaunch = false,
): () => void {
  const previousValues = new Map<string, unknown>();
  const setGlobal = (key: string, value: unknown) => {
    const previous = Result.fromThrowable(
      () => Reflect.get(win, key),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
    previousValues.set(key, previous.isOk() ? previous.value : undefined);
    Result.fromThrowable(
      () => { Reflect.set(win, key, value); },
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
  };

  if (config.game === Game.NANOSAUR) {
    setGlobal("SetCustomTerrainFile", (path: string) => {
      const module = win.Module;
      return module?.ccall?.("SetCustomTerrainFile", null, ["string"], [path]);
    });
  }

  // For normal launches (main menu), skip terrain overrides and level-jump globals.
  if (!normalLaunch) {
    if (config.game === Game.BUGDOM) {
      setGlobal("BUGDOM_NO_FENCE_COLLISION", false);
      // Bugdom reads BUGDOM_TERRAIN_FILE and appends ".rsrc" internally to open the
      // resource fork.  Pass the data-fork path (without .rsrc) so the game resolves
      // the correct VFS path: e.g. "/Data/Terrain/Training.ter" → opens "Training.ter.rsrc".
      const bugdomTerrainPath = terrainPaths?.dataPath ?? null;
      if (bugdomTerrainPath) {
        setGlobal("BUGDOM_TERRAIN_FILE", bugdomTerrainPath);
      }
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
  }

  return () => {
    for (const [key, value] of previousValues.entries()) {
      if (typeof value === "undefined") {
        Result.fromThrowable(
          () => { delete (win as unknown as Record<string, unknown>)[key]; },
          (e) => (e instanceof Error ? e : new Error(String(e))),
        )();
      } else {
        Result.fromThrowable(
          () => { Reflect.set(win, key, value); },
          (e) => (e instanceof Error ? e : new Error(String(e))),
        )();
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
  /** Bytes for the data-fork terrain path (.ter images for STANDARD, compiled .ter for Nanosaur 1). */
  readonly terrainDataBytes: Uint8Array | null;
  /** Bytes for the resource-fork terrain path (.ter.rsrc map data for STANDARD / RSRC_FORK). */
  readonly terrainRsrcBytes: Uint8Array | null;
  /** Optional bytes for a secondary terrain asset, such as Nanosaur 1's texture file. */
  readonly terrainTextureBytes: Uint8Array | null;
  readonly terrainPaths: PreviewTerrainPaths | null;
  readonly onStatus: (text: string) => void;
  readonly onError: (text: string) => void;
  /** When true, start the game from the title screen without level injection or level-jump globals. */
  readonly normalLaunch?: boolean;
}

/**
 * Writes a single file into the Emscripten VFS.
 * Tries Module.FS.writeFile first (available in most builds).
 * Falls back to FS_unlink + FS_createDataFile for builds that don't expose Module.FS
 * (e.g. CroMag Rally).  FS_unlink failure (file not yet present) is silenced so that
 * FS_createDataFile always runs.
 */
function writeFileToVfs(
  module: PreviewRuntimeModule,
  path: string,
  data: Uint8Array,
): Result<void, Error> {
  const vfs = module.FS;
  if (vfs && typeof vfs.writeFile === "function") {
    return Result.fromThrowable(
      () => { vfs.writeFile(path, data); },
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
  }
  if (typeof module.FS_createDataFile !== "function") {
    return Result.fromThrowable(
      (): void => { throw new Error("No VFS write mechanism available"); },
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
  }
  const lastSlash = path.lastIndexOf("/");
  const parentDir = path.substring(0, lastSlash);
  const filename = path.substring(lastSlash + 1);
  // Silently ignore FS_unlink errors (file may not exist on first launch).
  if (typeof module.FS_unlink === "function") {
    Result.fromThrowable(
      () => { module.FS_unlink!(path); },
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
  }
  return Result.fromThrowable(
    () => {
      module.FS_createDataFile!(parentDir, filename, data, true, true, false);
    },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();
}

/**
 * Writes terrain bytes to the Emscripten VFS.
 * Runs in onRuntimeInitialized, before callMain, so the game reads the injected
 * bytes when it opens the terrain file in main().
 */
function writeTerrainToVfs(
  module: PreviewRuntimeModule,
  config: GamePortConfig,
  currentLevelInfo: AnyLevelInfo | undefined,
  terrainPaths: PreviewTerrainPaths,
  terrainDataBytes: Uint8Array | null,
  terrainRsrcBytes: Uint8Array | null,
  terrainTextureBytes: Uint8Array | null,
  onError: (text: string) => void,
): void {
  if (!(terrainDataBytes ?? terrainRsrcBytes ?? terrainTextureBytes)) return;

  const vfs = module.FS;
  if (vfs && typeof vfs.mkdir === "function") {
    ensureDir(vfs, "/Data");
    ensureDir(vfs, "/Data/Terrain");
  }

  if (terrainDataBytes) {
    const writeDataResult = writeFileToVfs(module, terrainPaths.dataPath, terrainDataBytes);
    if (writeDataResult.isErr()) {
      onError(`Failed to write terrain data file: ${writeDataResult.error.message}`);
      return;
    }
    // Write the same bytes to the alt path (e.g. capitalized MightyMike filename)
    // so that the game finds the file regardless of which case it uses.
    if (terrainPaths.altDataPath) {
      writeFileToVfs(module, terrainPaths.altDataPath, terrainDataBytes);
    }
  }

  if (terrainRsrcBytes && terrainPaths.rsrcPath) {
    const writeRsrcResult = writeFileToVfs(module, terrainPaths.rsrcPath, terrainRsrcBytes);
    if (writeRsrcResult.isErr()) {
      onError(`Failed to write terrain rsrc file: ${writeRsrcResult.error.message}`);
      return;
    }
  }

  if (terrainTextureBytes && terrainPaths.texturePath) {
    const writeTextureResult = writeFileToVfs(
      module,
      terrainPaths.texturePath,
      terrainTextureBytes,
    );
    if (writeTextureResult.isErr()) {
      onError(`Failed to write terrain texture file: ${writeTextureResult.error.message}`);
      return;
    }
  }

  if (
    config.terrain?.setPathFn &&
    config.terrain.getSetPathArg &&
    currentLevelInfo &&
    "terrainFile" in currentLevelInfo
  ) {
    const setPathArg =
      config.game === Game.NANOSAUR ? terrainPaths.dataPath : config.terrain.getSetPathArg(currentLevelInfo.terrainFile);
    Result.fromThrowable(
      () => module.ccall?.(
        config.terrain!.setPathFn!,
        null,
        ["string"],
        [setPathArg],
      ),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
  }
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
    terrainTextureBytes,
    terrainPaths,
    onStatus,
    onError,
    normalLaunch = false,
  } = options;

  let runtimeInitialized = false;
  // Fallback: if the game's Emscripten build never fires onRuntimeInitialized or
  // postRun (e.g. emscripten_exit_with_live_runtime builds), clear the overlay
  // after a generous timeout so the user isn't stuck on the loading screen.
  let overlayFallbackTimer: number | undefined;
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

  // Self-reference holder: set after the module object is created so that
  // preInit/preRun/onRuntimeInitialized can use the module directly without
  // reading window.Module (which may be deleted or stale on a second run).
  const moduleRef: { current: PreviewRuntimeModule | null } = { current: null };

  const result: PreviewRuntimeModule = {
    canvas,
    webglContextAttributes: {
      powerPreference: "high-performance",
      antialias: false,
      preserveDrawingBuffer: false,
    },
    arguments: buildGameArguments(config, levelNumber, terrainPaths?.dataPath ?? null, normalLaunch),
    preInit: [
      () => {
        const module = moduleRef.current;
        if (!module) {
          return;
        }

        ensurePreviewPrefsDirs(module, config);
      },
    ],
    preRun: [
      () => {
        const module = moduleRef.current;
        if (!module) {
          return;
        }

        ensurePreviewPrefsDirs(module, config);

        // Write terrain into the VFS here so the files are guaranteed to be in
        // place before main() starts reading them.  onRuntimeInitialized writes
        // again as a fallback for games whose VFS isn't fully ready at preRun.
        if (terrainPaths && !normalLaunch) {
          writeTerrainToVfs(
            module,
            config,
            currentLevelInfo,
            terrainPaths,
            terrainDataBytes,
            terrainRsrcBytes,
            terrainTextureBytes ?? null,
            onError,
          );
        }

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

      const module = moduleRef.current;
      if (!module) {
        return;
      }

      // Also inject terrain here as a fallback for games that initialize the
      // VFS only during runtime (after preRun has already fired).
      if (terrainPaths && !normalLaunch) {
        writeTerrainToVfs(
          module,
          config,
          currentLevelInfo,
          terrainPaths,
          terrainDataBytes,
          terrainRsrcBytes,
          terrainTextureBytes ?? null,
          onError,
        );
      }

      if (!normalLaunch) {
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

  moduleRef.current = result;
  return result;
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

  // Patch window.{requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout}
  // so game code that accesses them via window.* (rather than bare names) is also
  // tracked and cancelled on cleanup.  The previous values are restored in cleanup.
  const prevWindowRaf = window.requestAnimationFrame;
  const prevWindowCaf = window.cancelAnimationFrame;
  const prevWindowSt = window.setTimeout;
  const prevWindowCt = window.clearTimeout;
  Result.fromThrowable(() => {
    window.requestAnimationFrame = gameRaf as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = gameCaf;
    window.setTimeout = gameSetTimeout as typeof window.setTimeout;
    window.clearTimeout = gameClearTimeout as typeof window.clearTimeout;
  }, (e) => (e instanceof Error ? e : new Error(String(e))))();

  // Track AudioContext instances created by the game so they can be closed on cleanup.
  const trackedAudioContexts = new Set<AudioContext>();
  const savedAudioContext = AudioContext;
  class TrackedAudioContext extends savedAudioContext {
    constructor(opts?: AudioContextOptions) {
      super(opts);
      trackedAudioContexts.add(this);
    }
  }
  Result.fromThrowable(
    () => { window.AudioContext = TrackedAudioContext; },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();

  const response = await ResultAsync.fromPromise(
    fetch(scriptUrl, { credentials: "same-origin" }),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );

  // Restore patched globals on any early-exit path.
  function restoreWindowGlobals(): void {
    Result.fromThrowable(() => {
      window.requestAnimationFrame = prevWindowRaf;
      window.cancelAnimationFrame = prevWindowCaf;
      window.setTimeout = prevWindowSt;
      window.clearTimeout = prevWindowCt;
      window.AudioContext = savedAudioContext;
    }, (e) => (e instanceof Error ? e : new Error(String(e))))();
  }

  if (response.isErr() || !response.value.ok) {
    const status = response.isOk() ? response.value.status : 0;
    restoreWindowGlobals();
    throw new PreviewRuntimeLoadError(`Failed to load ${scriptUrl}: ${String(status)}`, status);
  }

  const sourceResult = await ResultAsync.fromPromise(
    response.value.text(),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );
  if (sourceResult.isErr()) {
    restoreWindowGlobals();
    throw new PreviewRuntimeLoadError(sourceResult.error.message, null);
  }
  const source = sourceResult.value;

  // Shadow requestAnimationFrame, cancelAnimationFrame, setTimeout, and
  // clearTimeout as function parameters so bare name references inside the
  // game script also use our wrappers (window.* calls are handled by the
  // global patches above).
  const runner = Result.fromThrowable(
    () => new Function(
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
    ) => PreviewRuntimeModule,
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();

  if (runner.isErr()) {
    restoreWindowGlobals();
    throw new PreviewRuntimeLoadError(runner.error.message, null);
  }

  const runResult = Result.fromThrowable(
    () => runner.value(module, window, gameRaf, gameCaf, gameSetTimeout, gameClearTimeout),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();
  if (runResult.isErr()) {
    restoreWindowGlobals();
    throw new PreviewRuntimeLoadError(runResult.error.message, null);
  }

  return () => {
    stopped = true;
    for (const id of pendingRafIds) realCaf(id);
    for (const id of pendingTimerIds) realClearTimeout(id);
    pendingRafIds.clear();
    pendingTimerIds.clear();
    restoreWindowGlobals();
    // Close any AudioContexts the game opened; guard against already-closed contexts.
    for (const ctx of trackedAudioContexts) {
      if (ctx.state !== "closed") {
        void ResultAsync.fromPromise(
          ctx.close(),
          (e) => (e instanceof Error ? e : new Error(String(e))),
        );
      }
    }
    trackedAudioContexts.clear();
  };
}
