import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  BUGDOM_ACCESSIBILITY_MIN_GAP,
  NANOSAUR2_MAX_REACHABLE_HEIGHT,
  NANOSAUR_MAX_REACHABLE_HEIGHT,
  buildAccessibilityMaskColors,
  getAccessibilityOverlayLabel,
  isTerrainVertexInaccessible,
} from "./terrainAccessibility";

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

  it("describes the active threshold in the toggle label", () => {
    expect(getAccessibilityOverlayLabel(Game.BUGDOM)).toContain(
      BUGDOM_ACCESSIBILITY_MIN_GAP.toString(),
    );
    expect(getAccessibilityOverlayLabel(Game.NANOSAUR)).toContain(
      NANOSAUR_MAX_REACHABLE_HEIGHT.toString(),
    );
  });
});
