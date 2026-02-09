/**
 * Tests for Tile Optimization
 * 
 * Tests the tile optimization utilities for removing unused tiles.
 */

import { describe, it, expect } from "vitest";
import { produce } from "immer";
import type { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import {
  analyzeUnusedTiles,
  computeCompactedIndexMapping,
  compactTileIndices,
  validateOptimization,
  getOptimizationStats,
  type TileOptimizationResult,
} from "@/data/tiles/tileOptimization";

/**
 * Create test data with some unused tiles
 */
function createTestData(): { terrainData: TerrainData; headerData: HeaderData } {
  const headerData: HeaderData = {
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: 1,
          numItems: 0,
          mapWidth: 4,
          mapHeight: 4,
          tileSize: 32,
          minY: 0,
          maxY: 100,
          numSplines: 0,
          numFences: 0,
          numTilePages: 1,
          numTiles: 6,
          numUniqueSupertiles: 1,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
  };

  // 6 tiles: 0 (used), 1 (unused), 2 (used), 3 (unused), 4 (unused), 5 (used)
  const terrainData: TerrainData = {
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: [
          { flags: 0, p0: 0, p1: 0 },
          { flags: 1, p0: 1, p1: 1 },  // unused
          { flags: 2, p0: 2, p1: 2 },
          { flags: 3, p0: 3, p1: 3 },  // unused
          { flags: 4, p0: 4, p1: 4 },  // unused
          { flags: 5, p0: 5, p1: 5 },
        ],
        order: 1,
      },
    },
    Layr: {
      1000: {
        name: "Terrain Layer Matrix",
        obj: [
          0, 0, 0, 0,
          0, 2, 2, 0,
          0, 2, 5, 0,
          0, 0, 5, 5,
        ],
        order: 2,
      },
    },
    Xlat: {
      1000: {
        name: "Tile Index Translation Table",
        obj: [
          { idx: 100 },
          { idx: 101 },
          { idx: 102 },
          { idx: 103 },
          { idx: 104 },
          { idx: 105 },
        ],
        order: 3,
      },
    },
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: "",
        order: 4,
      },
    },
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: new Array(16).fill(0),
        order: 5,
      },
    },
    alis: {
      1000: {
        name: "Texture Page Picture Alias",
        data: "",
        order: 10,
      },
    },
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
    },
  };

  return { terrainData, headerData };
}

describe("Tile Optimization", () => {
  describe("analyzeUnusedTiles", () => {
    it("finds unused tiles", () => {
      const { terrainData } = createTestData();

      const analysis = analyzeUnusedTiles(terrainData);

      // Tiles 1, 3, 4 are unused
      expect(analysis.unusedIndices).toHaveLength(3);
      expect(analysis.unusedIndices).toContain(1);
      expect(analysis.unusedIndices).toContain(3);
      expect(analysis.unusedIndices).toContain(4);
      expect(analysis.canOptimize).toBe(true);
      expect(analysis.estimatedSavings).toBe(3);
    });
  });

  describe("computeCompactedIndexMapping", () => {
    it("computes correct mapping", () => {
      const { terrainData } = createTestData();

      const mapping = computeCompactedIndexMapping(terrainData);

      // Old index 0 -> new index 0
      expect(mapping.get(0)).toBe(0);
      // Old index 2 -> new index 1
      expect(mapping.get(2)).toBe(1);
      // Old index 5 -> new index 2
      expect(mapping.get(5)).toBe(2);
      // Unused indices should not be in mapping
      expect(mapping.has(1)).toBe(false);
      expect(mapping.has(3)).toBe(false);
      expect(mapping.has(4)).toBe(false);
    });
  });

  describe("compactTileIndices", () => {
    it("removes unused tiles", () => {
      const { terrainData } = createTestData();

      let result: TileOptimizationResult | undefined = undefined;
      const optimized = produce(terrainData, (draft) => {
        result = compactTileIndices(draft);
      });

      expect(result).toBeDefined();
      if (result) {
        const res = result as TileOptimizationResult;
        expect(res.success).toBe(true);
        expect(res.removedCount).toBe(3);
      }

      // Should have only 3 tiles now
      expect(optimized.Atrb[1000].obj).toHaveLength(3);
    });

    it("remaps layer indices", () => {
      const { terrainData } = createTestData();

      const optimized = produce(terrainData, (draft) => {
        compactTileIndices(draft);
      });

      const layr = optimized.Layr?.[1000]?.obj;
      expect(layr).toBeDefined();
      
      if (layr) {
        // Old index 0 -> 0, old index 2 -> 1, old index 5 -> 2
        // All 0s should still be 0
        expect(layr[0]).toBe(0);
        // Old 2s should be 1
        expect(layr[5]).toBe(1);
        // Old 5s should be 2
        expect(layr[10]).toBe(2);
      }
    });

    it("preserves tile attributes", () => {
      const { terrainData } = createTestData();

      const optimized = produce(terrainData, (draft) => {
        compactTileIndices(draft);
      });

      const atrb = optimized.Atrb[1000].obj;
      
      // First tile (old 0) should have flags 0
      expect(atrb[0]?.flags).toBe(0);
      // Second tile (old 2) should have flags 2
      expect(atrb[1]?.flags).toBe(2);
      // Third tile (old 5) should have flags 5
      expect(atrb[2]?.flags).toBe(5);
    });

    it("reports no changes when no unused tiles", () => {
      const { terrainData } = createTestData();
      
      // Use all tiles
      const allUsedData = produce(terrainData, (draft) => {
        const layr = draft.Layr?.[1000]?.obj;
        if (layr) {
          for (let i = 0; i < layr.length; i++) {
            layr[i] = i % 6; // Use all 6 tiles
          }
        }
      });

      let result: TileOptimizationResult | undefined = undefined;
      produce(allUsedData, (draft) => {
        result = compactTileIndices(draft);
      });

      expect(result).toBeDefined();
      if (result) {
        const res = result as TileOptimizationResult;
        expect(res.success).toBe(true);
        expect(res.removedCount).toBe(0);
        expect(res.message).toContain("No unused tiles");
      }
    });
  });

  describe("validateOptimization", () => {
    it("returns empty array for valid data", () => {
      const { terrainData } = createTestData();

      const warnings = validateOptimization(terrainData);

      expect(warnings).toHaveLength(0);
    });
  });

  describe("getOptimizationStats", () => {
    it("returns correct statistics", () => {
      const { terrainData } = createTestData();

      const stats = getOptimizationStats(terrainData);

      expect(stats.totalTiles).toBe(6);
      expect(stats.usedTiles).toBe(3);
      expect(stats.unusedTiles).toBe(3);
      expect(stats.percentageUnused).toBe(50);
    });
  });
});
