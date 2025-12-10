// parseMightyMike.test.ts
// Tests for MightyMike parsing

import { describe, it, expect } from "vitest";
import {
  parseMightyMikeTileSet,
  parseMightyMikeMap,
  parseMightyMikeLevel,
} from "../modelParsers/parseMightyMike";

describe("parseMightyMikeTileSet", () => {
  it("should parse a basic tileset file", async () => {
    // Load a test tileset file
    const response = await fetch("/games/mightymike/Data/Maps/bargain.tileset");
    const buffer = await response.arrayBuffer();

    const result = parseMightyMikeTileSet(buffer);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tileset = result.value;
      expect(tileset).toHaveProperty("num_tile_definitions");
      expect(tileset).toHaveProperty("xlate_table");
      expect(tileset).toHaveProperty("tile_attributes");
      expect(tileset).toHaveProperty("tile_animations");
      expect(tileset).toHaveProperty("transparency_colors");

      // Basic validation
      expect(Array.isArray(tileset.xlate_table)).toBe(true);
      expect(Array.isArray(tileset.tile_attributes)).toBe(true);
      expect(Array.isArray(tileset.tile_animations)).toBe(true);
      expect(Array.isArray(tileset.transparency_colors)).toBe(true);
    }
  });
});

describe("parseMightyMikeMap", () => {
  it("should parse a basic map file", async () => {
    // Load a test map file
    const response = await fetch("/games/mightymike/Data/Maps/bargain.map-1");
    const buffer = await response.arrayBuffer();

    const result = parseMightyMikeMap(buffer);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const map = result.value;
      expect(map).toHaveProperty("map_width");
      expect(map).toHaveProperty("map_height");
      expect(map).toHaveProperty("map_image");
      expect(map).toHaveProperty("items");

      // Basic validation
      expect(map.mapWidth).toBeGreaterThan(0);
      expect(map.mapHeight).toBeGreaterThan(0);
      expect(Array.isArray(map.mapImage)).toBe(true);
      expect(Array.isArray(map.items)).toBe(true);

      // Check map dimensions match
      expect(map.mapImage.length).toBe(map.mapHeight);
      if (map.mapImage.length > 0) {
        expect(map.mapImage[0].length).toBe(map.mapWidth);
      }
    }
  });
});

describe("parseMightyMikeLevel", () => {
  it("should parse a complete level with tileset and map", async () => {
    // Load test files
    const [tilesetResponse, mapResponse] = await Promise.all([
      fetch("/games/mightymike/Data/Maps/bargain.tileset"),
      fetch("/games/mightymike/Data/Maps/bargain.map-1"),
    ]);

    const tilesetBuffer = await tilesetResponse.arrayBuffer();
    const mapBuffer = await mapResponse.arrayBuffer();

    const result = parseMightyMikeLevel(tilesetBuffer, mapBuffer);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const level = result.value;
      expect(level).toHaveProperty("tileset");
      expect(level).toHaveProperty("map");

      // Validate structure
      expect(level.tileset).toHaveProperty("xlate_table");
      expect(level.map).toHaveProperty("map_image");
    }
  });
});
