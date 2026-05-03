import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";
import { startGamePreview } from "./gamePreviewHostRuntime";

export interface PreviewState {
  readonly runToken: number;
  readonly statusText: string;
  readonly errorText: string | null;
}

interface PreviewTerrainBytes {
  readonly terrainDataBytes: Uint8Array | null | undefined;
  readonly terrainRsrcBytes: Uint8Array | null | undefined;
  readonly terrainTextureBytes: Uint8Array | null | undefined;
}

interface WaitingForPreviewLevelDataOptions extends PreviewTerrainBytes {
  readonly normalLaunch: boolean;
}

interface StartPreparedGamePreviewOptions extends PreviewTerrainBytes {
  readonly canvas: HTMLCanvasElement | null;
  readonly config: GamePortConfig;
  readonly levelNumber: number;
  readonly currentLevelInfo: AnyLevelInfo | undefined;
  readonly runToken: number;
  readonly normalLaunch: boolean;
  readonly onStatus: (text: string) => void;
  readonly onError: (text: string) => void;
}

interface PreviewOverlayState {
  readonly statusText: string;
  readonly errorText: string | null;
  readonly showStatus: boolean;
}

export function isWaitingForPreviewLevelData({
  normalLaunch,
  terrainDataBytes,
  terrainRsrcBytes,
  terrainTextureBytes,
}: WaitingForPreviewLevelDataOptions): boolean {
  return (
    !normalLaunch &&
    (terrainDataBytes === undefined ||
      terrainRsrcBytes === undefined ||
      terrainTextureBytes === undefined)
  );
}

export function startPreparedGamePreview({
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
}: StartPreparedGamePreviewOptions): (() => void) | undefined {
  if (!canvas) {
    return undefined;
  }

  if (
    isWaitingForPreviewLevelData({
      normalLaunch,
      terrainDataBytes,
      terrainRsrcBytes,
      terrainTextureBytes,
    })
  ) {
    return undefined;
  }

  return startGamePreview({
    canvas,
    config,
    levelNumber,
    currentLevelInfo,
    terrainDataBytes: terrainDataBytes ?? null,
    terrainRsrcBytes: terrainRsrcBytes ?? null,
    terrainTextureBytes: terrainTextureBytes ?? null,
    runToken,
    normalLaunch,
    onStatus,
    onError,
  });
}

export function getPreviewOverlayState(
  previewState: PreviewState,
  runToken: number,
  waitingForLevelData: boolean,
): PreviewOverlayState {
  const statusText = waitingForLevelData
    ? "Preparing level data…"
    : previewState.runToken === runToken
      ? previewState.statusText
      : "Preparing game runtime…";
  const errorText =
    waitingForLevelData || previewState.runToken !== runToken
      ? null
      : previewState.errorText;

  return {
    statusText,
    errorText,
    showStatus: Boolean(statusText) || Boolean(errorText),
  };
}
