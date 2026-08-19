import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { getTileAttributeIndex } from "@/editor/subviews/tileViewState";
import { createImageCanvas } from "@/editor/subviews/tiles/tilesUtils";

describe("tile attribute raster", () => {
  it("removes Nanosaur tile transform bits", () => {
    expect(getTileAttributeIndex(Game.NANOSAUR, 0xd123)).toBe(0x123);
  });

  it("preserves Cro-Mag's full tile attribute index", () => {
    expect(getTileAttributeIndex(Game.CRO_MAG, 0x5123)).toBe(0x5123);
  });

  it("returns an error for an incomplete RGBA raster", () => {
    const result = createImageCanvas(2, 2, [255, 255, 255, 255]);

    expect(result.isErr()).toBe(true);
  });
});
