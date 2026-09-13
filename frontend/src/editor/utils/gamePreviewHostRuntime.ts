import { err, Result, ok } from "neverthrow";
import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";
import {
  createManagedMultiplayerRuntimeBridge,
  createMultiplayerRuntimeBridge,
  installMultiplayerRuntimeBridge,
  type MultiplayerRuntimeManagedTransport,
} from "@/multiplayer/runtimeBridge";
import type { MultiplayerMatchConfig } from "@/multiplayer/types";
import { deriveRuntimeMatchIdPair } from "@/multiplayer/pnetPacket";
import { resolveLocalPlayerIndex } from "@/multiplayer/participantIndex";
import {
  applyPreviewGlobals,
  buildPreviewAssetBaseUrls,
  createPreviewModule,
  getPreviewTerrainPaths,
  loadPreviewRuntime,
  type MultiplayerRuntimeEvent,
  type PreviewVfsFile,
  type PreviewRuntimeModule,
  type StartNetworkMatchFn,
  type PreviewRuntimeFailure,
} from "./gamePreviewRuntime";
import { mapErr } from "../../utils/mapErr";

interface StartGamePreviewOptions {
  readonly canvas: HTMLCanvasElement;
  readonly config: GamePortConfig;
  readonly levelNumber: number;
  readonly currentLevelInfo: AnyLevelInfo | undefined;
  readonly terrainDataBytes: Uint8Array | null;
  readonly terrainRsrcBytes: Uint8Array | null;
  readonly terrainTextureBytes: Uint8Array | null;
  readonly customFiles?: readonly PreviewVfsFile[];
  readonly runToken: number;
  readonly normalLaunch: boolean;
  readonly networkMatchConfig?: MultiplayerMatchConfig | null;
  readonly localParticipantId?: string | null;
  readonly networkRuntimeTransport?: MultiplayerRuntimeManagedTransport | null;
  readonly deferNetworkStart?: boolean;
  readonly onRuntimeEvent?: (event: MultiplayerRuntimeEvent) => void;
  readonly onStartNetworkMatchReady?: (start: StartNetworkMatchFn) => void;
  readonly onStatus: (text: string) => void;
  readonly onError: (text: string) => void;
  readonly onFailure?: (failure: PreviewRuntimeFailure) => void;
  readonly onRuntimeModule?: (module: PreviewRuntimeModule | null) => void;
}

function isScriptNotFoundError(error: string): boolean {
  return error.includes("404") || error.includes("Failed to load");
}

function triggerResizePulse(timerIds: Set<number>): void {
  const emitResize = () => {
    window.dispatchEvent(new Event("resize"));
  };
  emitResize();
  const timerId = window.setTimeout(() => {
    timerIds.delete(timerId);
    emitResize();
  }, 120);
  timerIds.add(timerId);
}

function applyRuntimeCanvasSize(
  module: PreviewRuntimeModule,
  width: number,
  height: number,
): void {
  if (module.setCanvasSize) {
    Result.fromThrowable(
      () => {
        module.setCanvasSize?.(width, height);
      },
      (e) => mapErr(e),
    )();
    return;
  }

  if (module.canvas.width !== width || module.canvas.height !== height) {
    module.canvas.width = width;
    module.canvas.height = height;
  }
}

function syncRuntimeCanvasSize(module: PreviewRuntimeModule): void {
  const width = Math.round(module.canvas.clientWidth);
  const height = Math.round(module.canvas.clientHeight);
  if (width <= 0 || height <= 0) {
    return;
  }
  applyRuntimeCanvasSize(module, width, height);
}

function scheduleStartupCanvasSync(
  module: PreviewRuntimeModule,
  frameIds: Set<number>,
): void {
  const startedAt = performance.now();
  const minimumRunTimeMs = 1_000;
  const maximumRunTimeMs = 3_000;
  let consecutiveMatchingFrames = 0;

  const sync = (): void => {
    syncRuntimeCanvasSize(module);
    window.dispatchEvent(new Event("resize"));
  };

  const requestSyncFrame = (): void => {
    const frameId = window.requestAnimationFrame(() => {
      frameIds.delete(frameId);
      sync();

      const width = Math.round(module.canvas.clientWidth);
      const height = Math.round(module.canvas.clientHeight);
      const matchesLayout =
        width > 0 &&
        height > 0 &&
        module.canvas.width === width &&
        module.canvas.height === height;
      consecutiveMatchingFrames = matchesLayout
        ? consecutiveMatchingFrames + 1
        : 0;

      const elapsedMs = performance.now() - startedAt;
      const isStable =
        elapsedMs >= minimumRunTimeMs && consecutiveMatchingFrames >= 8;
      if (!isStable && elapsedMs < maximumRunTimeMs) {
        requestSyncFrame();
      }
    });
    frameIds.add(frameId);
  };

  sync();
  requestSyncFrame();
}

function restorePreviewModule(
  previousModule: PreviewRuntimeModule | undefined,
): void {
  if (previousModule === undefined) {
    Reflect.deleteProperty(window, "Module");
    return;
  }
  window.Module = previousModule;
}

function observeStableCanvasSize(
  canvas: HTMLCanvasElement,
  onStableSize: (width: number, height: number) => void,
  isCancelled: () => boolean,
): () => void {
  let startTimer: number | undefined;
  let fallbackTimer: number | undefined;
  let frameId: number | undefined;
  let sizeResolved = false;

  const resolveSize = (width: number, height: number): void => {
    if (sizeResolved || isCancelled()) {
      return;
    }
    if (width <= 0 || height <= 0) {
      return;
    }
    sizeResolved = true;
    if (startTimer !== undefined) {
      window.clearTimeout(startTimer);
      startTimer = undefined;
    }
    if (fallbackTimer !== undefined) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = undefined;
    }
    if (frameId !== undefined) {
      window.cancelAnimationFrame(frameId);
      frameId = undefined;
    }
    observer.disconnect();
    onStableSize(width, height);
  };

  const observer = new ResizeObserver((entries) => {
    if (isCancelled()) return;
    const rect = entries[0]?.contentRect;
    const width =
      rect && rect.width > 0 ? Math.round(rect.width) : canvas.clientWidth;
    const height =
      rect && rect.height > 0 ? Math.round(rect.height) : canvas.clientHeight;
    if (width <= 0 || height <= 0) return;

    if (startTimer !== undefined) window.clearTimeout(startTimer);
    startTimer = window.setTimeout(() => {
      resolveSize(width, height);
    }, 150);
  });
  observer.observe(canvas);

  const pollCanvasSize = () => {
    if (isCancelled() || sizeResolved) {
      return;
    }
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width > 0 && height > 0) {
      resolveSize(width, height);
      return;
    }
    frameId = window.requestAnimationFrame(pollCanvasSize);
  };
  frameId = window.requestAnimationFrame(pollCanvasSize);
  fallbackTimer = window.setTimeout(() => {
    resolveSize(800, 600);
  }, 2_000);

  return () => {
    if (startTimer !== undefined) {
      window.clearTimeout(startTimer);
    }
    if (fallbackTimer !== undefined) {
      window.clearTimeout(fallbackTimer);
    }
    if (frameId !== undefined) {
      window.cancelAnimationFrame(frameId);
    }
    observer.disconnect();
  };
}

export function startGamePreview(options: StartGamePreviewOptions): () => void {
  const {
    canvas,
    config,
    levelNumber,
    currentLevelInfo,
    terrainDataBytes,
    terrainRsrcBytes,
    terrainTextureBytes,
    customFiles,
    runToken,
    normalLaunch,
    networkMatchConfig,
    localParticipantId,
    networkRuntimeTransport,
    deferNetworkStart = false,
    onRuntimeEvent,
    onStartNetworkMatchReady,
    onStatus,
    onError,
    onFailure,
    onRuntimeModule,
  } = options;

  let cancelled = false;
  let cleanedUp = false;
  let stopGame: (() => void) | null = null;
  let uninstallRuntimeBridge: (() => void) | null = null;
  let disposeRuntimeTransportSubscription: (() => void) | null = null;
  const resizePulseTimerIds = new Set<number>();
  const resizePulseFrameIds = new Set<number>();
  const previousModule = window.Module;
  const reportStatus = (text: string): void => {
    if (!cancelled) onStatus(text);
  };
  const reportError = (text: string): void => {
    if (!cancelled) onError(text);
  };
  const reportFailure = (failure: PreviewRuntimeFailure): void => {
    if (!cancelled) onFailure?.(failure);
  };
  const reportRuntimeEvent = (event: MultiplayerRuntimeEvent): void => {
    if (!cancelled) onRuntimeEvent?.(event);
  };
  const reportRuntimeModule = (module: PreviewRuntimeModule | null): void => {
    if (!cancelled) onRuntimeModule?.(module);
  };
  const terrainPaths = getPreviewTerrainPaths(currentLevelInfo, config);
  const cleanupGlobals = applyPreviewGlobals(
    window,
    config,
    levelNumber,
    terrainPaths,
    normalLaunch,
  );
  const assetBaseUrls = buildPreviewAssetBaseUrls(config);
  const assetVersion = import.meta.env.VITE_GAME_ASSET_VERSION ?? "development";
  const cacheBustToken = `${assetVersion}-${String(config.game)}-${String(levelNumber)}-${String(runToken)}`;
  reportStatus("Waiting for game canvas...");

  const handleFullscreenChange = () => {
    if (cancelled) return;
    if (document.fullscreenElement === canvas) {
      void document.exitFullscreen();
    }
    triggerResizePulse(resizePulseTimerIds);
  };
  document.addEventListener("fullscreenchange", handleFullscreenChange);

  const startGame = (width: number, height: number): void => {
    if (cancelled) return;

    if (networkMatchConfig && !normalLaunch && !uninstallRuntimeBridge) {
      const localPlayerIndexResult = resolveLocalPlayerIndex(
        networkMatchConfig,
        localParticipantId,
      );
      if (localPlayerIndexResult.isErr()) {
        reportError(localPlayerIndexResult.error);
        reportFailure({
          category: "native-adapter",
          code: "runtime.network-config",
          message: localPlayerIndexResult.error,
        });
        return;
      }
      const localPlayerIndex = localPlayerIndexResult.value;
      const matchIdPair = deriveRuntimeMatchIdPair(
        networkMatchConfig.matchId,
        networkMatchConfig.seed,
      );
      const bridgeConfig = {
        isHost: localParticipantId === networkMatchConfig.hostParticipantId,
        localPlayerIndex,
        playerCount: networkMatchConfig.players.length,
        matchSeed: networkMatchConfig.seed,
        hostPlayerIndex: networkMatchConfig.hostPlayerIndex,
        matchIdLow: matchIdPair.low,
        matchIdHigh: matchIdPair.high,
      };
      if (networkRuntimeTransport) {
        const managedBridge = createManagedMultiplayerRuntimeBridge(
          bridgeConfig,
          networkRuntimeTransport,
        );
        disposeRuntimeTransportSubscription = managedBridge.dispose;
        uninstallRuntimeBridge = installMultiplayerRuntimeBridge(
          window,
          managedBridge.bridge,
        );
      } else {
        const bridge = createMultiplayerRuntimeBridge(bridgeConfig, {
          sendReliable: () => ok(undefined),
          sendUnreliable: () => ok(undefined),
          reportDesync: () => undefined,
          reportMatchEnded: () => undefined,
        });
        uninstallRuntimeBridge = installMultiplayerRuntimeBridge(
          window,
          bridge,
        );
      }
    }

    canvas.width = width;
    canvas.height = height;
    canvas.focus();
    triggerResizePulse(resizePulseTimerIds);

    void (async () => {
      for (
        let baseUrlIndex = 0;
        baseUrlIndex < assetBaseUrls.length;
        baseUrlIndex += 1
      ) {
        const assetBaseUrl = assetBaseUrls[baseUrlIndex] ?? "";
        const activeModule = createPreviewModule({
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
          deferNetworkStart,
          onRuntimeEvent: reportRuntimeEvent,
          onStartNetworkMatchReady: (start) => {
            if (cancelled) return;
            onStartNetworkMatchReady?.(() =>
              cancelled ? err("Preview launch has been cancelled") : start(),
            );
          },
          normalLaunch,
          onRuntimeModule: reportRuntimeModule,
          onStatus: reportStatus,
          onError: reportError,
          onFailure: reportFailure,
        });
        syncRuntimeCanvasSize(activeModule);

        window.Module = activeModule;
        reportRuntimeModule(activeModule);
        const scriptUrl =
          new URL(config.mainJs, assetBaseUrl).href + `?v=${cacheBustToken}`;
        reportStatus("Loading runtime script...");
        const stopOrErr = onRuntimeModule
          ? await loadPreviewRuntime(
              activeModule,
              scriptUrl,
              () => cancelled,
              reportRuntimeModule,
            )
          : await loadPreviewRuntime(activeModule, scriptUrl, () => cancelled);
        if (cancelled) {
          if (stopOrErr.isOk()) stopOrErr.value();
          return;
        }
        if (stopOrErr.isErr()) {
          const canTryNextBase =
            isScriptNotFoundError(stopOrErr.error) &&
            baseUrlIndex < assetBaseUrls.length - 1;
          if (canTryNextBase) {
            continue;
          }
          reportError(stopOrErr.error);
          reportFailure({
            category: "packaging",
            code: "runtime.script-load",
            message: stopOrErr.error,
          });
          return;
        }
        stopGame = stopOrErr.value;
        reportRuntimeModule(window.Module ?? activeModule);
        scheduleStartupCanvasSync(
          activeModule,
          resizePulseFrameIds,
        );
        return;
      }
    })();
  };

  const stopObservingCanvas = observeStableCanvasSize(
    canvas,
    startGame,
    () => cancelled,
  );

  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    cancelled = true;
    stopObservingCanvas();
    stopGame?.();
    stopGame = null;
    for (const timerId of resizePulseTimerIds) {
      window.clearTimeout(timerId);
    }
    for (const frameId of resizePulseFrameIds) {
      window.cancelAnimationFrame(frameId);
    }
    resizePulseTimerIds.clear();
    resizePulseFrameIds.clear();
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    cleanupGlobals();
    disposeRuntimeTransportSubscription?.();
    disposeRuntimeTransportSubscription = null;
    uninstallRuntimeBridge?.();
    uninstallRuntimeBridge = null;
    restorePreviewModule(previousModule);
    onRuntimeModule?.(null);
  };
}
