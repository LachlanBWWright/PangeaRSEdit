import { describe, it, expect } from "vitest";
import { splitLevelData, combineLevelData, AtomicLevelData } from "./levelDataUtils";
import type { LevelData } from "@/python/structSpecs/LevelTypes";

describe("level data utils", () => {
  it("allows combining when optional sections are missing", () => {
    const level: Partial<LevelData> = {
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
    } as unknown as LevelData;

    const atomic = splitLevelData(level as LevelData);
    // Intentionally missing item/fence/spline/liquid
    expect(atomic.itemData).toBeNull();
    expect(atomic.fenceData).toBeNull();

    // Combine directly without injecting empty defaults; optional sections may be missing
    const combined = combineLevelData(atomic);
    expect(combined.ok).toBe(true);
  });

  it("validateResourceForkJson detects malformed types", () => {
    const good = {
      _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
      Hedr: { 1000: { name: "Header", obj: {}, order: 0 } },
      Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
    };
    const { validateResourceForkJson } = require("./levelDataUtils");
    expect(validateResourceForkJson(good).ok).toBe(true);

    const bad = {
      _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
      Hedr: "not-an-object",
    };
    const res = validateResourceForkJson(bad as unknown as Record<string, unknown>);
    expect(res.ok).toBe(false);
    expect(res.badKey).toBe("Hedr");
  });
});
