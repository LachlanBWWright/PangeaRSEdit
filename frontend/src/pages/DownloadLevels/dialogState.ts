import type { Game } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS } from "@/editor/utils/gamePortConfig";

export interface DownloadDialogState {
  readonly game: Game | null;
  readonly level: number;
  readonly open: boolean;
  readonly normalLaunch: boolean;
  readonly terrainDataBytes: Uint8Array | null;
  readonly terrainRsrcBytes: Uint8Array | null;
}

export const INITIAL_DOWNLOAD_DIALOG_STATE: DownloadDialogState = {
  game: null,
  level: 0,
  open: false,
  normalLaunch: false,
  terrainDataBytes: null,
  terrainRsrcBytes: null,
};

/** Opens the download dialog for a specific custom level payload. */
export function openCustomLevelDialog(
  game: Game,
  level: number,
  terrainDataBytes: Uint8Array | null,
  terrainRsrcBytes: Uint8Array | null,
): DownloadDialogState {
  return {
    game,
    level,
    open: true,
    normalLaunch: false,
    terrainDataBytes,
    terrainRsrcBytes,
  };
}

/** Opens the download dialog in normal-launch mode using the game's default level. */
export function openNormalLaunchDialog(game: Game): DownloadDialogState {
  return {
    game,
    level: GAME_PORT_CONFIGS[game].defaultLevel,
    open: true,
    normalLaunch: true,
    terrainDataBytes: null,
    terrainRsrcBytes: null,
  };
}

/** Sets the dialog open flag while clearing the game when the dialog closes. */
export function setDialogOpenState(
  state: DownloadDialogState,
  open: boolean,
): DownloadDialogState {
  return open
    ? { ...state, open: true }
    : { ...state, open: false, game: null };
}
