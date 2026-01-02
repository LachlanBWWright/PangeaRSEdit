import { describe, it, expect } from "vitest";
import { splitLevelData, combineLevelData } from "./levelDataUtils";
import type { LevelData } from "@/python/structSpecs/LevelTypes";

describe("level data utils", () => {
  it("allows combining when optional sections are missing", () => {
    const levelUnknown: unknown = {
      Hedr: {
        1000: { name: "Header", obj: { version: 1, numItems: 0, mapWidth: 64, mapHeight: 64, tileSize: 32, minY: 0, maxY: 255, numSplines: 0, numFences: 0 }, order: 0 },
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
    };

    function assertIsLevel(x: unknown): asserts x is LevelData {
      if (typeof x !== 'object' || x === null || !('Hedr' in x)) {
        throw new Error('Value is not a LevelData');
      }
    }

    assertIsLevel(levelUnknown);
    const level: LevelData = levelUnknown;
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
    const badUnknown: unknown = bad;
    function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
      if (typeof x !== 'object' || x === null) {
        throw new Error('Value is not a record');
      }
    }
    assertIsRecord(badUnknown);
    const res = validateResourceForkJson(badUnknown);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.badKey).toBe("Hedr");
    }
  });
});
