import { describe, expect, it } from "vitest";
import {
  TILE_FLIPX_MASK,
  TILE_FLIPY_MASK,
  TILE_ROT2,
} from "@/editor/subviews/bugdom/BugdomTileRenderer.utils";
import { getTileBrushCellVisual } from "@/data/tileBrushes/tileBrushThumbnail";

describe("getTileBrushCellVisual", () => {
  it("decodes first-generation placement transforms", () => {
    const visual = getTileBrushCellVisual(
      "bugdom1",
      7 | TILE_ROT2 | TILE_FLIPX_MASK | TILE_FLIPY_MASK,
      undefined,
    );

    expect(visual).toEqual({
      imageIndex: 7,
      rotationQuarterTurns: 2,
      flipX: true,
      flipY: true,
    });
  });

  it("resolves Mighty Mike logical indexes through the translation table", () => {
    const visual = getTileBrushCellVisual("mightymike", 1, [
      { idx: 4 },
      { idx: 12 },
    ]);

    expect(visual).toEqual({
      imageIndex: 12,
      rotationQuarterTurns: 0,
      flipX: false,
      flipY: false,
    });
  });

  it("ignores invalid translation entries", () => {
    expect(getTileBrushCellVisual("nanosaur1", 3, [{ idx: "bad" }])).toEqual({
      imageIndex: 3,
      rotationQuarterTurns: 0,
      flipX: false,
      flipY: false,
    });
  });
});
