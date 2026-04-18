import { useEffect, useRef, useState } from "react";
import {
  applyPreviewGlobals,
  buildPreviewAssetBaseUrl,
  createPreviewModule,
  decodeBase64ToBytes,
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
  readonly terrainDataBase64: string | null;
  readonly runToken: number;
}

type PreviewWindow = Window &
  {
    Module?: PreviewRuntimeModule;
  };

export function GamePreviewHost({
  config,
  levelNumber,
  currentLevelInfo,
  terrainDataBase64,
  runToken,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [statusText, setStatusText] = useState("Preparing game runtime…");
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const updateSize = () => {
      const { clientWidth, clientHeight } = canvas;
      if (clientWidth > 0 && clientHeight > 0) {
        setCanvasSize({ width: Math.round(clientWidth), height: Math.round(clientHeight) });
      }
    };

    updateSize();
    const frame = window.requestAnimationFrame(updateSize);
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateSize)
        : null;
    observer?.observe(canvas);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [runToken, config.game]);

  useEffect(() => {
    let cancelled = false;
    let loadTimer: number | undefined;
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize) {
      return;
    }

    const previewWindow = window as unknown as PreviewWindow;
    const cleanupGlobals = applyPreviewGlobals(previewWindow, config, levelNumber);
    const terrainPaths = getPreviewTerrainPaths(currentLevelInfo, config);
    const terrainBytes = terrainDataBase64 ? decodeBase64ToBytes(terrainDataBase64) : null;
    const assetBaseUrl = buildPreviewAssetBaseUrl(config);
    const cacheBustToken = `${String(config.game)}-${String(levelNumber)}-${String(runToken)}`;
    const previousModule = previewWindow.Module as PreviewRuntimeModule | undefined;
    const module = createPreviewModule({
      config,
      levelNumber,
      currentLevelInfo,
      canvas,
      assetBaseUrl,
      cacheBustToken,
      terrainBytes,
      terrainPaths,
      onStatus: (text) => {
        setErrorText(null);
        setStatusText(text);
      },
      onError: (text) => {
        setErrorText(text);
        setStatusText("Failed to start game.");
      },
    });

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    previewWindow.Module = module as unknown as PreviewWindow["Module"];
    const scriptUrl = new URL(config.mainJs, assetBaseUrl).href + `?v=${cacheBustToken}`;
    loadTimer = window.setTimeout(() => {
      void (async () => {
        try {
          if (cancelled) {
            return;
          }
          await loadPreviewRuntime(module, scriptUrl);
        } catch (error) {
          if (cancelled) {
            return;
          }
          const message =
            error instanceof Error
              ? error.message
              : `Failed to load ${config.mainJs}.`;
          setErrorText(message);
          setStatusText("Failed to start game.");
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      if (typeof loadTimer !== "undefined") {
        window.clearTimeout(loadTimer);
      }
      cleanupGlobals();
      if (previewWindow.Module === module) {
        if (typeof previousModule === "undefined") {
          delete previewWindow.Module;
        } else {
          previewWindow.Module = previousModule as unknown as PreviewWindow["Module"];
        }
      }
    };
  }, [canvasSize, config, currentLevelInfo, levelNumber, runToken, terrainDataBase64]);

  const showStatus = Boolean(statusText) || Boolean(errorText);

  return (
    <div className="absolute inset-0 bg-black">
      <canvas
        ref={canvasRef}
        width={canvasSize?.width ?? 640}
        height={canvasSize?.height ?? 480}
        className="h-full w-full block bg-black outline-none"
        tabIndex={-1}
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
