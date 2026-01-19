/**
 * Tests for blank level creation
 */

import { describe, it, expect } from "vitest";
import {
  createBlankLevel,
  createDefaultBlankLevel,
  isBlankLevelSupported,
  getBlankLevelConfig,
} from "@/data/blankLevel/registry";
import {
  createHeightArray,
  createAttributeArray,
  createSupertileGrid,
  createLayerArray,
  validateBlankLevelOptions,
} from "@/data/blankLevel/levelFactoryUtils";
import { Game } from "@/data/globals/globals";

describe("levelFactoryUtils", () => {
  describe("createHeightArray", () => {
    it("should create correct size array for vertex heights", () => {
      // Note: YCrd is (mapWidth + 1) × (mapHeight + 1) for vertices
      const heights = createHeightArray(4, 4, 0);

      expect(heights.length).toBe(25); // (4+1) × (4+1)
    });

    it("should fill with default height", () => {
      const heights = createHeightArray(2, 2, 100);

      expect(heights.every((h) => h === 100)).toBe(true);
    });
  });

  describe("createAttributeArray", () => {
    it("should create correct size array for tile attributes", () => {
      // Note: Atrb is mapWidth × mapHeight for tiles
      const attrs = createAttributeArray(4, 4);

      expect(attrs.length).toBe(16);
    });

    it("should create objects with correct structure", () => {
      const attrs = createAttributeArray(2, 2, 5, 10, 15);

      expect(attrs[0]).toEqual({ flags: 5, p0: 10, p1: 15 });
    });
  });

  describe("createSupertileGrid", () => {
    it("should create correct size grid", () => {
      // 16×16 tiles with 8 tiles per supertile = 2×2 supertiles
      const grid = createSupertileGrid(16, 16, 8);

      expect(grid.length).toBe(4);
    });

    it("should use empty value", () => {
      const grid = createSupertileGrid(8, 8, 8, -1);

      expect(grid[0]).toEqual({ superTileId: -1 });
    });
  });

  describe("createLayerArray", () => {
    it("should create correct size array", () => {
      const layer = createLayerArray(10, 10);

      expect(layer.length).toBe(100);
    });

    it("should fill with default tile", () => {
      const layer = createLayerArray(2, 2, 42);

      expect(layer.every((t) => t === 42)).toBe(true);
    });
  });

  describe("validateBlankLevelOptions", () => {
    it("should pass for valid options", () => {
      const result = validateBlankLevelOptions(
        { mapWidth: 64, mapHeight: 64 },
        8, // tilesPerSupertile
        16, // minWidth
        512, // maxWidth
        16, // minHeight
        512, // maxHeight
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail for width below minimum", () => {
      const result = validateBlankLevelOptions(
        { mapWidth: 8, mapHeight: 64 },
        8,
        16,
        512,
        16,
        512,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Width") && e.includes("least"))).toBe(true);
    });

    it("should fail for width above maximum", () => {
      const result = validateBlankLevelOptions(
        { mapWidth: 1024, mapHeight: 64 },
        8,
        16,
        512,
        16,
        512,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Width") && e.includes("exceed"))).toBe(true);
    });

    it("should fail for non-divisible width", () => {
      const result = validateBlankLevelOptions(
        { mapWidth: 65, mapHeight: 64 },
        8, // Must be divisible by 8
        16,
        512,
        16,
        512,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("divisible"))).toBe(true);
    });

    it("should pass when tilesPerSupertile is 1", () => {
      // For 2D games without supertiles
      const result = validateBlankLevelOptions(
        { mapWidth: 33, mapHeight: 33 },
        1,
        10,
        512,
        10,
        512,
      );

      expect(result.valid).toBe(true);
    });
  });
});

describe("registry", () => {
  describe("isBlankLevelSupported", () => {
    it("should return true for Otto Matic", () => {
      expect(isBlankLevelSupported(Game.OTTO_MATIC)).toBe(true);
    });

    it("should return true for Bugdom", () => {
      expect(isBlankLevelSupported(Game.BUGDOM)).toBe(true);
    });

    it("should return true for Billy Frontier", () => {
      expect(isBlankLevelSupported(Game.BILLY_FRONTIER)).toBe(true);
    });
  });

  describe("getBlankLevelConfig", () => {
    it("should return config for supported games", () => {
      const config = getBlankLevelConfig(Game.OTTO_MATIC);

      expect(config).toBeDefined();
      expect(config?.game).toBe(Game.OTTO_MATIC);
      expect(config?.tilesPerSupertile).toBe(8);
    });
  });

  describe("createDefaultBlankLevel", () => {
    it("should create Otto Matic level with defaults", () => {
      const result = createDefaultBlankLevel(Game.OTTO_MATIC);

      expect(result.success).toBe(true);
      expect(result.levelData).toBeDefined();
      expect(result.levelData?.Hedr?.[1000]?.obj?.mapWidth).toBe(64);
      expect(result.levelData?.Hedr?.[1000]?.obj?.mapHeight).toBe(64);
    });

    it("should create level with one start item", () => {
      const result = createDefaultBlankLevel(Game.OTTO_MATIC);

      expect(result.levelData?.Itms?.[1000]?.obj).toHaveLength(1);
      expect(result.levelData?.Itms?.[1000]?.obj?.[0]?.type).toBe(0); // StartCoords
    });
  });

  describe("createBlankLevel", () => {
    it("should create Otto Matic level with custom dimensions", () => {
      const result = createBlankLevel(Game.OTTO_MATIC, {
        mapWidth: 128,
        mapHeight: 96,
      });

      expect(result.success).toBe(true);
      expect(result.levelData?.Hedr?.[1000]?.obj?.mapWidth).toBe(128);
      expect(result.levelData?.Hedr?.[1000]?.obj?.mapHeight).toBe(96);
    });

    it("should create correct terrain data arrays", () => {
      const result = createBlankLevel(Game.OTTO_MATIC, {
        mapWidth: 16,
        mapHeight: 16,
      });

      expect(result.success).toBe(true);

      // YCrd: (16+1) × (16+1) = 289 vertices
      expect(result.levelData?.YCrd?.[1000]?.obj).toHaveLength(289);

      // Atrb: 16 × 16 = 256 tiles
      expect(result.levelData?.Atrb?.[1000]?.obj).toHaveLength(256);

      // STgd: 16/8 × 16/8 = 4 supertiles
      expect(result.levelData?.STgd?.[1000]?.obj).toHaveLength(4);
    });

    it("should fail for invalid dimensions", () => {
      const result = createBlankLevel(Game.OTTO_MATIC, {
        mapWidth: 5, // Too small and not divisible by 8
        mapHeight: 64,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should create Bugdom level with layer data", () => {
      const result = createBlankLevel(Game.BUGDOM, {
        mapWidth: 50,
        mapHeight: 50,
      });

      expect(result.success).toBe(true);
      expect(result.levelData?.Layr?.[1000]?.obj).toHaveLength(2500);
    });

    it("should create Billy Frontier level with layer data", () => {
      const result = createBlankLevel(Game.BILLY_FRONTIER, {
        mapWidth: 64,
        mapHeight: 64,
      });

      expect(result.success).toBe(true);
      expect(result.levelData?.Layr?.[1000]?.obj).toHaveLength(4096);
    });

    it("should set default height when specified", () => {
      const result = createBlankLevel(Game.OTTO_MATIC, {
        mapWidth: 16,
        mapHeight: 16,
        defaultHeight: 100,
      });

      expect(result.success).toBe(true);
      const heights = result.levelData?.YCrd?.[1000]?.obj;
      if (!Array.isArray(heights)) throw new Error("Expected array");
      expect(heights.every((h) => h === 100)).toBe(true);
    });
  });
});
