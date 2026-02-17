import { describe, expect, it } from "vitest";
import {
  canRemoveSupertileColumn,
  canRemoveSupertileRow,
  getSupertileCounts,
} from "./supertileResizeGuards";

describe("supertileResizeGuards", () => {
  it("derives supertile dimensions from map and tile sizes", () => {
    expect(getSupertileCounts(64, 80, 8)).toEqual({ width: 8, height: 10 });
    expect(getSupertileCounts(10, 10, 5)).toEqual({ width: 2, height: 2 });
  });

  it("blocks removals when only one row or column remains", () => {
    expect(canRemoveSupertileRow(1)).toBe(false);
    expect(canRemoveSupertileColumn(1)).toBe(false);
    expect(canRemoveSupertileRow(2)).toBe(true);
    expect(canRemoveSupertileColumn(2)).toBe(true);
  });
});
