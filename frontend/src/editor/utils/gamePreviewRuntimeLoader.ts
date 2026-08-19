import { Result, ResultAsync, err } from "neverthrow";
import { ZodError } from "zod";
import { MultiplayerMatchConfigSchema } from "@/multiplayer/schemas";
import type { MultiplayerMatchConfig } from "@/multiplayer/types";
import { deriveRuntimeMatchIdPair } from "@/multiplayer/pnetPacket";
import { resolveLocalPlayerIndex } from "@/multiplayer/participantIndex";
import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";
import {
  buildGameArguments,
  type PreviewVfsFile,
  type PreviewRuntimeModule,
  type MultiplayerRuntimeEvent,
  type StartNetworkMatchFn,
  type PreviewTerrainPaths,
} from "./gamePreviewRuntimeTypes";
import {
  ensurePreviewPrefsDirs,
  writeTerrainToVfs,
} from "./gamePreviewRuntimeVfs";
import { mapErr } from "../../utils/mapErr";

const RUNTIME_SCRIPT_FETCH_TIMEOUT_MS = 20_000;
const GAME_KEYBOARD_EVENT_TYPES = new Set(["keydown", "keyup", "keypress"]);

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
  readonly customFiles?: readonly PreviewVfsFile[];
  readonly terrainPaths: PreviewTerrainPaths | null;
  readonly networkMatchConfig?: unknown;
  readonly localParticipantId?: string | null;
  readonly onStatus: (text: string) => void;
  readonly onError: (text: string) => void;
  readonly normalLaunch?: boolean;
  readonly deferNetworkStart?: boolean;
  readonly onRuntimeEvent?: (event: MultiplayerRuntimeEvent) => void;
  readonly onStartNetworkMatchReady?: (start: StartNetworkMatchFn) => void;
}

function formatSchemaError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      if (issue.path.length === 0) {
        return issue.message;
      }

      return `${issue.path.join(".")}: ${issue.message}`;
    })
    .join("; ");
}

function normalizeScriptPath(path: string): string {
  return path.replace(/^\/+/, "");
}

function findScriptBundlePath(
  customFiles: readonly PreviewVfsFile[] | undefined,
): string | null {
  const scriptBundlePath = customFiles?.find(
    (file) => normalizeScriptPath(file.path) === "Data/Scripts/dist/main.lua",
  )?.path;

  return scriptBundlePath ? normalizeScriptPath(scriptBundlePath) : null;
}

function configureScriptingExports(
  module: PreviewRuntimeModule,
  customFiles: readonly PreviewVfsFile[] | undefined,
  onError: (text: string) => void,
): void {
  const scriptBundlePath = findScriptBundlePath(customFiles);
  if (!scriptBundlePath) {
    return;
  }

  const ccall = module.ccall;
  if (!ccall) {
    onError("Emscripten ccall is unavailable");
    return;
  }

  const startupResult = Result.fromThrowable(
    () =>
      ccall(
        "PangeaScript_SetStartupScript",
        null,
        ["string"],
        [scriptBundlePath],
      ),
    (error) => mapErr(error),
  )();
  if (startupResult.isErr()) {
    onError(startupResult.error);
  }
}

function applyNetworkMatchConfig(
  module: PreviewRuntimeModule,
  rawMatchConfig: unknown,
  localParticipantId?: string | null,
): Result<void, string> {
  const ccall = module.ccall;
  if (!ccall) {
    return err("Emscripten ccall is unavailable");
  }

  const parsedMatchConfig =
    MultiplayerMatchConfigSchema.safeParse(rawMatchConfig);
  if (!parsedMatchConfig.success) {
    return err(
      `Invalid multiplayer match config: ${formatSchemaError(parsedMatchConfig.error)}`,
    );
  }

  const matchConfig: MultiplayerMatchConfig = parsedMatchConfig.data;
  const localPlayerIndexResult = resolveLocalPlayerIndex(
    matchConfig,
    localParticipantId,
  );
  if (localPlayerIndexResult.isErr()) {
    return err(localPlayerIndexResult.error);
  }
  const localPlayerIndex = localPlayerIndexResult.value;
  const matchIdPair = deriveRuntimeMatchIdPair(
    matchConfig.matchId,
    matchConfig.seed,
  );
  const configJson = JSON.stringify({
    ...matchConfig,
    localPlayerIndex,
    hostPlayerIndex: matchConfig.hostPlayerIndex,
    isHost: localParticipantId === matchConfig.hostParticipantId ? 1 : 0,
    playerCount: matchConfig.players.length,
    matchIdLow: matchIdPair.low,
    matchIdHigh: matchIdPair.high,
  });
  return Result.fromThrowable(
    () =>
      ccall(
        "PangeaGame_SetNetworkMatchConfig",
        null,
        ["string", "number"],
        [configJson, configJson.length],
      ),
    (e) => mapErr(e),
  )().map(() => undefined);
}

function createStartNetworkMatch(
  module: PreviewRuntimeModule,
): StartNetworkMatchFn {
  return () => {
    const ccall = module.ccall;
    if (!ccall) {
      return err("Emscripten ccall is unavailable");
    }
    return Result.fromThrowable(
      () => ccall("PangeaGame_StartNetworkMatch", null, [], []),
      (e) => mapErr(e),
    )().map(() => undefined);
  };
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
    customFiles,
    terrainPaths,
    networkMatchConfig,
    localParticipantId,
    onStatus,
    onError,
    normalLaunch = false,
    deferNetworkStart = false,
    onRuntimeEvent,
    onStartNetworkMatchReady,
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
    keyboardListeningElement: canvas,
    webglContextAttributes: {
      powerPreference: "high-performance",
      antialias: false,
      preserveDrawingBuffer: false,
    },
    requestQuitFn: config.requestQuitFn,
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
      onRuntimeEvent?.({ type: "runtimeInitialized" });

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
          customFiles,
          onError,
        );
      }

      configureScriptingExports(module, customFiles, onError);

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
            (e) => mapErr(e),
          )();
        }
      }

      if (networkMatchConfig && !normalLaunch) {
        const configResult = applyNetworkMatchConfig(
          module,
          networkMatchConfig,
          localParticipantId,
        );
        if (configResult.isErr()) {
          onRuntimeEvent?.({
            type: "runtimeLoadFailed",
            detail: configResult.error,
          });
          onError(configResult.error);
          return;
        }
        onRuntimeEvent?.({ type: "runtimeConfigApplied" });
        const startNetworkMatch = createStartNetworkMatch(module);
        onStartNetworkMatchReady?.(startNetworkMatch);
        onRuntimeEvent?.({ type: "runtimeLevelReady" });
        if (!deferNetworkStart) {
          const startResult = startNetworkMatch();
          if (startResult.isErr()) {
            onRuntimeEvent?.({
              type: "runtimeLoadFailed",
              detail: startResult.error,
            });
            onError(startResult.error);
            return;
          }
          onRuntimeEvent?.({ type: "runtimeStartNow" });
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
      let message: string;
      if (typeof reason === "string") {
        message = reason;
      } else {
        message = reason instanceof Error ? reason.message : String(reason);
      }
      onError(message);
    },
  };

  moduleRef.current = result;
  return result;
}

export async function loadPreviewRuntime(
  module: PreviewRuntimeModule,
  scriptUrl: string,
  isCancelled: () => boolean = () => false,
): Promise<() => void> {
  let stopped = false;
  let stopRequested = false;
  const pendingRafIds = new Set<number>();
  const pendingTimerIds = new Set<number>();
  const realRaf = window.requestAnimationFrame.bind(window);
  const realCaf = window.cancelAnimationFrame.bind(window);
  const realSetTimeout = window.setTimeout.bind(window);
  const realClearTimeout = window.clearTimeout.bind(window);
  const realAddEventListener = EventTarget.prototype.addEventListener;
  const realRemoveEventListener = EventTarget.prototype.removeEventListener;
  const prevWindowAddEventListener = window.addEventListener;
  const prevWindowRemoveEventListener = window.removeEventListener;
  const prevDocumentAddEventListener = document.addEventListener;
  const prevDocumentRemoveEventListener = document.removeEventListener;

  interface WrappedKeyboardListener {
    readonly target: EventTarget;
    readonly type: string;
    readonly original: EventListenerOrEventListenerObject;
    readonly wrapped: EventListener;
    readonly options?: boolean | AddEventListenerOptions;
  }

  const wrappedKeyboardListeners: WrappedKeyboardListener[] = [];

  function previewOwnsKeyboardEvent(event: Event): boolean {
    return (
      document.activeElement === module.canvas ||
      event.target === module.canvas
    );
  }

  function shouldWrapKeyboardListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): boolean {
    return (
      listener !== null &&
      GAME_KEYBOARD_EVENT_TYPES.has(type) &&
      (target === window || target === document)
    );
  }

  function createKeyboardListenerWrapper(
    target: EventTarget,
    listener: EventListenerOrEventListenerObject,
  ): EventListener {
    return function wrappedGameKeyboardListener(event: Event): void {
      if (!previewOwnsKeyboardEvent(event)) {
        return;
      }
      if (typeof listener === "function") {
        listener.call(target, event);
        return;
      }
      listener.handleEvent(event);
    };
  }

  function findWrappedKeyboardListener(
    target: EventTarget,
    type: string,
    original: EventListenerOrEventListenerObject,
  ): WrappedKeyboardListener | undefined {
    return wrappedKeyboardListeners.find(
      (listener) =>
        listener.target === target &&
        listener.type === type &&
        listener.original === original,
    );
  }

  function removeTrackedKeyboardListeners(): void {
    for (const listener of wrappedKeyboardListeners) {
      callRemoveEventListener(
        listener.target,
        listener.type,
        listener.wrapped,
        listener.options,
      );
    }
    wrappedKeyboardListeners.length = 0;
  }

  function callAddEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (target === window) {
      Reflect.apply(prevWindowAddEventListener, window, [type, listener, options]);
      return;
    }
    if (target === document) {
      Reflect.apply(prevDocumentAddEventListener, document, [
        type,
        listener,
        options,
      ]);
      return;
    }
    realAddEventListener.call(target, type, listener, options);
  }

  function callRemoveEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    if (target === window) {
      Reflect.apply(prevWindowRemoveEventListener, window, [
        type,
        listener,
        options,
      ]);
      return;
    }
    if (target === document) {
      Reflect.apply(prevDocumentRemoveEventListener, document, [
        type,
        listener,
        options,
      ]);
      return;
    }
    realRemoveEventListener.call(target, type, listener, options);
  }

  function patchKeyboardListeners(): void {
    function addPreviewEventListener(
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      if (listener === null) {
        callAddEventListener(this, type, listener, options);
        return;
      }
      if (!shouldWrapKeyboardListener(this, type, listener)) {
        callAddEventListener(this, type, listener, options);
        return;
      }

      const existing = findWrappedKeyboardListener(this, type, listener);
      if (existing) {
        callAddEventListener(this, type, existing.wrapped, options);
        return;
      }

      const wrapped = createKeyboardListenerWrapper(this, listener);
      wrappedKeyboardListeners.push({
        target: this,
        type,
        original: listener,
        wrapped,
        options,
      });
      callAddEventListener(this, type, wrapped, options);
    }

    function removePreviewEventListener(
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ): void {
      if (listener === null) {
        callRemoveEventListener(this, type, listener, options);
        return;
      }

      const existing = findWrappedKeyboardListener(this, type, listener);
      if (!existing) {
        callRemoveEventListener(this, type, listener, options);
        return;
      }

      callRemoveEventListener(this, type, existing.wrapped, options);
      const index = wrappedKeyboardListeners.indexOf(existing);
      if (index >= 0) {
        wrappedKeyboardListeners.splice(index, 1);
      }
    }

    EventTarget.prototype.addEventListener = addPreviewEventListener;
    EventTarget.prototype.removeEventListener = removePreviewEventListener;
    window.addEventListener = addPreviewEventListener;
    window.removeEventListener = removePreviewEventListener;
    document.addEventListener = addPreviewEventListener;
    document.removeEventListener = removePreviewEventListener;
  }

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

  function requestRuntimeQuit(): boolean {
    const quitFn = module.requestQuitFn;
    const ccall = module.ccall;
    if (!quitFn || !ccall) {
      return false;
    }
    const quitResult = Result.fromThrowable(
      () => ccall(quitFn, null, [], []),
      (e) => mapErr(e),
    )();
    return quitResult.isOk();
  }

  function finishStop(restoreGlobals: boolean): void {
    stopped = true;
    for (const id of pendingRafIds) realCaf(id);
    for (const id of pendingTimerIds) realClearTimeout(id);
    pendingRafIds.clear();
    pendingTimerIds.clear();
    if (restoreGlobals) {
      restoreWindowGlobals();
    }
    removeTrackedKeyboardListeners();
    for (const ctx of trackedAudioContexts) {
      if (ctx.state !== "closed") {
        void ResultAsync.fromPromise(ctx.close(), (e) => mapErr(e));
      }
    }
  }

  const prevWindowRaf = window.requestAnimationFrame;
  const prevWindowCaf = window.cancelAnimationFrame;
  const prevWindowSt = window.setTimeout;
  const prevWindowCt = window.clearTimeout;
  const patchedWindowSetTimeout = Object.assign(gameSetTimeout, prevWindowSt);
  const patchedWindowClearTimeout = Object.assign(
    gameClearTimeout,
    prevWindowCt,
  );
  Result.fromThrowable(
    () => {
      window.requestAnimationFrame = gameRaf;
      window.cancelAnimationFrame = gameCaf;
      window.setTimeout = patchedWindowSetTimeout;
      window.clearTimeout = patchedWindowClearTimeout;
      patchKeyboardListeners();
    },
    (e) => mapErr(e),
  )();

  const trackedAudioContexts = new Set<AudioContext>();
  const savedAudioContext = window.AudioContext;
  if (savedAudioContext) {
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
      (e) => mapErr(e),
    )();
  }

  const abortController = new AbortController();
  const fetchTimeoutId = realSetTimeout(() => {
    abortController.abort();
  }, RUNTIME_SCRIPT_FETCH_TIMEOUT_MS);

  const response = await ResultAsync.fromPromise(
    fetch(scriptUrl, {
      credentials: "same-origin",
      signal: abortController.signal,
    }),
    (e) => mapErr(e),
  );
  realClearTimeout(fetchTimeoutId);

  if (isCancelled()) {
    restoreWindowGlobals();
    return () => undefined;
  }

  function restoreWindowGlobals(): void {
    Result.fromThrowable(
      () => {
        removeTrackedKeyboardListeners();
        EventTarget.prototype.addEventListener = realAddEventListener;
        EventTarget.prototype.removeEventListener = realRemoveEventListener;
        window.addEventListener = prevWindowAddEventListener;
        window.removeEventListener = prevWindowRemoveEventListener;
        document.addEventListener = prevDocumentAddEventListener;
        document.removeEventListener = prevDocumentRemoveEventListener;
        window.requestAnimationFrame = prevWindowRaf;
        window.cancelAnimationFrame = prevWindowCaf;
        window.setTimeout = prevWindowSt;
        window.clearTimeout = prevWindowCt;
        if (savedAudioContext) {
          window.AudioContext = savedAudioContext;
        }
      },
      (e) => mapErr(e),
    )();
  }

  if (response.isErr() || !response.value.ok) {
    const status = response.isOk() ? response.value.status : 0;
    restoreWindowGlobals();
    return Promise.reject(`Failed to load ${scriptUrl}: ${String(status)}`);
  }

  const sourceResult = await ResultAsync.fromPromise(
    response.value.text(),
    (e) => mapErr(e),
  );
  if (sourceResult.isErr()) {
    restoreWindowGlobals();
    return Promise.reject(sourceResult.error);
  }
  const source = sourceResult.value;

  if (isCancelled()) {
    restoreWindowGlobals();
    return () => undefined;
  }

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
        st: (
          handler: TimerHandler,
          delay?: number,
          ...args: unknown[]
        ) => number,
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
    (e) => mapErr(e),
  )();

  if (runner.isErr()) {
    restoreWindowGlobals();
    return Promise.reject(runner.error);
  }

  if (isCancelled()) {
    restoreWindowGlobals();
    return () => undefined;
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
    (e) => mapErr(e),
  )();
  if (runResult.isErr()) {
    restoreWindowGlobals();
    return Promise.reject(runResult.error);
  }

  return () => {
    if (stopRequested) {
      return;
    }
    stopRequested = true;
    if (requestRuntimeQuit()) {
      const stopTimerId = realSetTimeout(() => {
        pendingTimerIds.delete(stopTimerId);
        finishStop(true);
      }, 100);
      pendingTimerIds.add(stopTimerId);
      return;
    }
    finishStop(true);
  };
}
