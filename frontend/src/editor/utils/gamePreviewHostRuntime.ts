import { ResultAsync } from "neverthrow";
import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";
import {
  applyPreviewGlobals,
  buildPreviewAssetBaseUrls,
  createPreviewModule,
  getPreviewTerrainPaths,
  loadPreviewRuntime,
  type PreviewRuntimeModule,
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
  readonly runToken: number;
  readonly normalLaunch: boolean;
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

function restorePreviewModule(previousModule: PreviewRuntimeModule | undefined): void {
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
      if (isCancelled()) return;
      observer.disconnect();
      onStableSize(width, height);
    }, 150);
  });
  observer.observe(canvas);

  return () => {
    if (startTimer !== undefined) window.clearTimeout(startTimer);
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
    runToken,
    normalLaunch,
    onStatus,
    onError,
  } = options;

  let cancelled = false;
  let stopGame: (() => void) | null = null;
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
          terrainPaths,
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
    restorePreviewModule(previousModule);
  };
}
