import { useEffect, useRef, useState } from "react";
import { ResultAsync } from "neverthrow";
import {
  applyPreviewGlobals,
  buildPreviewAssetBaseUrl,
  createPreviewModule,
  getPreviewTerrainPaths,
  loadPreviewRuntime,
  GAME_DISPLAY_NAMES,
  type PreviewRuntimeModule,
} from "./utils/gamePreviewRuntime";
import type { AnyLevelInfo, GamePortConfig } from "./utils/gamePortConfig";

interface Props {
  readonly config: GamePortConfig;
  readonly levelNumber: number;
  readonly currentLevelInfo: AnyLevelInfo | undefined;
  /**
   * Bytes for the data-fork terrain file (.ter images or compiled .ter).
   * `undefined` = serialization is still in progress (shows "Preparing level data…").
   * `null`      = no data-fork file needed for this game.
   */
  readonly terrainDataBytes: Uint8Array | null | undefined;
  /**
   * Bytes for the resource-fork terrain sidecar (.ter.rsrc).
   * `undefined` = serialization is still in progress.
   * `null`      = no rsrc file needed for this game.
   */
  readonly terrainRsrcBytes: Uint8Array | null | undefined;
  readonly runToken: number;
}

type PreviewWindow = Window & { Module?: PreviewRuntimeModule };

export function GamePreviewHost({
  config,
  levelNumber,
  currentLevelInfo,
  terrainDataBytes,
  terrainRsrcBytes,
  runToken,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [statusText, setStatusText] = useState("Preparing game runtime…");
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let sizeFrame: number | undefined;
    let loadTimer: number | undefined;
    let stopGame: (() => void) | null = null;
    let activeModule: PreviewRuntimeModule | null = null;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Terrain bytes are still being serialized — show a holding status and wait.
    // The effect will re-run automatically when the bytes prop changes to non-undefined.
    if (terrainDataBytes === undefined || terrainRsrcBytes === undefined) {
      setErrorText(null);
      setStatusText("Preparing level data…");
      return;
    }

    const previewWindow = window as unknown as PreviewWindow;
    const cleanupGlobals = applyPreviewGlobals(previewWindow, config, levelNumber);
    const terrainPaths = getPreviewTerrainPaths(currentLevelInfo, config);
    const assetBaseUrl = buildPreviewAssetBaseUrl(config);
    const cacheBustToken = `${String(config.game)}-${String(levelNumber)}-${String(runToken)}`;
    const previousModule = previewWindow.Module;

    setErrorText(null);
    setStatusText("Preparing game runtime…");

    // Wait one animation frame so the dialog layout settles before we measure the
    // canvas and hand it to the WASM runtime. This prevents the game from starting
    // at an incorrect resolution while the dialog's CSS transition is still running.
    sizeFrame = window.requestAnimationFrame(() => {
      if (cancelled) return;

      const { clientWidth, clientHeight } = canvas;
      if (clientWidth > 0 && clientHeight > 0) {
        canvas.width = Math.round(clientWidth);
        canvas.height = Math.round(clientHeight);
      }

      activeModule = createPreviewModule({
        config,
        levelNumber,
        currentLevelInfo,
        canvas,
        assetBaseUrl,
        cacheBustToken,
        terrainDataBytes,
        terrainRsrcBytes,
        terrainPaths,
        onStatus: (text) => {
          if (!cancelled) {
            setErrorText(null);
            setStatusText(text);
          }
        },
        onError: (text) => {
          if (!cancelled) {
            setErrorText(text);
            setStatusText("Failed to start game.");
          }
        },
      });

      previewWindow.Module = activeModule as unknown as PreviewWindow["Module"];
      const scriptUrl = new URL(config.mainJs, assetBaseUrl).href + `?v=${cacheBustToken}`;

      loadTimer = window.setTimeout(() => {
        void (async () => {
          if (cancelled || activeModule === null) return;
          const stopOrErr = await ResultAsync.fromPromise(
            loadPreviewRuntime(activeModule, scriptUrl),
            (e) => (e instanceof Error ? e : new Error(String(e))),
          );
          if (cancelled) {
            if (stopOrErr.isOk()) stopOrErr.value();
            return;
          }
          if (stopOrErr.isErr()) {
            setErrorText(stopOrErr.error.message);
            setStatusText("Failed to start game.");
            return;
          }
          stopGame = stopOrErr.value;
        })();
      }, 0);
    });

    return () => {
      cancelled = true;
      if (sizeFrame !== undefined) window.cancelAnimationFrame(sizeFrame);
      if (loadTimer !== undefined) window.clearTimeout(loadTimer);
      stopGame?.();
      stopGame = null;
      cleanupGlobals();
      if (activeModule !== null && previewWindow.Module === (activeModule as unknown as PreviewWindow["Module"])) {
        if (previousModule === undefined) {
          delete previewWindow.Module;
        } else {
          previewWindow.Module = previousModule;
        }
      }
    };
  }, [config, currentLevelInfo, levelNumber, runToken, terrainDataBytes, terrainRsrcBytes]);

  const showStatus = Boolean(statusText) || Boolean(errorText);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas
        id="canvas"
        ref={canvasRef}
        className="h-full w-full block bg-black outline-none"
        tabIndex={-1}
        onContextMenu={(e) => { e.preventDefault(); }}
      />
      {showStatus ? (
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 bg-gradient-to-b from-black/90 to-slate-950/95 text-center p-6">
          <div className="text-lg font-semibold text-slate-100">
            {`Launching ${GAME_DISPLAY_NAMES[config.game]}`}
          </div>
          <div className="text-sm text-slate-300 max-w-md">
            {errorText ?? statusText}
          </div>
        </div>
      ) : null}
    </div>
  );
}
