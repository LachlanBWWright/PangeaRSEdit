import { describe, expect, it } from "vitest";
import { Game, OttoGlobals, Bugdom2Globals, CroMagGlobals, Nanosaur2Globals } from "@/data/globals/globals";
import { getLiquidTextureCanvas, getLiquidVisualStyle } from "./liquidTextureHelpers";

describe("liquidTextureHelpers", () => {
  it("maps game-specific liquid IDs to stable visual styles", () => {
    expect(getLiquidVisualStyle(Bugdom2Globals, 1)).toMatchObject({ textureKind: "pool" });
    expect(getLiquidVisualStyle(Bugdom2Globals, 2)).toMatchObject({ textureKind: "garbage" });
    expect(getLiquidVisualStyle(CroMagGlobals, 1)).toMatchObject({ textureKind: "tar" });
    expect(getLiquidVisualStyle(Nanosaur2Globals, 0)).toMatchObject({ textureKind: "green" });
    expect(getLiquidVisualStyle(Nanosaur2Globals, 7)).toMatchObject({ textureKind: "lava" });
    expect(getLiquidVisualStyle(OttoGlobals, 1)).toMatchObject({ textureKind: "soap" });
    expect(getLiquidVisualStyle(OttoGlobals, 6)).toMatchObject({ textureKind: "radioactive" });
    expect(getLiquidVisualStyle({ ...OttoGlobals, GAME_TYPE: Game.OTTO_MATIC }, 99)).toMatchObject({ textureKind: "water" });
  });

  it("creates a 64px texture and reuses it for equivalent requests", () => {
    const first = getLiquidTextureCanvas(OttoGlobals, 7);
    const second = getLiquidTextureCanvas(OttoGlobals, 7);
    expect(first).toBe(second);
    expect([first.width, first.height]).toEqual([64, 64]);
  });

  it("renders every texture branch without requiring a real browser canvas", () => {
    const kinds = [
      [OttoGlobals, 0], [OttoGlobals, 1], [OttoGlobals, 2], [OttoGlobals, 3],
      [OttoGlobals, 4], [OttoGlobals, 5], [OttoGlobals, 6], [OttoGlobals, 7],
      [Bugdom2Globals, 2], [CroMagGlobals, 1], [Nanosaur2Globals, 0], [Nanosaur2Globals, 7],
    ] as const;
    for (const [globals, liquidType] of kinds) {
      const canvas = getLiquidTextureCanvas(globals, liquidType);
      expect(canvas.width).toBe(64);
      expect(canvas.height).toBe(64);
    }
  });
});
