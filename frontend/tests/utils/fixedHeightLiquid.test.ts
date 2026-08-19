import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  FIXED_LIQUID_HEIGHTS,
  resolveLiquidSurfaceHeight,
  supportsFixedHeightLiquid,
  WATER_FLAG_FIXED_HEIGHT,
} from "@/data/water/fixedHeightLiquid";

describe("fixed-height liquids", () => {
  it.each([Game.BUGDOM_2, Game.NANOSAUR_2, Game.BILLY_FRONTIER])(
    "supports game %s",
    (game) => {
      expect(supportsFixedHeightLiquid(game)).toBe(true);
    },
  );

  it("uses the game's fixed height when the flag is set", () => {
    expect(
      resolveLiquidSurfaceHeight({
        supportsFixedHeight: true,
        flags: WATER_FLAG_FIXED_HEIGHT,
        heightIndex: 0,
        terrainRelativeHeight: 123,
      }),
    ).toBe(FIXED_LIQUID_HEIGHTS[0]);
  });

  it("retains terrain-relative height without the flag", () => {
    expect(
      resolveLiquidSurfaceHeight({
        supportsFixedHeight: true,
        flags: 0,
        heightIndex: 0,
        terrainRelativeHeight: 123,
      }),
    ).toBe(123);
  });
});
