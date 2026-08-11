import { describe, expect, it } from "vitest";
import {
  flipTileBrushHorizontal,
  flipTileBrushVertical,
  renameTileBrush,
  rotateTileBrushClockwise,
  setTileBrushCell,
} from "@/data/tileBrushes/tileBrushTransforms";
import type { TileBrush } from "@/data/tileBrushes/tileBrushTypes";
import { TILE_FLIPX_MASK, TILE_FLIPY_MASK } from "@/editor/subviews/bugdom/BugdomTileRenderer.utils";

function brush(game: TileBrush["game"] = "bugdom1"): TileBrush {
  return {
    id: "brush",
    name: "Original",
    game,
    width: 2,
    height: 3,
    cells: [1, 2, 3, 4, 5, 6].map((tileValue) => ({ tileValue, enabled: true })),
  };
}

describe("tile brush transforms", () => {
  it("rotates rectangular brushes clockwise and increments encoded rotation", () => {
    const result = rotateTileBrushClockwise(brush());
    expect([result.width, result.height]).toEqual([3, 2]);
    expect(result.cells.map((cell) => cell.tileValue)).toEqual([
      5 | 0x1000, 3 | 0x1000, 1 | 0x1000,
      6 | 0x1000, 4 | 0x1000, 2 | 0x1000,
    ]);
  });

  it("reorders Mighty Mike brushes without changing tile encodings", () => {
    const result = rotateTileBrushClockwise(brush("mightymike"));
    expect(result.cells.map((cell) => cell.tileValue)).toEqual([5, 3, 1, 6, 4, 2]);
  });

  it("flips cell positions and toggles the corresponding encoded flags", () => {
    const horizontal = flipTileBrushHorizontal(brush());
    expect(horizontal.cells.map((cell) => cell.tileValue)).toEqual([
      2 ^ TILE_FLIPX_MASK, 1 ^ TILE_FLIPX_MASK,
      4 ^ TILE_FLIPX_MASK, 3 ^ TILE_FLIPX_MASK,
      6 ^ TILE_FLIPX_MASK, 5 ^ TILE_FLIPX_MASK,
    ]);
    const vertical = flipTileBrushVertical(brush());
    expect(vertical.cells.map((cell) => cell.tileValue)).toEqual([
      5 ^ TILE_FLIPY_MASK, 6 ^ TILE_FLIPY_MASK,
      3 ^ TILE_FLIPY_MASK, 4 ^ TILE_FLIPY_MASK,
      1 ^ TILE_FLIPY_MASK, 2 ^ TILE_FLIPY_MASK,
    ]);
  });

  it("renames and edits cells immutably", () => {
    const source = brush();
    expect(renameTileBrush(source, "Updated")).toMatchObject({ name: "Updated", id: "brush" });
    expect(setTileBrushCell(source, 1, 99).cells[1]).toEqual({ tileValue: 99, enabled: true });
    expect(setTileBrushCell(source, 1, null).cells[1]).toEqual({ tileValue: 2, enabled: false });
    expect(setTileBrushCell(source, 99, 4)).toBe(source);
    expect(source.cells[1]).toEqual({ tileValue: 2, enabled: true });
  });
});
