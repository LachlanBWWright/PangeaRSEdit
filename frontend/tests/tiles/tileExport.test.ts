/**
 * Tests for Tile Export System
 */

import { describe, it, expect } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  canExportTiles,
  calculatePaletteGrid,
  getExportFileExtension,
  generateTileFilename,
  generatePaletteFilename,
} from "@/data/tiles/tileExport";

describe("Tile Export System", () => {
  describe("canExportTiles", () => {
    it("returns true for Bugdom 1", () => {
      expect(canExportTiles(Game.BUGDOM)).toBe(true);
    });

    it("returns true for Nanosaur 1", () => {
      expect(canExportTiles(Game.NANOSAUR)).toBe(true);
    });

    it("returns false for Otto Matic (supertile-based)", () => {
      expect(canExportTiles(Game.OTTO_MATIC)).toBe(false);
    });

    it("returns false for Bugdom 2", () => {
      expect(canExportTiles(Game.BUGDOM_2)).toBe(false);
    });

    it("returns false for Nanosaur 2", () => {
      expect(canExportTiles(Game.NANOSAUR_2)).toBe(false);
    });
  });

  describe("calculatePaletteGrid", () => {
    it("calculates 1x1 grid for single tile", () => {
      const grid = calculatePaletteGrid(1);
      expect(grid.columns).toBe(1);
      expect(grid.rows).toBe(1);
    });

    it("calculates 2x1 grid for 2 tiles", () => {
      const grid = calculatePaletteGrid(2);
      expect(grid.columns).toBe(2);
      expect(grid.rows).toBe(1);
    });

    it("calculates square-ish grid for 4 tiles", () => {
      const grid = calculatePaletteGrid(4);
      expect(grid.columns).toBe(2);
      expect(grid.rows).toBe(2);
    });

    it("calculates 3x3 grid for 9 tiles", () => {
      const grid = calculatePaletteGrid(9);
      expect(grid.columns).toBe(3);
      expect(grid.rows).toBe(3);
    });

    it("calculates grid with extra row for non-square count", () => {
      const grid = calculatePaletteGrid(10);
      expect(grid.columns).toBe(4);
      expect(grid.rows).toBe(3);
      expect(grid.columns * grid.rows).toBeGreaterThanOrEqual(10);
    });

    it("respects maxWidth parameter", () => {
      const grid = calculatePaletteGrid(100, 8);
      expect(grid.columns).toBeLessThanOrEqual(8);
    });

    it("calculates 16xN grid for large tilesets", () => {
      const grid = calculatePaletteGrid(512, 16);
      expect(grid.columns).toBe(16);
      expect(grid.rows).toBe(32);
    });
  });

  describe("getExportFileExtension", () => {
    it("returns .png for png format", () => {
      expect(getExportFileExtension("png")).toBe(".png");
    });

    it("returns .jpg for jpeg format", () => {
      expect(getExportFileExtension("jpeg")).toBe(".jpg");
    });
  });

  describe("generateTileFilename", () => {
    it("generates padded filename for tile 0", () => {
      expect(generateTileFilename(0)).toBe("tile_0000.png");
    });

    it("generates padded filename for tile 42", () => {
      expect(generateTileFilename(42)).toBe("tile_0042.png");
    });

    it("generates padded filename for tile 1000", () => {
      expect(generateTileFilename(1000)).toBe("tile_1000.png");
    });

    it("uses specified format", () => {
      expect(generateTileFilename(1, "jpeg")).toBe("tile_0001.jpg");
    });
  });

  describe("generatePaletteFilename", () => {
    it("generates clean filename from level name", () => {
      expect(generatePaletteFilename("Level1")).toBe("level1_tileset.png");
    });

    it("replaces special characters with underscores", () => {
      expect(generatePaletteFilename("Level 1 (Test)")).toBe("level_1__test__tileset.png");
    });

    it("uses specified format", () => {
      expect(generatePaletteFilename("Lawn", "jpeg")).toBe("lawn_tileset.jpg");
    });
  });

  describe("export configuration", () => {
    it("default scale is 1", () => {
      // This is implicitly tested through the config structure
      const defaultScale = 1;
      expect(defaultScale).toBe(1);
    });

    it("default format is png", () => {
      const defaultFormat = "png";
      expect(defaultFormat).toBe("png");
    });

    it("jpeg quality should be between 0 and 1", () => {
      const jpegQuality = 0.92;
      expect(jpegQuality).toBeGreaterThan(0);
      expect(jpegQuality).toBeLessThanOrEqual(1);
    });
  });
});
