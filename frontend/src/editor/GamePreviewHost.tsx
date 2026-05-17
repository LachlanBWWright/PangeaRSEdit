import { useEffect, useRef, useState } from "react";
import { GAME_DISPLAY_NAMES } from "./utils/gamePreviewRuntime";
import type { AnyLevelInfo, GamePortConfig } from "./utils/gamePortConfig";
import type { MultiplayerMatchConfig } from "@/multiplayer/types";
import type { MultiplayerRuntimeManagedTransport } from "@/multiplayer/runtimeBridge";
import {
  getPreviewOverlayState,
  isWaitingForPreviewLevelData,
  startPreparedGamePreview,
  type PreviewState,
} from "./utils/gamePreviewHostState";
import type { PreviewVfsFile } from "./utils/gamePreviewRuntime";

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
  /**
   * Bytes for a secondary texture file such as Nanosaur 1's .trt tileset.
   * `undefined` = serialization is still in progress.
   * `null`      = no texture file needed for this game.
   */
  readonly terrainTextureBytes: Uint8Array | null | undefined;
  readonly customFiles?: readonly PreviewVfsFile[];
  readonly runToken: number;
  readonly networkMatchConfig?: MultiplayerMatchConfig | null;
  readonly networkRuntimeTransport?: MultiplayerRuntimeManagedTransport | null;
  /** When true, launch from the title screen without level injection or level-jump globals. */
  readonly normalLaunch?: boolean;
}

export function GamePreviewHost({
  config,
  levelNumber,
  currentLevelInfo,
  terrainDataBytes,
  terrainRsrcBytes,
  terrainTextureBytes,
  customFiles,
  runToken,
  networkMatchConfig,
  networkRuntimeTransport,
  normalLaunch = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>({
    runToken,
    statusText: "Preparing game runtime…",
    errorText: null,
  });

  useEffect(() => {
    return startPreparedGamePreview({
      canvas: canvasRef.current,
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
      networkRuntimeTransport,
      onStatus: (text) => {
        setPreviewState({ runToken, statusText: text, errorText: null });
      },
      onError: (text) => {
        setPreviewState({
          runToken,
          statusText: "Failed to start game.",
          errorText: text,
        });
      },
    });
  }, [
    config,
    currentLevelInfo,
    levelNumber,
    normalLaunch,
    runToken,
    networkMatchConfig,
    networkRuntimeTransport,
    terrainDataBytes,
    terrainRsrcBytes,
    terrainTextureBytes,
    customFiles,
  ]);

  const waitingForLevelData = isWaitingForPreviewLevelData({
    normalLaunch,
    terrainDataBytes,
    terrainRsrcBytes,
    terrainTextureBytes,
  });
  const { statusText, errorText, showStatus } = getPreviewOverlayState(
    previewState,
    runToken,
    waitingForLevelData,
  );

  return (
    <div className="absolute inset-0 bg-black">
      <canvas
        id="canvas"
        ref={canvasRef}
        className="h-full w-full block bg-black outline-none"
        tabIndex={-1}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      />
      {showStatus ? (
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 bg-linear-to-b from-black/90 to-slate-950/95 text-center p-6">
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
