import { describe, expect, it } from "vitest";
import { Game } from "../../src/data/globals/globals";
import {
  INITIAL_DOWNLOAD_DIALOG_STATE,
  openCustomLevelDialog,
  openNormalLaunchDialog,
  setDialogOpenState,
} from "../../src/pages/DownloadLevels/dialogState";

describe("openCustomLevelDialog", () => {
  it("opens the dialog with injected terrain bytes", () => {
    const terrainDataBytes = new Uint8Array([1, 2, 3]);
    const terrainRsrcBytes = new Uint8Array([4, 5, 6]);

    expect(
      openCustomLevelDialog(Game.BUGDOM, 7, terrainDataBytes, terrainRsrcBytes),
    ).toEqual({
      game: Game.BUGDOM,
      level: 7,
      open: true,
      normalLaunch: false,
      terrainDataBytes,
      terrainRsrcBytes,
    });
  });
});

describe("openNormalLaunchDialog", () => {
  it("opens the dialog at the game's default level with no terrain injection", () => {
    const state = openNormalLaunchDialog(Game.BUGDOM);

    expect(state.game).toBe(Game.BUGDOM);
    expect(state.open).toBe(true);
    expect(state.normalLaunch).toBe(true);
    expect(state.terrainDataBytes).toBeNull();
    expect(state.terrainRsrcBytes).toBeNull();
  });
});

describe("setDialogOpenState", () => {
  it("closes the dialog and clears the selected game", () => {
    const openState = openNormalLaunchDialog(Game.BUGDOM);

    expect(setDialogOpenState(openState, false)).toEqual({
      ...openState,
      open: false,
      game: null,
    });
  });

  it("reopens the existing state without resetting terrain data", () => {
    const openState = openCustomLevelDialog(
      Game.BUGDOM,
      3,
      new Uint8Array([1]),
      new Uint8Array([2]),
    );

    expect(setDialogOpenState(openState, true)).toEqual(openState);
    expect(INITIAL_DOWNLOAD_DIALOG_STATE.open).toBe(false);
  });
});
