import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import parseNanosaurLevelFile from "@/editor/loadLogic/parseNanosaurLevelFile";
import { NanosaurGlobals } from "@/data/globals/globals";

describe("Nanosaur 1 heightmap parsing", () => {
  it("should create YCrd values that are within reasonable bounds", async () => {
    const terrainDir = join(
      __dirname,
      "../../../../public/assets/nanosaur/terrain",
    );
    const filePath = join(terrainDir, "Level1.ter");
    const fileData = readFileSync(filePath);
    const blob = new Blob([fileData]);

    const setData = (_data: any) => {};
    const result = await parseNanosaurLevelFile(blob, NanosaurGlobals, setData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Extract YCrd array
    const ycrd = result.value.YCrd?.[1000]?.obj;
    expect(Array.isArray(ycrd)).toBe(true);
    expect(ycrd.length).toBeGreaterThan(0);

    const maxY = Math.max(...ycrd);
    const minY = Math.min(...ycrd);

    // Nanosaur 1 height pixels are 0..255. After conversion to pixel units we expect
    // YCrd values to be <= ~260 (255 * 4 * 32/140 ≈ 234). Use a safe upper bound.
    expect(maxY).toBeLessThanOrEqual(300);
    expect(minY).toBeGreaterThanOrEqual(-10);
  });
});
