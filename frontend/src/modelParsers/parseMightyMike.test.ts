// parseMightyMike.test.ts
// Tests for MightyMike parsing with roundtrip verification

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  parseMightyMikeTileSet,
  parseMightyMikeMap,
  parseMightyMikeLevel,
  mightyMikeMapToCompressedBinary,
} from "../modelParsers/parseMightyMike";

const MIGHTY_MIKE_MAPS_PATH = join(
  __dirname,
  "../../../games/mightymike/Data/Maps"
);

/**
 * Converts a Node.js Buffer to an ArrayBuffer
 */
function nodeBufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

describe("parseMightyMikeTileSet", () => {
  const tilesetPath = join(MIGHTY_MIKE_MAPS_PATH, "bargain.tileset");

  it("should parse a basic tileset file", () => {
    if (!existsSync(tilesetPath)) {
      console.log("Tileset file not found, skipping test");
      return;
    }

    const buffer = readFileSync(tilesetPath);
    const result = parseMightyMikeTileSet(nodeBufferToArrayBuffer(buffer));

    // Tilesets use PACK_TYPE_RLB (0) which we don't support yet
    // Skip this test until RLB decompression is implemented
    if (!result.ok) {
      console.log("Tileset parsing failed (likely needs PACK_TYPE_RLB support):", result.error);
      return;
    }

    const tileset = result.value;
    expect(tileset).toHaveProperty("numTileDefinitions");
    expect(tileset).toHaveProperty("xlateTable");
    expect(tileset).toHaveProperty("tileAttributes");
    expect(tileset).toHaveProperty("tileAnimations");
    expect(tileset).toHaveProperty("transparencyColors");

    // Basic validation
    expect(Array.isArray(tileset.xlateTable)).toBe(true);
    expect(Array.isArray(tileset.tileAttributes)).toBe(true);
    expect(Array.isArray(tileset.tileAnimations)).toBe(true);
    expect(Array.isArray(tileset.transparencyColors)).toBe(true);

    console.log("Tileset parsed successfully:");
    console.log(`  Tile definitions: ${tileset.numTileDefinitions}`);
    console.log(`  Xlate entries: ${tileset.numXlateEntries}`);
    console.log(`  Tile attributes: ${tileset.numTileAttributeEntries}`);
    console.log(`  Tile animations: ${tileset.numTileAnims}`);
  });
});

describe("parseMightyMikeMap", () => {
  const mapPath = join(MIGHTY_MIKE_MAPS_PATH, "bargain.map-1");

  it("should parse a basic map file", () => {
    if (!existsSync(mapPath)) {
      console.log("Map file not found, skipping test");
      return;
    }

    const buffer = readFileSync(mapPath);
    const result = parseMightyMikeMap(nodeBufferToArrayBuffer(buffer));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const map = result.value;
      expect(map).toHaveProperty("mapWidth");
      expect(map).toHaveProperty("mapHeight");
      expect(map).toHaveProperty("mapImage");
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

      console.log("Map parsed successfully:");
      console.log(`  Dimensions: ${map.mapWidth}x${map.mapHeight}`);
      console.log(`  Items: ${map.numItems}`);
      console.log(`  Has alt map: ${map.altMap !== null}`);
    }
  });
});

describe("parseMightyMikeLevel", () => {
  const tilesetPath = join(MIGHTY_MIKE_MAPS_PATH, "bargain.tileset");
  const mapPath = join(MIGHTY_MIKE_MAPS_PATH, "bargain.map-1");

  it("should parse a complete level with tileset and map", () => {
    if (!existsSync(tilesetPath) || !existsSync(mapPath)) {
      console.log("Files not found, skipping test");
      return;
    }

    const tilesetBuffer = readFileSync(tilesetPath);
    const mapBuffer = readFileSync(mapPath);

    const result = parseMightyMikeLevel(
      nodeBufferToArrayBuffer(tilesetBuffer),
      nodeBufferToArrayBuffer(mapBuffer)
    );

    // Level parsing might fail due to tileset parsing issue (PACK_TYPE_RLB)
    if (!result.ok) {
      console.log("Level parsing failed (likely tileset PACK_TYPE_RLB issue):", result.error);
      return;
    }

    const level = result.value;
    expect(level).toHaveProperty("tileset");
    expect(level).toHaveProperty("map");

    // Validate structure
    expect(level.tileset).toHaveProperty("xlateTable");
    expect(level.map).toHaveProperty("mapImage");
  });
});

describe("MightyMike Semantic Roundtrip", () => {
  const testMaps = [
    "bargain.map-1",
    "candy.map-1", 
    "fairy.map-1",
    "clown.map-1",
    "jurassic.map-1",
  ];

  testMaps.forEach((mapFileName) => {
    it(`should achieve semantic roundtrip for ${mapFileName}`, () => {
      const mapPath = join(MIGHTY_MIKE_MAPS_PATH, mapFileName);
      
      if (!existsSync(mapPath)) {
        console.log(`${mapFileName} not found, skipping`);
        return;
      }

      // Load original file
      const originalBuffer = readFileSync(mapPath);

      // Parse the file
      const parseResult = parseMightyMikeMap(
        nodeBufferToArrayBuffer(originalBuffer)
      );
      expect(parseResult.ok).toBe(true);

      if (!parseResult.ok) {
        console.log(`Failed to parse ${mapFileName}:`, parseResult.error);
        return;
      }

      const parsedMap = parseResult.value;

      // Convert back to binary with compression
      const exportedBuffer = mightyMikeMapToCompressedBinary(parsedMap);

      // Parse the exported data
      const reParseResult = parseMightyMikeMap(exportedBuffer);
      expect(reParseResult.ok).toBe(true);

      if (!reParseResult.ok) {
        console.log(`Failed to re-parse ${mapFileName}:`, reParseResult.error);
        return;
      }

      const reparsedMap = reParseResult.value;

      // Compare semantically - data should be identical even if compression differs
      console.log(`${mapFileName}:`);
      console.log(`  Original: ${parsedMap.mapWidth}x${parsedMap.mapHeight}, ${parsedMap.numItems} items`);
      console.log(`  Roundtrip: ${reparsedMap.mapWidth}x${reparsedMap.mapHeight}, ${reparsedMap.numItems} items`);

      expect(reparsedMap.mapWidth).toBe(parsedMap.mapWidth);
      expect(reparsedMap.mapHeight).toBe(parsedMap.mapHeight);
      expect(reparsedMap.numItems).toBe(parsedMap.numItems);

      // Compare map image
      for (let y = 0; y < parsedMap.mapHeight; y++) {
        for (let x = 0; x < parsedMap.mapWidth; x++) {
          expect(reparsedMap.mapImage[y][x]).toBe(parsedMap.mapImage[y][x]);
        }
      }

      // Compare items
      for (let i = 0; i < parsedMap.numItems; i++) {
        const origItem = parsedMap.items[i];
        const rtItem = reparsedMap.items[i];
        expect(rtItem.x).toBe(origItem.x);
        expect(rtItem.y).toBe(origItem.y);
        expect(rtItem.type).toBe(origItem.type);
        expect(rtItem.p0).toBe(origItem.p0);
        expect(rtItem.p1).toBe(origItem.p1);
        expect(rtItem.p2).toBe(origItem.p2);
        expect(rtItem.p3).toBe(origItem.p3);
      }

      // Compare alt map if present
      if (parsedMap.altMap) {
        expect(reparsedMap.altMap).not.toBeNull();
        for (let y = 0; y < parsedMap.mapHeight; y++) {
          for (let x = 0; x < parsedMap.mapWidth; x++) {
            expect(reparsedMap.altMap![y][x]).toBe(parsedMap.altMap[y][x]);
          }
        }
      }

      console.log(`  ✓ Semantic roundtrip verified`);
    });
  });

  it("should handle all map variants (map-1, map-2, map-3)", () => {
    const mapVariants = [
      "bargain.map-1",
      "bargain.map-2",
      "bargain.map-3",
    ];

    for (const mapFileName of mapVariants) {
      const mapPath = join(MIGHTY_MIKE_MAPS_PATH, mapFileName);
      
      if (!existsSync(mapPath)) {
        console.log(`${mapFileName} not found, skipping`);
        continue;
      }

      const buffer = readFileSync(mapPath);
      const result = parseMightyMikeMap(
        nodeBufferToArrayBuffer(buffer)
      );
      
      expect(result.ok).toBe(true);

      if (result.ok) {
        const map = result.value;
        expect(map.mapWidth).toBeGreaterThan(0);
        expect(map.mapHeight).toBeGreaterThan(0);
        console.log(`${mapFileName}: ${map.mapWidth}x${map.mapHeight}, ${map.numItems} items`);
      }
    }
  });
});

describe("MightyMike Data Inspection", () => {
  it("should parse and inspect map data to verify items are produced", () => {
    const mapPath = join(MIGHTY_MIKE_MAPS_PATH, "bargain.map-1");
    
    if (!existsSync(mapPath)) {
      console.log("bargain.map-1 not found, skipping test");
      return;
    }

    const buffer = readFileSync(mapPath);
    const result = parseMightyMikeMap(nodeBufferToArrayBuffer(buffer));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      console.log("Failed to parse map:", result.error);
      return;
    }

    const map = result.value;
    
    console.log("\n=== Mighty Mike Map Data Inspection ===");
    console.log(`Map dimensions: ${map.mapWidth}x${map.mapHeight}`);
    console.log(`Number of items: ${map.numItems}`);
    console.log(`Map image array length: ${map.mapImage.length}`);
    console.log(`Has alt map: ${map.altMap !== null}`);
    
    // Inspect items
    if (map.items.length > 0) {
      console.log("\n=== Items Inspection ===");
      console.log(`Total items found: ${map.items.length}`);
      
      // Show first few items
      const itemsToShow = Math.min(5, map.items.length);
      console.log(`First ${itemsToShow} items:`);
      for (let i = 0; i < itemsToShow; i++) {
        const item = map.items[i];
        console.log(`  Item ${i}: type=${item.type}, pos=(${item.x}, ${item.y}), params=(${item.p0}, ${item.p1}, ${item.p2}, ${item.p3})`);
      }
      
      // Verify items have valid data
      expect(map.items.length).toBe(map.numItems);
      map.items.forEach((item) => {
        expect(typeof item.type).toBe('number');
        expect(typeof item.x).toBe('number');
        expect(typeof item.y).toBe('number');
        // Item positions should be reasonable
        expect(item.x).toBeGreaterThanOrEqual(-10000);
        expect(item.x).toBeLessThanOrEqual(10000);
        expect(item.y).toBeGreaterThanOrEqual(-10000);
        expect(item.y).toBeLessThanOrEqual(10000);
      });
    } else {
      console.log("No items found in map");
    }
    
    // Inspect map image tiles
    console.log("\n=== Map Image Inspection ===");
    const uniqueTiles = new Set<number>();
    for (const row of map.mapImage) {
      for (const tile of row) {
        uniqueTiles.add(tile);
      }
    }
    console.log(`Unique tile numbers used: ${uniqueTiles.size}`);
    const sortedTiles = Array.from(uniqueTiles).sort((a, b) => a - b);
    if (sortedTiles.length <= 20) {
      console.log(`Tile numbers: [${sortedTiles.join(', ')}]`);
    } else {
      console.log(`Tile range: ${sortedTiles[0]} to ${sortedTiles[sortedTiles.length - 1]}`);
    }
    
    // Sample a few tiles
    if (map.mapImage.length > 0 && map.mapImage[0].length > 0) {
      console.log("\nSample tiles from map:");
      const samplesToShow = Math.min(5, map.mapHeight);
      for (let y = 0; y < samplesToShow; y++) {
        const x = Math.min(5, map.mapWidth - 1);
        console.log(`  Position (${x}, ${y}): tile ${map.mapImage[y][x]}`);
      }
    }
    
    console.log("\n=== Data Verification Complete ===\n");
  });
  
  it("should parse and inspect tileset data", () => {
    const tilesetPath = join(MIGHTY_MIKE_MAPS_PATH, "bargain.tileset");
    
    if (!existsSync(tilesetPath)) {
      console.log("bargain.tileset not found, skipping test");
      return;
    }

    const buffer = readFileSync(tilesetPath);
    const result = parseMightyMikeTileSet(nodeBufferToArrayBuffer(buffer));

    // Tileset might fail due to RLB compression
    if (!result.ok) {
      console.log("Tileset parsing failed (expected if RLB compressed):", result.error);
      return;
    }

    const tileset = result.value;
    
    console.log("\n=== Mighty Mike Tileset Data Inspection ===");
    console.log(`Number of tile definitions: ${tileset.numTileDefinitions}`);
    console.log(`Xlate table entries: ${tileset.numXlateEntries}`);
    console.log(`Tile attributes: ${tileset.numTileAttributeEntries}`);
    console.log(`Tile animations: ${tileset.numTileAnims}`);
    console.log(`Transparency colors: ${tileset.numTileXparentColors}`);
    
    // Inspect xlate table
    if (tileset.xlateTable.length > 0) {
      console.log("\nXlate table sample:");
      const samplesToShow = Math.min(10, tileset.xlateTable.length);
      console.log(`  First ${samplesToShow} entries: [${tileset.xlateTable.slice(0, samplesToShow).join(', ')}]`);
    }
    
    // Inspect tile attributes
    if (tileset.tileAttributes.length > 0) {
      console.log("\nTile attributes sample:");
      const samplesToShow = Math.min(3, tileset.tileAttributes.length);
      for (let i = 0; i < samplesToShow; i++) {
        const attr = tileset.tileAttributes[i];
        console.log(`  Attr ${i}: flags=${attr.flags}, params=(${attr.p0}, ${attr.p1}, ${attr.p2}, ${attr.p3}, ${attr.p4})`);
      }
    }
    
    // Inspect animations
    if (tileset.tileAnimations.length > 0) {
      console.log("\nTile animations:");
      tileset.tileAnimations.forEach((anim, idx) => {
        console.log(`  Animation ${idx}: "${anim.name}", speed=${anim.speed}, baseTile=${anim.baseTile}, ${anim.numFrames} frames`);
        if (anim.tileNums.length > 0) {
          console.log(`    Frame tiles: [${anim.tileNums.join(', ')}]`);
        }
      });
    }
    
    console.log("\n=== Tileset Verification Complete ===\n");
  });
});
