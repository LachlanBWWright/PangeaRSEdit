import { describe, it, expect } from "vitest";
import { splitLevelData, combineLevelData } from "./levelDataUtils";
import type { LevelData } from "@/python/structSpecs/LevelTypes";

describe("level data utils", () => {
  it("allows combining when optional sections are missing", () => {
    // Create a minimal level data structure for testing
    // Using type assertion since this is test data with intentionally minimal structure
    const level = {
      Hedr: {
        1000: { name: "Header", obj: { version: 1, numItems: 0, mapWidth: 64, mapHeight: 64, tileSize: 32, minY: 0, maxY: 255, numSplines: 0, numFences: 0, numTilePages: 0, numTiles: 0, numUniqueSupertiles: 0, numWaterPatches: 0, numCheckpoints: 0 }, order: 0 },
      },
      // Minimal terrain necessary
      ItCo: {
        1000: { name: "Terrain Items Color Array", data: "", order: 0 },
      },
      YCrd: {
        1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 },
      },
      STgd: {
        1000: { name: "SuperTile Grid", obj: [], order: 0 },
      },
      _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
      Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
      alis: {},
    };

    const atomic = splitLevelData(level);
    // Intentionally missing item/fence/spline/liquid
    expect(atomic.itemData).toBeNull();
    expect(atomic.fenceData).toBeNull();

    // Combine directly without injecting empty defaults; optional sections may be missing
    const combined = combineLevelData(atomic);
    expect(combined.ok).toBe(true);
  });

  it("validateResourceForkJson detects malformed types", async () => {
    const good = {
      _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
      Hedr: { 1000: { name: "Header", obj: {}, order: 0 } },
      Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
    };
    const { validateResourceForkJson } = await import("./levelDataUtils");
    expect(validateResourceForkJson(good).ok).toBe(true);

    const bad = {
      _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
      Hedr: "not-an-object",
    };
    const res = validateResourceForkJson(bad);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.badKey).toBe("Hedr");
    }
  });
});
