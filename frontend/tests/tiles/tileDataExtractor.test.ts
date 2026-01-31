/**
 * Tests for Tile Data Extractor
 * 
 * Tests the tile extraction and analysis functions.
 */

import { describe, it, expect } from "vitest";
import type { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import {
  extractTileInfo,
  getTileUsageStats,
  getTileAtPosition,
  findTilePositions,
  getUnusedTileIndices,
} from "@/data/tiles/tileDataExtractor";

/**
 * Create minimal test data
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
          numTiles: 4,
          numUniqueSupertiles: 1,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
  };

  // Create 4 tile attributes
  // Tile 0: used 10 times
  // Tile 1: used 4 times
  // Tile 2: used 2 times
  // Tile 3: not used
  const terrainData: TerrainData = {
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: [
          { flags: 0, p0: 10, p1: 20 },
          { flags: 1, p0: 11, p1: 21 },
          { flags: 2, p0: 12, p1: 22 },
          { flags: 3, p0: 13, p1: 23 },
        ],
        order: 1,
      },
    },
    Layr: {
      1000: {
        name: "Terrain Layer Matrix",
        obj: [
          0, 0, 0, 0,  // Row 0: all tile 0
          0, 1, 1, 0,  // Row 1: 0, 1, 1, 0
          0, 1, 2, 0,  // Row 2: 0, 1, 2, 0
          0, 1, 2, 0,  // Row 3: 0, 1, 2, 0
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

describe("Tile Data Extractor", () => {
  describe("extractTileInfo", () => {
    it("extracts all tiles from terrain data", () => {
      const { terrainData, headerData } = createTestData();

      const tiles = extractTileInfo(terrainData, headerData);

      expect(tiles).toHaveLength(4);
    });

    it("calculates usage counts correctly", () => {
      const { terrainData, headerData } = createTestData();

      const tiles = extractTileInfo(terrainData, headerData);

      // Tile 0: used 10 times (4+2+2+2)
      const tile0 = tiles.find(t => t.attributeIndex === 0);
      expect(tile0?.usageCount).toBe(10);

      // Tile 1: used 4 times
      const tile1 = tiles.find(t => t.attributeIndex === 1);
      expect(tile1?.usageCount).toBe(4);

      // Tile 2: used 2 times
      const tile2 = tiles.find(t => t.attributeIndex === 2);
      expect(tile2?.usageCount).toBe(2);

      // Tile 3: not used
      const tile3 = tiles.find(t => t.attributeIndex === 3);
      expect(tile3?.usageCount).toBe(0);
    });

    it("extracts flags and parameters", () => {
      const { terrainData, headerData } = createTestData();

      const tiles = extractTileInfo(terrainData, headerData);
      const tile1 = tiles.find(t => t.attributeIndex === 1);

      expect(tile1?.flags).toBe(1);
      expect(tile1?.p0).toBe(11);
      expect(tile1?.p1).toBe(21);
    });

    it("uses translation table for tile index", () => {
      const { terrainData, headerData } = createTestData();

      const tiles = extractTileInfo(terrainData, headerData);
      const tile0 = tiles.find(t => t.attributeIndex === 0);

      // Should use xlat value
      expect(tile0?.index).toBe(100);
    });
  });

  describe("getTileUsageStats", () => {
    it("returns correct statistics", () => {
      const { terrainData, headerData } = createTestData();

      const stats = getTileUsageStats(terrainData, headerData);

      expect(stats.totalTiles).toBe(4);
      expect(stats.usedTiles).toBe(3);
      expect(stats.unusedTiles).toBe(1);
      expect(stats.totalCells).toBe(16);
    });

    it("identifies most used tile", () => {
      const { terrainData, headerData } = createTestData();

      const stats = getTileUsageStats(terrainData, headerData);

      expect(stats.mostUsedTile).not.toBeNull();
      expect(stats.mostUsedTile?.attributeIndex).toBe(0);
      expect(stats.mostUsedTile?.usageCount).toBe(10);
    });

    it("identifies least used tile among used tiles", () => {
      const { terrainData, headerData } = createTestData();

      const stats = getTileUsageStats(terrainData, headerData);

      expect(stats.leastUsedTile).not.toBeNull();
      expect(stats.leastUsedTile?.attributeIndex).toBe(2);
      expect(stats.leastUsedTile?.usageCount).toBe(2);
    });
  });

  describe("getTileAtPosition", () => {
    it("returns tile info for valid position", () => {
      const { terrainData, headerData } = createTestData();

      // Position (1, 1) has tile attribute 1
      const tile = getTileAtPosition(1, 1, terrainData, headerData);

      expect(tile).not.toBeNull();
      expect(tile?.attributeIndex).toBe(1);
      expect(tile?.flags).toBe(1);
    });

    it("returns null for out of bounds position", () => {
      const { terrainData, headerData } = createTestData();

      const tile = getTileAtPosition(-1, 0, terrainData, headerData);
      expect(tile).toBeNull();
    });

    it("returns null for position beyond map", () => {
      const { terrainData, headerData } = createTestData();

      const tile = getTileAtPosition(10, 0, terrainData, headerData);
      expect(tile).toBeNull();
    });
  });

  describe("findTilePositions", () => {
    it("finds all positions for a tile", () => {
      const { terrainData, headerData } = createTestData();

      // Tile 2 is at positions (2,2) and (2,3)
      const positions = findTilePositions(2, terrainData, headerData);

      expect(positions).toHaveLength(2);
      expect(positions).toContainEqual({ x: 2, z: 2 });
      expect(positions).toContainEqual({ x: 2, z: 3 });
    });

    it("returns empty array for unused tile", () => {
      const { terrainData, headerData } = createTestData();

      const positions = findTilePositions(3, terrainData, headerData);

      expect(positions).toHaveLength(0);
    });

    it("finds correct number of positions for most used tile", () => {
      const { terrainData, headerData } = createTestData();

      const positions = findTilePositions(0, terrainData, headerData);

      expect(positions).toHaveLength(10);
    });
  });

  describe("getUnusedTileIndices", () => {
    it("returns unused tile indices", () => {
      const { terrainData, headerData } = createTestData();

      const unused = getUnusedTileIndices(terrainData, headerData);

      expect(unused).toHaveLength(1);
      expect(unused[0]).toBe(3);
    });
  });
});
