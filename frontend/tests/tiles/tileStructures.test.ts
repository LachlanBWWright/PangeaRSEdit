/**
 * Tests for Tile Structures
 * 
 * Tests the tile configuration and bit manipulation utilities.
 */

import { describe, it, expect } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  TILE_GAME_CONFIGS,
  TILENUM_MASK,
  TILE_FLIPX_MASK,
  isTileBasedGame,
  getTileGameConfig,
  extractTileNumber,
  isTileFlippedX,
  isTileFlippedY,
  isTileFlippedXY,
  isTileRotated,
  createTileBits,
} from "@/data/tiles/tileStructures";

describe("Tile Structures", () => {
  describe("TILE_GAME_CONFIGS", () => {
    it("Bugdom has tile configuration", () => {
      const config = TILE_GAME_CONFIGS[Game.BUGDOM];
      expect(config).not.toBeNull();
      expect(config?.tileSize).toBe(32);
      expect(config?.tilesPerSupertile).toBe(5);
    });

    it("Nanosaur has tile configuration", () => {
      const config = TILE_GAME_CONFIGS[Game.NANOSAUR];
      expect(config).not.toBeNull();
      expect(config?.tileSize).toBe(32);
      expect(config?.tilesPerSupertile).toBe(5);
    });

    it("Otto Matic has no tile configuration", () => {
      expect(TILE_GAME_CONFIGS[Game.OTTO_MATIC]).toBeNull();
    });

    it("Billy Frontier has no tile configuration", () => {
      expect(TILE_GAME_CONFIGS[Game.BILLY_FRONTIER]).toBeNull();
    });
  });

  describe("isTileBasedGame", () => {
    it("returns true for Bugdom", () => {
      expect(isTileBasedGame(Game.BUGDOM)).toBe(true);
    });

    it("returns true for Nanosaur", () => {
      expect(isTileBasedGame(Game.NANOSAUR)).toBe(true);
    });

    it("returns false for Otto Matic", () => {
      expect(isTileBasedGame(Game.OTTO_MATIC)).toBe(false);
    });

    it("returns false for Bugdom 2", () => {
      expect(isTileBasedGame(Game.BUGDOM_2)).toBe(false);
    });
  });

  describe("getTileGameConfig", () => {
    it("returns config for tile-based games", () => {
      const config = getTileGameConfig(Game.BUGDOM);
      expect(config).not.toBeNull();
      expect(config?.game).toBe(Game.BUGDOM);
    });

    it("returns null for non-tile games", () => {
      expect(getTileGameConfig(Game.NANOSAUR_2)).toBeNull();
    });
  });

  describe("extractTileNumber", () => {
    it("extracts tile number from bits", () => {
      const bits = 0b0000000000001010; // tile number 10
      expect(extractTileNumber(bits)).toBe(10);
    });

    it("ignores flip flags", () => {
      const bits = 0b1111000000001010; // tile 10 with all flags set
      expect(extractTileNumber(bits)).toBe(10);
    });

    it("handles maximum tile number", () => {
      const bits = TILENUM_MASK; // 0x0FFF = 4095
      expect(extractTileNumber(bits)).toBe(4095);
    });
  });

  describe("tile flip detection", () => {
    it("detects horizontal flip", () => {
      const bits = TILE_FLIPX_MASK;
      expect(isTileFlippedX(bits)).toBe(true);
      expect(isTileFlippedY(bits)).toBe(false);
    });

    it("detects vertical flip", () => {
      const bits = 0b0010000000000000;
      expect(isTileFlippedY(bits)).toBe(true);
      expect(isTileFlippedX(bits)).toBe(false);
    });

    it("detects diagonal flip", () => {
      const bits = 0b0100000000000000;
      expect(isTileFlippedXY(bits)).toBe(true);
    });

    it("detects rotation", () => {
      const bits = 0b1000000000000000;
      expect(isTileRotated(bits)).toBe(true);
    });

    it("detects combined flags", () => {
      const bits = 0b1111000000000000;
      expect(isTileFlippedX(bits)).toBe(true);
      expect(isTileFlippedY(bits)).toBe(true);
      expect(isTileFlippedXY(bits)).toBe(true);
      expect(isTileRotated(bits)).toBe(true);
    });
  });

  describe("createTileBits", () => {
    it("creates bits with just tile number", () => {
      const bits = createTileBits(42);
      expect(extractTileNumber(bits)).toBe(42);
      expect(isTileFlippedX(bits)).toBe(false);
    });

    it("creates bits with flipX", () => {
      const bits = createTileBits(42, true, false, false, false);
      expect(extractTileNumber(bits)).toBe(42);
      expect(isTileFlippedX(bits)).toBe(true);
      expect(isTileFlippedY(bits)).toBe(false);
    });

    it("creates bits with all flags", () => {
      const bits = createTileBits(100, true, true, true, true);
      expect(extractTileNumber(bits)).toBe(100);
      expect(isTileFlippedX(bits)).toBe(true);
      expect(isTileFlippedY(bits)).toBe(true);
      expect(isTileFlippedXY(bits)).toBe(true);
      expect(isTileRotated(bits)).toBe(true);
    });

    it("masks tile number to 12 bits", () => {
      const bits = createTileBits(0xFFFF); // Too large
      expect(extractTileNumber(bits)).toBe(0x0FFF);
    });
  });
});
