/**
 * Tests for tile operations
 */

import { describe, it, expect } from "vitest";
import {
  setTile,
  getTile,
  swapTiles,
  fillTileArea,
  countTileUsage,
  encodeTileValue,
  decodeTileValue,
} from "@/data/tiles/tileOps";
import type { LevelData } from "@/python/structSpecs/LevelTypes";

// Helper to get number from layer or throw
function getLayerNumber(layer: unknown[] | undefined, idx: number): number {
  if (!layer) throw new Error("Layer undefined");
  const val = layer[idx];
  if (typeof val !== "number") throw new Error("Expected number in layer");
  return val;
}

// Helper to create minimal level data with layer
function createTestLevelData(
  mapWidth: number,
  mapHeight: number,
  tiles?: number[],
): LevelData {
  const layerSize = mapWidth * mapHeight;
  const layerData = tiles ?? new Array<number>(layerSize).fill(0);
  
  return {
    Hedr: {
      1000: {
        obj: {
          mapWidth,
          mapHeight,
        },
      },
    },
    Layr: {
      1000: {
        obj: layerData,
      },
    },
  };
}

describe("encodeTileValue / decodeTileValue", () => {
  it("should encode and decode basic tile ID", () => {
    const encoded = encodeTileValue(42, false, false, 0);
    const decoded = decodeTileValue(encoded);

    expect(decoded.tileId).toBe(42);
    expect(decoded.flipH).toBe(false);
    expect(decoded.flipV).toBe(false);
    expect(decoded.rotation).toBe(0);
  });

  it("should encode and decode with horizontal flip", () => {
    const encoded = encodeTileValue(10, true, false, 0);
    const decoded = decodeTileValue(encoded);

    expect(decoded.tileId).toBe(10);
    expect(decoded.flipH).toBe(true);
    expect(decoded.flipV).toBe(false);
  });

  it("should encode and decode with vertical flip", () => {
    const encoded = encodeTileValue(10, false, true, 0);
    const decoded = decodeTileValue(encoded);

    expect(decoded.tileId).toBe(10);
    expect(decoded.flipH).toBe(false);
    expect(decoded.flipV).toBe(true);
  });

  it("should encode and decode with rotation 90", () => {
    const encoded = encodeTileValue(5, false, false, 90);
    const decoded = decodeTileValue(encoded);

    expect(decoded.tileId).toBe(5);
    expect(decoded.rotation).toBe(90);
  });

  it("should encode and decode with rotation 180", () => {
    const encoded = encodeTileValue(5, false, false, 180);
    const decoded = decodeTileValue(encoded);

    expect(decoded.rotation).toBe(180);
  });

  it("should encode and decode with rotation 270", () => {
    const encoded = encodeTileValue(5, false, false, 270);
    const decoded = decodeTileValue(encoded);

    expect(decoded.rotation).toBe(270);
  });

  it("should encode and decode with all flags", () => {
    const encoded = encodeTileValue(100, true, true, 270);
    const decoded = decodeTileValue(encoded);

    expect(decoded.tileId).toBe(100);
    expect(decoded.flipH).toBe(true);
    expect(decoded.flipV).toBe(true);
    expect(decoded.rotation).toBe(270);
  });

  it("should handle max tile ID (12 bits)", () => {
    const maxId = 4095; // 0x0FFF
    const encoded = encodeTileValue(maxId, false, false, 0);
    const decoded = decodeTileValue(encoded);

    expect(decoded.tileId).toBe(maxId);
  });
});

describe("setTile / getTile", () => {
  it("should set and get a tile", () => {
    const levelData = createTestLevelData(4, 4);

    const setResult = setTile(levelData, 4, 2, 2, 15);
    expect(setResult.success).toBe(true);
    if (!setResult.value) throw new Error("Expected value");

    const getResult = getTile(setResult.value.levelData, 4, 2, 2);
    expect(getResult.success).toBe(true);
    expect(getResult.value?.tileId).toBe(15);
  });

  it("should set tile with transforms", () => {
    const levelData = createTestLevelData(4, 4);

    const setResult = setTile(levelData, 4, 1, 1, 20, true, true, 180);
    expect(setResult.success).toBe(true);
    if (!setResult.value) throw new Error("Expected value");

    const getResult = getTile(setResult.value.levelData, 4, 1, 1);
    expect(getResult.value?.tileId).toBe(20);
    expect(getResult.value?.flipH).toBe(true);
    expect(getResult.value?.flipV).toBe(true);
    expect(getResult.value?.rotation).toBe(180);
  });

  it("should fail for invalid coordinates", () => {
    const levelData = createTestLevelData(4, 4);

    const result = setTile(levelData, 4, 10, 10, 5);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid");
  });

  it("should not mutate original level data", () => {
    const levelData = createTestLevelData(4, 4);
    const originalLayer = levelData.Layr?.[1000]?.obj;

    setTile(levelData, 4, 0, 0, 99);

    expect(levelData.Layr?.[1000]?.obj).toBe(originalLayer);
    const obj = levelData.Layr?.[1000]?.obj;
    expect(Array.isArray(obj) && obj[0]).toBe(0);
  });
});

describe("swapTiles", () => {
  it("should swap all occurrences of one tile with another", () => {
    // Create level with mix of tiles: 0, 1, 0, 1
    const tiles = [0, 1, 0, 1];
    const levelData = createTestLevelData(2, 2, tiles);

    const result = swapTiles(levelData, 0, 5);

    expect(result.success).toBe(true);
    expect(result.value?.swapCount).toBe(2);

    const newLayer = result.value?.levelData.Layr?.[1000]?.obj;
    if (!Array.isArray(newLayer)) throw new Error("Expected array");
    const decoded0 = decodeTileValue(getLayerNumber(newLayer, 0));
    const decoded1 = decodeTileValue(getLayerNumber(newLayer, 1));
    const decoded2 = decodeTileValue(getLayerNumber(newLayer, 2));
    const decoded3 = decodeTileValue(getLayerNumber(newLayer, 3));

    expect(decoded0.tileId).toBe(5); // Was 0
    expect(decoded1.tileId).toBe(1); // Unchanged
    expect(decoded2.tileId).toBe(5); // Was 0
    expect(decoded3.tileId).toBe(1); // Unchanged
  });

  it("should preserve flip/rotation when swapping", () => {
    // Create tile 0 with flipH
    const encodedTile = encodeTileValue(0, true, false, 90);
    const tiles = [encodedTile, 1, 2];
    const levelData = createTestLevelData(3, 1, tiles);

    const result = swapTiles(levelData, 0, 10);

    const newLayer = result.value?.levelData.Layr?.[1000]?.obj;
    if (!Array.isArray(newLayer)) throw new Error("Expected array");
    const decoded = decodeTileValue(getLayerNumber(newLayer, 0));

    expect(decoded.tileId).toBe(10); // Changed from 0
    expect(decoded.flipH).toBe(true); // Preserved
    expect(decoded.rotation).toBe(90); // Preserved
  });
});

describe("fillTileArea", () => {
  it("should fill a rectangular area", () => {
    const levelData = createTestLevelData(4, 4);

    const result = fillTileArea(levelData, 4, 1, 1, 2, 2, 7);

    expect(result.success).toBe(true);
    expect(result.value?.fillCount).toBe(4);

    // Check filled area
    const layer = result.value?.levelData.Layr?.[1000]?.obj;
    if (!Array.isArray(layer)) throw new Error("Expected array");
    expect(decodeTileValue(getLayerNumber(layer, 5)).tileId).toBe(7); // (1,1)
    expect(decodeTileValue(getLayerNumber(layer, 6)).tileId).toBe(7); // (2,1)
    expect(decodeTileValue(getLayerNumber(layer, 9)).tileId).toBe(7); // (1,2)
    expect(decodeTileValue(getLayerNumber(layer, 10)).tileId).toBe(7); // (2,2)

    // Check unfilled area
    expect(decodeTileValue(getLayerNumber(layer, 0)).tileId).toBe(0); // (0,0) not filled
  });

  it("should fill with transforms", () => {
    const levelData = createTestLevelData(2, 2);

    const result = fillTileArea(levelData, 2, 0, 0, 1, 1, 3, true, false, 90);

    expect(result.value?.fillCount).toBe(4);

    const layer = result.value?.levelData.Layr?.[1000]?.obj;
    if (!Array.isArray(layer)) throw new Error("Expected array");
    const decoded = decodeTileValue(getLayerNumber(layer, 0));
    expect(decoded.tileId).toBe(3);
    expect(decoded.flipH).toBe(true);
    expect(decoded.rotation).toBe(90);
  });

  it("should handle reversed coordinates", () => {
    const levelData = createTestLevelData(4, 4);

    // Start at (3,3), end at (2,2) - reversed
    const result = fillTileArea(levelData, 4, 3, 3, 2, 2, 5);

    expect(result.success).toBe(true);
    expect(result.value?.fillCount).toBe(4);
  });
});

describe("countTileUsage", () => {
  it("should count tile occurrences", () => {
    // Tiles: 0, 0, 1, 2, 2, 2
    const tiles = [
      encodeTileValue(0, false, false, 0),
      encodeTileValue(0, false, false, 0),
      encodeTileValue(1, false, false, 0),
      encodeTileValue(2, false, false, 0),
      encodeTileValue(2, true, false, 0), // With flip
      encodeTileValue(2, false, false, 90), // With rotation
    ];
    const levelData = createTestLevelData(6, 1, tiles);

    const counts = countTileUsage(levelData);

    expect(counts.get(0)).toBe(2);
    expect(counts.get(1)).toBe(1);
    expect(counts.get(2)).toBe(3); // Counts regardless of transforms
  });

  it("should return empty map for missing layer data", () => {
    const levelData: LevelData = {};

    const counts = countTileUsage(levelData);

    expect(counts.size).toBe(0);
  });
});
