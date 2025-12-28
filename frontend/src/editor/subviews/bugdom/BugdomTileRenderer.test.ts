/**
 * Tests for BugdomTileRenderer
 *
 * Tests the Bugdom 1 tile rendering system which builds supertiles from individual tiles.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TILENUM_MASK,
  TILE_FLIPX_MASK,
  TILE_FLIPY_MASK,
  TILE_FLIPXY_MASK,
  TILE_ROTATE_MASK,
  TILE_ROT1,
  TILE_ROT2,
  TILE_ROT3,
  translateTileIndex,
  buildSupertileFromTiles,
  buildAllBugdomSupertiles,
  isBugdomGame,
  usesIndividualTiles,
} from "./BugdomTileRenderer.utils";
import { DataType } from "@/data/globals/globals";
import { HeaderData } from "@/python/structSpecs/LevelTypes";

describe("Bugdom Tile Constants", () => {
  it("TILENUM_MASK should extract lower 12 bits", () => {
    expect(TILENUM_MASK).toBe(0x0fff);
    expect(0xffff & TILENUM_MASK).toBe(0x0fff);
    expect(0x1234 & TILENUM_MASK).toBe(0x0234);
  });

  it("TILE_FLIPX_MASK should be bit 15", () => {
    expect(TILE_FLIPX_MASK).toBe(0x8000);
    expect((1 << 15) & TILE_FLIPX_MASK).toBe(TILE_FLIPX_MASK);
  });

  it("TILE_FLIPY_MASK should be bit 14", () => {
    expect(TILE_FLIPY_MASK).toBe(0x4000);
    expect((1 << 14) & TILE_FLIPY_MASK).toBe(TILE_FLIPY_MASK);
  });

  it("TILE_FLIPXY_MASK should combine X and Y flip masks", () => {
    expect(TILE_FLIPXY_MASK).toBe(TILE_FLIPX_MASK | TILE_FLIPY_MASK);
    expect(TILE_FLIPXY_MASK).toBe(0xc000);
  });

  it("TILE_ROTATE_MASK should cover bits 12-13", () => {
    expect(TILE_ROTATE_MASK).toBe(0x3000);
  });

  it("Rotation values should be correct", () => {
    expect(TILE_ROT1).toBe(1 << 12); // 90 degrees
    expect(TILE_ROT2).toBe(2 << 12); // 180 degrees
    expect(TILE_ROT3).toBe(3 << 12); // 270 degrees
  });
});

describe("translateTileIndex", () => {
  it("should return original value when xlatTable is undefined", () => {
    const tileValue = 0x1234;
    const result = translateTileIndex(tileValue, undefined, 100);
    expect(result).toBe(tileValue);
  });

  it("should return with image 0 when tileIndex exceeds table length", () => {
    const xlatTable = [{ idx: 5 }, { idx: 10 }];
    const tileValue = 100; // Index 100, table only has 2 entries
    const result = translateTileIndex(tileValue, xlatTable, 100);
    // Should return with just the flip/rotate bits (image index 0)
    expect(result & TILENUM_MASK).toBe(0);
  });

  it("should translate tile index using xlat table", () => {
    const xlatTable = [
      { idx: 10 }, // Tile 0 maps to image 10
      { idx: 20 }, // Tile 1 maps to image 20
      { idx: 30 }, // Tile 2 maps to image 30
    ];

    // Tile index 0 should become image 10
    expect(translateTileIndex(0, xlatTable, 100)).toBe(10);

    // Tile index 1 should become image 20
    expect(translateTileIndex(1, xlatTable, 100)).toBe(20);

    // Tile index 2 should become image 30
    expect(translateTileIndex(2, xlatTable, 100)).toBe(30);
  });

  it("should preserve flip/rotate bits when translating", () => {
    const xlatTable = [
      { idx: 5 }, // Tile 0 maps to image 5
      { idx: 15 }, // Tile 1 maps to image 15
    ];

    // Tile 1 with flip X (bit 15 set)
    const tileWithFlipX = 1 | TILE_FLIPX_MASK;
    const result = translateTileIndex(tileWithFlipX, xlatTable, 100);

    // Should have image 15 with flip X preserved
    expect(result & TILENUM_MASK).toBe(15);
    expect(result & TILE_FLIPX_MASK).toBe(TILE_FLIPX_MASK);
  });

  it("should preserve rotation bits when translating", () => {
    const xlatTable = [{ idx: 7 }];

    // Tile 0 with 90 degree rotation
    const tileWithRot1 = 0 | TILE_ROT1;
    const result = translateTileIndex(tileWithRot1, xlatTable, 100);

    // Should have image 7 with rotation preserved
    expect(result & TILENUM_MASK).toBe(7);
    expect(result & TILE_ROTATE_MASK).toBe(TILE_ROT1);
  });

  it("should preserve all transform bits when translating", () => {
    const xlatTable = [{ idx: 42 }];

    // Tile 0 with flip XY and 180 degree rotation
    const tileWithAllTransforms = 0 | TILE_FLIPXY_MASK | TILE_ROT2;
    const result = translateTileIndex(tileWithAllTransforms, xlatTable, 100);

    // Should have image 42 with all transforms preserved
    expect(result & TILENUM_MASK).toBe(42);
    expect(result & TILE_FLIPXY_MASK).toBe(TILE_FLIPXY_MASK);
    expect(result & TILE_ROTATE_MASK).toBe(TILE_ROT2);
  });

  it("should return image 0 when xlat value exceeds numTileImages", () => {
    const xlatTable = [{ idx: 50 }]; // Maps to image 50
    const numTileImages = 40; // But we only have 40 images

    const result = translateTileIndex(0, xlatTable, numTileImages);

    // Should return with image index 0 since 50 >= 40
    expect(result & TILENUM_MASK).toBe(0);
  });
});

describe("isBugdomGame", () => {
  it("should return true for Bugdom game type (RSRC_FORK)", () => {
    expect(isBugdomGame({ DATA_TYPE: DataType.RSRC_FORK })).toBe(true);
  });

  it("should return false for standard data type", () => {
    expect(isBugdomGame({ DATA_TYPE: DataType.STANDARD })).toBe(false);
  });

  it("should return false for TRT file data type", () => {
    expect(isBugdomGame({ DATA_TYPE: DataType.TRT_FILE })).toBe(false);
  });

  it("should return false for Mighty Mike data type", () => {
    expect(isBugdomGame({ DATA_TYPE: DataType.MIGHTY_MIKE })).toBe(false);
  });
});

describe("usesIndividualTiles", () => {
  it("should return true for Bugdom game type (RSRC_FORK)", () => {
    expect(usesIndividualTiles({ DATA_TYPE: DataType.RSRC_FORK })).toBe(true);
  });

  it("should return true for Nanosaur game type (TRT_FILE)", () => {
    expect(usesIndividualTiles({ DATA_TYPE: DataType.TRT_FILE })).toBe(true);
  });

  it("should return false for standard data type", () => {
    expect(usesIndividualTiles({ DATA_TYPE: DataType.STANDARD })).toBe(false);
  });

  it("should return false for Mighty Mike data type", () => {
    expect(usesIndividualTiles({ DATA_TYPE: DataType.MIGHTY_MIKE })).toBe(false);
  });
});

// Mock canvas for testing in Node environment
function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  // This is a simplified mock for testing
  // In browser environment, this would be a real canvas
  const canvas = {
    width,
    height,
    getContext: () => ({
      fillStyle: "",
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      drawImage: () => {},
      createImageData: (w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      }),
      putImageData: () => {},
    }),
    toDataURL: () => "data:image/png;base64,mock",
  } as unknown as HTMLCanvasElement;
  return canvas;
}

describe("buildAllBugdomSupertiles", () => {
  let mockHeaderData: HeaderData;
  let mockTileImages: HTMLCanvasElement[];

  beforeEach(() => {
    mockHeaderData = {
      Hedr: {
        1000: {
          name: "Header",
          obj: {
            version: 1,
            numItems: 0,
            mapWidth: 10, // 10 tiles wide = 2 supertiles (5 tiles per supertile)
            mapHeight: 10, // 10 tiles deep = 2 supertiles
            numTilePages: 1,
            numTiles: 100,
            tileSize: 32,
            minY: 0,
            maxY: 1000,
            numSplines: 0,
            numFences: 0,
            numUniqueSupertiles: 4,
            numWaterPatches: 0,
            numCheckpoints: 0,
          },
          order: 0,
        },
      },
    };

    // Create mock tile images
    mockTileImages = [];
    for (let i = 0; i < 50; i++) {
      mockTileImages.push(createMockCanvas(32, 32));
    }
  });

  it("should calculate correct number of supertiles", () => {
    // 10x10 map with 5 tiles per supertile = 2x2 = 4 supertiles
    const layerData = new Array(100).fill(0); // 10x10 = 100 tiles

    const supertiles = buildAllBugdomSupertiles(
      mockHeaderData,
      layerData,
      undefined,
      mockTileImages,
      5,
      32,
    );

    expect(supertiles.length).toBe(4); // 2x2 supertiles
  });

  it("should create correct size supertile images", () => {
    const layerData = new Array(100).fill(0);

    const supertiles = buildAllBugdomSupertiles(
      mockHeaderData,
      layerData,
      undefined,
      mockTileImages,
      5,
      32,
    );

    // Each supertile should be 5*32 = 160 pixels
    supertiles.forEach((st) => {
      expect(st.width).toBe(160);
      expect(st.height).toBe(160);
    });
  });

  it("should handle non-divisible map dimensions", () => {
    // Map that doesn't divide evenly into supertiles
    mockHeaderData.Hedr[1000].obj.mapWidth = 12;
    mockHeaderData.Hedr[1000].obj.mapHeight = 8;

    const layerData = new Array(12 * 8).fill(0); // 12x8 = 96 tiles

    const supertiles = buildAllBugdomSupertiles(
      mockHeaderData,
      layerData,
      undefined,
      mockTileImages,
      5,
      32,
    );

    // 12/5 = 3 (ceil), 8/5 = 2 (ceil) = 6 supertiles
    expect(supertiles.length).toBe(6);
  });

  it("should apply Xlat translation when provided", () => {
    const xlatTable = [{ idx: 10 }, { idx: 20 }, { idx: 30 }];

    // Layer with tiles 0, 1, 2 that should be translated
    const layerData = [0, 1, 2, 0, 1, ...new Array(95).fill(0)];

    // This test verifies the function runs without error with translation
    const supertiles = buildAllBugdomSupertiles(
      mockHeaderData,
      layerData,
      xlatTable,
      mockTileImages,
      5,
      32,
    );

    expect(supertiles.length).toBe(4);
  });
});

describe("buildSupertileFromTiles", () => {
  let mockTileImages: HTMLCanvasElement[];

  beforeEach(() => {
    mockTileImages = [];
    for (let i = 0; i < 50; i++) {
      mockTileImages.push(createMockCanvas(32, 32));
    }
  });

  it("should create canvas with correct dimensions", () => {
    const layerData = new Array(25).fill(0); // 5x5 map

    const supertile = buildSupertileFromTiles(
      0, // startRow
      0, // startCol
      5, // mapWidth
      5, // mapHeight
      layerData,
      undefined,
      mockTileImages,
      5, // tilesPerSupertile
      32, // tileSize
    );

    expect(supertile.width).toBe(160); // 5 * 32
    expect(supertile.height).toBe(160);
  });

  it("should handle boundary tiles correctly", () => {
    // Test with a supertile at the edge where some tiles are out of bounds
    const layerData = new Array(16).fill(0); // 4x4 map

    const supertile = buildSupertileFromTiles(
      0,
      0,
      4, // Only 4 tiles wide
      4, // Only 4 tiles deep
      layerData,
      undefined,
      mockTileImages,
      5, // Want 5x5 supertile
      32,
    );

    // Should still create the canvas, just with some tiles missing
    expect(supertile.width).toBe(160);
    expect(supertile.height).toBe(160);
  });
});

describe("Tile Bit Manipulation", () => {
  it("should correctly extract tile number from value with transforms", () => {
    const tileNum = 123;
    const withFlipX = tileNum | TILE_FLIPX_MASK;
    const withFlipY = tileNum | TILE_FLIPY_MASK;
    const withRot = tileNum | TILE_ROT2;
    const withAll = tileNum | TILE_FLIPXY_MASK | TILE_ROT3;

    expect(withFlipX & TILENUM_MASK).toBe(tileNum);
    expect(withFlipY & TILENUM_MASK).toBe(tileNum);
    expect(withRot & TILENUM_MASK).toBe(tileNum);
    expect(withAll & TILENUM_MASK).toBe(tileNum);
  });

  it("should correctly extract transform bits", () => {
    const tileValue = 123 | TILE_FLIPX_MASK | TILE_ROT1;

    const flipRotBits = tileValue & (TILE_FLIPXY_MASK | TILE_ROTATE_MASK);

    expect(flipRotBits & TILE_FLIPX_MASK).toBe(TILE_FLIPX_MASK);
    expect(flipRotBits & TILE_FLIPY_MASK).toBe(0);
    expect(flipRotBits & TILE_ROTATE_MASK).toBe(TILE_ROT1);
  });

  it("should handle maximum tile number", () => {
    const maxTileNum = TILENUM_MASK; // 4095
    const withTransforms = maxTileNum | TILE_FLIPXY_MASK | TILE_ROT3;

    expect(withTransforms & TILENUM_MASK).toBe(maxTileNum);
  });
});
