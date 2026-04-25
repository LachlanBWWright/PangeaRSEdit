import { Result, ResultAsync } from "neverthrow";
import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";
import {
  buildGameArguments,
  PreviewRuntimeLoadError,
  type PreviewRuntimeModule,
  type PreviewTerrainPaths,
} from "./gamePreviewRuntimeTypes";
import {
  ensurePreviewPrefsDirs,
  writeTerrainToVfs,
} from "./gamePreviewRuntimeVfs";

export interface PreviewModuleOptions {
  readonly config: GamePortConfig;
  readonly levelNumber: number;
  readonly currentLevelInfo: AnyLevelInfo | undefined;
  readonly canvas: HTMLCanvasElement;
  readonly assetBaseUrl: string;
  readonly cacheBustToken: string;
  readonly terrainDataBytes: Uint8Array | null;
  readonly terrainRsrcBytes: Uint8Array | null;
  readonly terrainTextureBytes: Uint8Array | null;
  readonly terrainPaths: PreviewTerrainPaths | null;
  readonly onStatus: (text: string) => void;
  readonly onError: (text: string) => void;
  readonly normalLaunch?: boolean;
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

  const moduleRef: { current: PreviewRuntimeModule | null } = { current: null };

  const result: PreviewRuntimeModule = {
    canvas,
    webglContextAttributes: {
      powerPreference: "high-performance",
      antialias: false,
      preserveDrawingBuffer: false,
    },
    arguments: buildGameArguments(
      config,
      levelNumber,
      terrainPaths?.dataPath ?? null,
      normalLaunch,
    ),
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
        // The generated .data package loaders also use preRun to populate the
        // VFS. Terrain replacement must wait until onRuntimeInitialized below.
        scheduleOverlayFallback();
      },
    ],
    locateFile: (path: string) =>
      new URL(path, assetBaseUrl).href + `?v=${cacheBustToken}`,
    setStatus: (text: string) => {
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

      if (terrainPaths && !normalLaunch) {
        // Emscripten invokes onRuntimeInitialized after preRun and before
        // callMain, so packaged files exist but the game has not loaded a level.
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
            () =>
              module.ccall?.(
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

  function gameSetTimeout(
    handler: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ): number {
    const id = realSetTimeout(() => {
      pendingTimerIds.delete(id);
      if (stopped) return;
      if (typeof handler === "function") {
        handler(...args);
      }
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

  const prevWindowRaf = window.requestAnimationFrame;
  const prevWindowCaf = window.cancelAnimationFrame;
  const prevWindowSt = window.setTimeout;
  const prevWindowCt = window.clearTimeout;
  const patchedWindowSetTimeout = Object.assign(gameSetTimeout, prevWindowSt);
  const patchedWindowClearTimeout = Object.assign(gameClearTimeout, prevWindowCt);
  Result.fromThrowable(
    () => {
      window.requestAnimationFrame = gameRaf;
      window.cancelAnimationFrame = gameCaf;
      window.setTimeout = patchedWindowSetTimeout;
      window.clearTimeout = patchedWindowClearTimeout;
    },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();

  const trackedAudioContexts = new Set<AudioContext>();
  const savedAudioContext = AudioContext;
  class TrackedAudioContext extends savedAudioContext {
    constructor(opts?: AudioContextOptions) {
      super(opts);
      trackedAudioContexts.add(this);
    }
  }
  Result.fromThrowable(
    () => {
      window.AudioContext = TrackedAudioContext;
    },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();

  const response = await ResultAsync.fromPromise(
    fetch(scriptUrl, { credentials: "same-origin" }),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );

  function restoreWindowGlobals(): void {
    Result.fromThrowable(
      () => {
        window.requestAnimationFrame = prevWindowRaf;
        window.cancelAnimationFrame = prevWindowCaf;
        window.setTimeout = prevWindowSt;
        window.clearTimeout = prevWindowCt;
        window.AudioContext = savedAudioContext;
      },
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
  }

  if (response.isErr() || !response.value.ok) {
    const status = response.isOk() ? response.value.status : 0;
    restoreWindowGlobals();
    return Promise.reject(
      new PreviewRuntimeLoadError(
        `Failed to load ${scriptUrl}: ${String(status)}`,
        status,
      ),
    );
  }

  const sourceResult = await ResultAsync.fromPromise(
    response.value.text(),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );
  if (sourceResult.isErr()) {
    restoreWindowGlobals();
    return Promise.reject(
      new PreviewRuntimeLoadError(sourceResult.error.message, null),
    );
  }
  const source = sourceResult.value;

  const runner = Result.fromThrowable(
    (): ((
      module: PreviewRuntimeModule,
      window: Window,
      raf: (cb: FrameRequestCallback) => number,
      caf: (id: number) => void,
      st: (handler: TimerHandler, delay?: number, ...args: unknown[]) => number,
      ct: (id?: number) => void,
    ) => PreviewRuntimeModule) => {
      const runnerFactory = new Function(
        "module",
        "window",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "setTimeout",
        "clearTimeout",
        `"use strict"; var Module = module;\n${source}\nreturn Module;`,
      );
      return (
        module: PreviewRuntimeModule,
        window: Window,
        raf: (cb: FrameRequestCallback) => number,
        caf: (id: number) => void,
        st: (handler: TimerHandler, delay?: number, ...args: unknown[]) => number,
        ct: (id?: number) => void,
      ): PreviewRuntimeModule =>
        Reflect.apply(runnerFactory, undefined, [
          module,
          window,
          raf,
          caf,
          st,
          ct,
        ]);
    },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();

  if (runner.isErr()) {
    restoreWindowGlobals();
    return Promise.reject(new PreviewRuntimeLoadError(runner.error.message, null));
  }

  const runResult = Result.fromThrowable(
    () =>
      runner.value(
        module,
        window,
        gameRaf,
        gameCaf,
        gameSetTimeout,
        gameClearTimeout,
      ),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();
  if (runResult.isErr()) {
    restoreWindowGlobals();
    return Promise.reject(
      new PreviewRuntimeLoadError(runResult.error.message, null),
    );
  }

  return () => {
    stopped = true;
    for (const id of pendingRafIds) realCaf(id);
    for (const id of pendingTimerIds) realClearTimeout(id);
    pendingRafIds.clear();
    pendingTimerIds.clear();
    restoreWindowGlobals();
    for (const ctx of trackedAudioContexts) {
      if (ctx.state !== "closed") {
        void ResultAsync.fromPromise(ctx.close(), (e) =>
          e instanceof Error ? e : new Error(String(e)),
        );
      }
    }
  };
}
