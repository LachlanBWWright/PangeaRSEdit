import { ResultAsync, ok } from "neverthrow";
import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";
import {
  createManagedMultiplayerRuntimeBridge,
  createMultiplayerRuntimeBridge,
  installMultiplayerRuntimeBridge,
  type MultiplayerRuntimeManagedTransport,
} from "@/multiplayer/runtimeBridge";
import type { MultiplayerMatchConfig } from "@/multiplayer/types";
import { deriveMatchIdPair } from "@/multiplayer/pnetPacket";
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

  return () => {
    if (startTimer !== undefined) {
      window.clearTimeout(startTimer);
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
  } = options;

  let cancelled = false;
  let stopGame: (() => void) | null = null;
  let uninstallRuntimeBridge: (() => void) | null = null;
  let disposeRuntimeTransportSubscription: (() => void) | null = null;
  const resizePulseTimerIds = new Set<number>();
  const previousModule = window.Module;
  const terrainPaths = getPreviewTerrainPaths(currentLevelInfo, config);
  const cleanupGlobals = applyPreviewGlobals(
    window,
    config,
    levelNumber,
    terrainPaths,
    normalLaunch,
  );
  const assetBaseUrls = buildPreviewAssetBaseUrls(config);
  const cacheBustToken = `${String(config.game)}-${String(levelNumber)}-${String(runToken)}`;

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
      const localPlayerIndex =
        networkMatchConfig.players.find(
          (player) => player.participantId === localParticipantId,
        )?.playerIndex ?? 0;
      const matchIdPair = deriveMatchIdPair(networkMatchConfig.matchId);
      const bridgeConfig = {
        isHost: localParticipantId === networkMatchConfig.hostParticipantId,
        localPlayerIndex,
        playerCount: networkMatchConfig.players.length,
        matchSeed: networkMatchConfig.seed,
        hostPlayerIndex: networkMatchConfig.hostPlayerIndex,
        matchIdLow: matchIdPair.low || networkMatchConfig.seed,
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
          onRuntimeEvent,
          onStartNetworkMatchReady,
          normalLaunch,
          onStatus,
          onError,
        });

        window.Module = activeModule;
        const scriptUrl =
          new URL(config.mainJs, assetBaseUrl).href + `?v=${cacheBustToken}`;
        const stopOrErr = await ResultAsync.fromPromise(
          loadPreviewRuntime(activeModule, scriptUrl),
          (e) => mapErr(e),
        );
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
          onError(stopOrErr.error);
          return;
        }
        stopGame = stopOrErr.value;
        triggerResizePulse(resizePulseTimerIds);
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
    cancelled = true;
    stopObservingCanvas();
    stopGame?.();
    stopGame = null;
    for (const timerId of resizePulseTimerIds) {
      window.clearTimeout(timerId);
    }
    resizePulseTimerIds.clear();
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    cleanupGlobals();
    disposeRuntimeTransportSubscription?.();
    disposeRuntimeTransportSubscription = null;
    uninstallRuntimeBridge?.();
    uninstallRuntimeBridge = null;
    restorePreviewModule(previousModule);
  };
}
