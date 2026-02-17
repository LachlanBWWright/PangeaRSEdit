/**
 * Tests for Tile Paint Handler
 * 
 * Tests the tile painting operations for tile-based games.
 */

import { describe, it, expect } from "vitest";
import { produce } from "immer";
import type { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import type { TileInfo } from "@/data/tiles/tileDataExtractor";
import {
  paintTileAtPosition,
  paintTileBrush,
  floodFillTile,
  getSelectedTileRegion,
} from "@/data/tiles/tilePaintHandler";

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
          mapWidth: 8,
          mapHeight: 8,
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

  // Create an 8x8 map with all tiles set to attribute 0
  const terrainData: TerrainData = {
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: [
          { flags: 0, p0: 0, p1: 0 },
          { flags: 1, p0: 1, p1: 1 },
          { flags: 2, p0: 2, p1: 2 },
          { flags: 3, p0: 3, p1: 3 },
        ],
        order: 1,
      },
    },
    Layr: {
      1000: {
        name: "Terrain Layer Matrix",
        obj: new Array(64).fill(0), // 8x8 = 64 cells, all using attribute 0
        order: 2,
      },
    },
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: "",
        order: 3,
      },
    },
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: new Array(64).fill(0),
        order: 4,
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

function createTestTile(attributeIndex: number): TileInfo {
  return {
    index: attributeIndex,
    attributeIndex,
    usageCount: 0,
    flags: 0,
    p0: 0,
    p1: 0,
  };
}

describe("Tile Paint Handler", () => {
  describe("paintTileAtPosition", () => {
    it("paints tile at valid position", () => {
      const { terrainData, headerData } = createTestData();
      const selectedTile = createTestTile(2);

      let paintResult: ReturnType<typeof paintTileAtPosition> = { success: false, modifiedCells: [] };
      
      produce(terrainData, (draft) => {
        paintResult = paintTileAtPosition(3, 4, selectedTile, draft, headerData);
      });

      expect(paintResult.success).toBe(true);
      expect(paintResult.modifiedCells).toHaveLength(1);
      // Cell index = z * width + x = 4 * 8 + 3 = 35
      expect(paintResult.modifiedCells[0]).toBe(35);
    });

    it("returns failure for out of bounds position", () => {
      const { terrainData, headerData } = createTestData();
      const selectedTile = createTestTile(2);

      let result: ReturnType<typeof paintTileAtPosition> = { success: false, modifiedCells: [] };
      
      produce(terrainData, (draft) => {
        result = paintTileAtPosition(-1, 4, selectedTile, draft, headerData);
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("out of bounds");
    });

    it("returns failure for position beyond map", () => {
      const { terrainData, headerData } = createTestData();
      const selectedTile = createTestTile(2);

      let result: ReturnType<typeof paintTileAtPosition> = { success: false, modifiedCells: [] };
      
      produce(terrainData, (draft) => {
        result = paintTileAtPosition(8, 0, selectedTile, draft, headerData);
      });

      expect(result.success).toBe(false);
    });
  });

  describe("paintTileBrush", () => {
    it("paints tiles in circular brush", () => {
      const { terrainData, headerData } = createTestData();
      const selectedTile = createTestTile(1);

      let result: ReturnType<typeof paintTileBrush> = { success: false, modifiedCells: [] };
      
      produce(terrainData, (draft) => {
        result = paintTileBrush(4, 4, 2, selectedTile, draft, headerData);
      });

      expect(result.success).toBe(true);
      // Brush radius 2 should paint a small area
      expect(result.modifiedCells.length).toBeGreaterThan(1);
    });

    it("respects map boundaries", () => {
      const { terrainData, headerData } = createTestData();
      const selectedTile = createTestTile(1);

      let result: ReturnType<typeof paintTileBrush> = { success: false, modifiedCells: [] };
      
      produce(terrainData, (draft) => {
        result = paintTileBrush(0, 0, 3, selectedTile, draft, headerData);
      });

      // Should not include negative positions
      expect(result.success).toBe(true);
      for (const cellIndex of result.modifiedCells) {
        expect(cellIndex).toBeGreaterThanOrEqual(0);
        expect(cellIndex).toBeLessThan(64);
      }
    });
  });

  describe("floodFillTile", () => {
    it("fills contiguous area", () => {
      const { terrainData, headerData } = createTestData();
      const selectedTile = createTestTile(3);

      let result: ReturnType<typeof floodFillTile> = { success: false, modifiedCells: [] };
      
      produce(terrainData, (draft) => {
        // All cells are 0, so flood fill from any point should fill all
        result = floodFillTile(0, 0, selectedTile, draft, headerData, 100);
      });

      expect(result.success).toBe(true);
      // Should fill all 64 cells
      expect(result.modifiedCells).toHaveLength(64);
    });

    it("respects maxFill limit", () => {
      const { terrainData, headerData } = createTestData();
      const selectedTile = createTestTile(3);

      let result: ReturnType<typeof floodFillTile> = { success: false, modifiedCells: [] };
      
      produce(terrainData, (draft) => {
        result = floodFillTile(0, 0, selectedTile, draft, headerData, 10);
      });

      expect(result.success).toBe(true);
      expect(result.modifiedCells).toHaveLength(10);
      expect(result.message).toContain("limited");
    });

    it("does not fill if same tile selected", () => {
      const { terrainData, headerData } = createTestData();
      const selectedTile = createTestTile(0); // Same as all existing tiles

      let result: ReturnType<typeof floodFillTile> = { success: false, modifiedCells: [] };
      
      produce(terrainData, (draft) => {
        result = floodFillTile(0, 0, selectedTile, draft, headerData);
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("same tile");
    });
  });

  describe("getSelectedTileRegion", () => {
    it("returns cell indices for rectangle", () => {
      const { terrainData, headerData } = createTestData();

      const cells = getSelectedTileRegion(1, 1, 3, 3, terrainData, headerData);

      // 3x3 region
      expect(cells).toHaveLength(9);
    });

    it("handles reversed coordinates", () => {
      const { terrainData, headerData } = createTestData();

      const cells1 = getSelectedTileRegion(1, 1, 3, 3, terrainData, headerData);
      const cells2 = getSelectedTileRegion(3, 3, 1, 1, terrainData, headerData);

      expect(cells1).toEqual(cells2);
    });

    it("clips to map boundaries", () => {
      const { terrainData, headerData } = createTestData();

      const cells = getSelectedTileRegion(-5, -5, 2, 2, terrainData, headerData);

      // Should only include cells from (0,0) to (2,2)
      expect(cells.length).toBeGreaterThan(0);
      for (const cellIndex of cells) {
        expect(cellIndex).toBeGreaterThanOrEqual(0);
        expect(cellIndex).toBeLessThan(64);
      }
    });
  });
});
