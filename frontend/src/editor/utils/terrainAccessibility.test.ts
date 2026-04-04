import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  BUGDOM_ACCESSIBILITY_MIN_GAP,
  NANOSAUR2_MAX_REACHABLE_HEIGHT,
  NANOSAUR_MAX_REACHABLE_HEIGHT,
  buildAccessibilityMaskColors,
  getAccessibilityOverlayLabel,
  hasAccessibleOverlayData,
  isTerrainVertexInaccessible,
} from "./terrainAccessibility";
import type { StandardHeader } from "@/python/structSpecs/LevelTypes";

const testHeader: StandardHeader = {
  version: 1,
  numItems: 0,
  mapWidth: 1,
  mapHeight: 1,
  tileSize: 1,
  minY: 0,
  maxY: 0,
  numSplines: 0,
  numFences: 0,
  numTilePages: 0,
  numTiles: 0,
  numUniqueSupertiles: 0,
  numWaterPatches: 0,
  numCheckpoints: 0,
};

describe("terrainAccessibility", () => {
  it("marks Bugdom vertices as inaccessible when the ceiling gap is too small", () => {
    expect(
      isTerrainVertexInaccessible(
        Game.BUGDOM,
        100,
        100 + BUGDOM_ACCESSIBILITY_MIN_GAP - 1,
      ),
    ).toBe(true);
    expect(
      isTerrainVertexInaccessible(
        Game.BUGDOM,
        100,
        100 + BUGDOM_ACCESSIBILITY_MIN_GAP,
      ),
    ).toBe(false);
  });

  it("marks Nanosaur heights above the configured limits", () => {
    expect(
      isTerrainVertexInaccessible(
        Game.NANOSAUR,
        NANOSAUR_MAX_REACHABLE_HEIGHT + 1,
        undefined,
      ),
    ).toBe(true);
    expect(
      isTerrainVertexInaccessible(
        Game.NANOSAUR_2,
        NANOSAUR2_MAX_REACHABLE_HEIGHT + 1,
        undefined,
      ),
    ).toBe(true);
  });

  it("builds a visible mask only for inaccessible cells", () => {
    const colors = buildAccessibilityMaskColors(
      Game.BUGDOM,
      [0, 0],
      [BUGDOM_ACCESSIBILITY_MIN_GAP - 1, BUGDOM_ACCESSIBILITY_MIN_GAP + 20],
    );

    expect(colors.slice(0, 4)).toEqual([255, 64, 64, 150]);
    expect(colors.slice(4, 8)).toEqual([0, 0, 0, 0]);
  });

  it("keeps the toggle label generic in the UI", () => {
    expect(getAccessibilityOverlayLabel()).toBe(
      "Show inaccessible terrain mask",
    );
    expect(getAccessibilityOverlayLabel()).toBe(
      "Show inaccessible terrain mask",
    );
  });

  it("only exposes Bugdom masking when the level actually has ceiling data", () => {
    expect(
      hasAccessibleOverlayData(
        Game.BUGDOM,
        testHeader,
        [0, 0, 0, 0],
        undefined,
      ),
    ).toBe(false);

    expect(
      hasAccessibleOverlayData(
        Game.BUGDOM,
        testHeader,
        [0, 0, 0, 0],
        [10, 10, 10, 10],
      ),
    ).toBe(true);
  });
});
