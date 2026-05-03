import { describe, expect, it } from "vitest";
import {
  getPreviewOverlayState,
  isWaitingForPreviewLevelData,
  type PreviewState,
} from "./gamePreviewHostState";

describe("isWaitingForPreviewLevelData", () => {
  it("waits while any required terrain payload is undefined", () => {
    expect(
      isWaitingForPreviewLevelData({
        normalLaunch: false,
        terrainDataBytes: new Uint8Array([1]),
        terrainRsrcBytes: undefined,
        terrainTextureBytes: null,
      }),
    ).toBe(true);
  });

  it("does not wait for a normal launch", () => {
    expect(
      isWaitingForPreviewLevelData({
        normalLaunch: true,
        terrainDataBytes: undefined,
        terrainRsrcBytes: undefined,
        terrainTextureBytes: undefined,
      }),
    ).toBe(false);
  });
});

describe("getPreviewOverlayState", () => {
  const previewState: PreviewState = {
    runToken: 3,
    statusText: "Loading game…",
    errorText: "boom",
  };

  it("shows the waiting message while terrain serialization is pending", () => {
    expect(getPreviewOverlayState(previewState, 3, true)).toEqual({
      statusText: "Preparing level data…",
      errorText: null,
      showStatus: true,
    });
  });

  it("hides stale errors from older runs", () => {
    expect(getPreviewOverlayState(previewState, 4, false)).toEqual({
      statusText: "Preparing game runtime…",
      errorText: null,
      showStatus: true,
    });
  });

  it("shows the current run status and error", () => {
    expect(getPreviewOverlayState(previewState, 3, false)).toEqual({
      statusText: "Loading game…",
      errorText: "boom",
      showStatus: true,
    });
  });
});
