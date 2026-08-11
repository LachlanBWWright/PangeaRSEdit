import { describe, expect, it } from "vitest";
import {
  MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS,
  MIGHTY_MIKE_UNUSED_FLAG_OPTIONS,
  getFlagChecked,
  getFlagLabel,
  getMask,
  getTileInfoRows,
  parseInputNumber,
  toggleFlagBit,
} from "@/editor/subviews/mightymike/mightyMikeTileInspectorState";
import { getTileIndexFromPointerPosition } from "@/editor/subviews/supertiles/mightyMikeSupertilesState";
import {
  canEditTileTexture,
  canRemoveSupertile,
  updateSelectedTileTexture,
} from "@/editor/subviews/supertiles/supertileMenuState";

describe("Mighty Mike tile inspector state", () => {
  it("partitions active and unused flags and labels unknown bits", () => {
    expect(MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS).toHaveLength(13);
    expect(MIGHTY_MIKE_UNUSED_FLAG_OPTIONS.map(([bit]) => bit)).toEqual([6, 13, 14]);
    expect(getFlagLabel(4)).toBe("Death");
    expect(getFlagLabel(6)).toBe("Bit 6 (unused)");
    expect(getFlagLabel(20)).toBe("Bit 20");
  });

  it("creates, checks, enables, and disables bit masks", () => {
    expect(getMask(3)).toBe(8);
    expect(getFlagChecked(8, 3)).toBe(true);
    expect(getFlagChecked(8, 2)).toBe(false);
    expect(toggleFlagBit(0, 3, true)).toBe(8);
    expect(toggleFlagBit(15, 3, false)).toBe(7);
  });

  it.each([["", 0], ["invalid", 0], ["14", 14], ["-3", -3], ["2.9", 2]])("parses numeric input %j", (input, expected) => {
    expect(parseInputNumber(input)).toBe(expected);
  });

  it("formats tile diagnostics including missing values", () => {
    expect(getTileInfoRows({ mapWidth: 4, mapHeight: 3, totalTiles: 12, mapImagesLength: 8, effectiveSelectedTile: 1, layr: [5, 7], currentImageIndex: 9, hasXlatTable: true })).toEqual([
      "Map: 4 x 3", "Total: 12", "Images: 8", "Pos: 1", "Logical: 7", "Physical: 9", "Xlat: Yes",
    ]);
    expect(getTileInfoRows({ mapWidth: 1, mapHeight: 1, totalTiles: 1, mapImagesLength: 0, effectiveSelectedTile: 2, layr: [], currentImageIndex: null, hasXlatTable: false }).slice(4)).toEqual([
      "Logical: N/A", "Physical: N/A", "Xlat: No",
    ]);
  });
});

describe("supertile interaction state", () => {
  it.each([
    [0, 0, 0], [31, 0, 0], [32, 0, 1], [0, 32, 4], [95, 63, 6],
  ])("maps pointer (%s, %s) to tile %s", (x, y, expected) => {
    expect(getTileIndexFromPointerPosition(x, y, 32, 4, 2, 8)).toBe(expected);
  });

  it("rejects negative, outside-map, and outside-layer positions", () => {
    expect(getTileIndexFromPointerPosition(-1, 0, 32, 4, 2, 8)).toBeNull();
    expect(getTileIndexFromPointerPosition(128, 0, 32, 4, 2, 8)).toBeNull();
    expect(getTileIndexFromPointerPosition(0, 64, 32, 4, 2, 8)).toBeNull();
    expect(getTileIndexFromPointerPosition(96, 32, 32, 4, 2, 6)).toBeNull();
  });

  it("validates and immutably replaces selected tile textures", () => {
    const first = document.createElement("canvas");
    const second = document.createElement("canvas");
    const replacement = document.createElement("canvas");
    const images = [first, second];
    expect(canEditTileTexture(9, [{ superTileId: 1 }], images)).toEqual({ ok: false, error: "No tile data at this position" });
    expect(canEditTileTexture(0, [{ superTileId: 0 }], images)).toEqual({ ok: false, error: "No texture available for this tile" });
    expect(canEditTileTexture(0, [{ superTileId: 1 }], images)).toEqual({ ok: true });
    expect(updateSelectedTileTexture(9, [{ superTileId: 1 }], images, replacement)).toEqual({ error: "No tile data at this position" });
    expect(updateSelectedTileTexture(0, [{ superTileId: 0 }], images, replacement)).toEqual({ error: "Selected tile is empty and cannot be replaced" });
    const result = updateSelectedTileTexture(0, [{ superTileId: 1 }], images, replacement);
    expect("mapImages" in result && result.mapImages[1]).toBe(replacement);
    expect(images[1]).toBe(second);
  });

  it("prevents shrinking dimensions below the resize guard minimum", () => {
    expect(canRemoveSupertile("top", 2, 2)).toBe(true);
    expect(canRemoveSupertile("bottom", 2, 1)).toBe(false);
    expect(canRemoveSupertile("left", 2, 2)).toBe(true);
    expect(canRemoveSupertile("right", 1, 2)).toBe(false);
  });
});
