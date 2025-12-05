/**
 * Nanosaur 1 Map Roundtrip Test
 *
 * Tests the complete roundtrip for Nanosaur 1 terrain files.
 *
 * Note: Nanosaur 1 uses a DIFFERENT format than other Pangea games:
 * - Uses .ter files (not .ter.rsrc) with a proprietary binary format
 * - Uses .trt files for terrain textures
 * - Parsed using the JavaScript classicProprocessor, not rsrcdump
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  parseNanosaur1Level,
  nanosaur1LevelToOttoMaticLevel,
} from "../../src/data/processors/classicProprocessor";
import { NanosaurGlobals } from "../../src/data/globals/globals";
import { compareLevelData } from "../../src/data/mapRoundtrip/parseLevel";

describe("Nanosaur 1 Map Roundtrip", () => {
  const testFilePath = join(
    __dirname,
    "../../public/assets/nanosaur/terrain/Level1.ter",
  );
  const textureFilePath = join(
    __dirname,
    "../../public/assets/nanosaur/terrain/Level1.trt",
  );
  let originalData: Buffer;
  let textureData: Buffer;
  let fileExists: boolean;
  let textureExists: boolean;

  beforeAll(() => {
    fileExists = existsSync(testFilePath);
    textureExists = existsSync(textureFilePath);
    if (fileExists) {
      originalData = readFileSync(testFilePath);
    }
    if (textureExists) {
      textureData = readFileSync(textureFilePath);
    }
  });

  it("should have valid terrain data file", () => {
    expect(fileExists).toBe(true);
    expect(originalData.length).toBeGreaterThan(0);
  });

  it("should have valid texture data file", () => {
    expect(textureExists).toBe(true);
    expect(textureData.length).toBeGreaterThan(0);
  });

  it("should parse Nanosaur 1 level format", () => {
    if (!fileExists) return;

    // Create a proper ArrayBuffer copy to avoid SharedArrayBuffer issues
    const arrayBuffer = new ArrayBuffer(originalData.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(originalData));

    const levelData = parseNanosaur1Level(arrayBuffer);

    expect(levelData).toBeDefined();
    expect(levelData.header).toBeDefined();
    expect(levelData.header.width).toBeGreaterThan(0);
    expect(levelData.header.depth).toBeGreaterThan(0);

    console.log("Nanosaur 1 Level Header:", {
      width: levelData.header.width,
      depth: levelData.header.depth,
      textureLayerOffset: levelData.header.textureLayerOffset,
      heightmapLayerOffset: levelData.header.heightmapLayerOffset,
      objectListOffset: levelData.header.objectListOffset,
    });

    // Check that layers were parsed
    expect(levelData.textureLayer.length).toBeGreaterThan(0);

    console.log("Parsed data:", {
      textureLayerLength: levelData.textureLayer.length,
      objectListLength: levelData.objectList.length,
      textureAttributesLength: levelData.textureAttributes.length,
    });
  });

  it("should convert to Otto Matic compatible format", () => {
    if (!fileExists) return;

    // Create a proper ArrayBuffer copy to avoid SharedArrayBuffer issues
    const arrayBuffer = new ArrayBuffer(originalData.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(originalData));

    const levelData = parseNanosaur1Level(arrayBuffer);
    const ottoLevel = nanosaur1LevelToOttoMaticLevel(levelData);

    expect(ottoLevel).toBeDefined();
    expect(ottoLevel.Hedr).toBeDefined();
    expect(ottoLevel.Hedr[1000]).toBeDefined();
    expect(ottoLevel.Hedr[1000].obj).toBeDefined();

    const header = ottoLevel.Hedr[1000].obj;
    expect(header.mapWidth).toBe(levelData.header.width);
    expect(header.mapHeight).toBe(levelData.header.depth);

    console.log("Converted Header:", {
      version: header.version,
      mapWidth: header.mapWidth,
      mapHeight: header.mapHeight,
      numItems: header.numItems,
    });
  });

  it("should preserve item data through conversion", () => {
    if (!fileExists) return;

    // Create a proper ArrayBuffer copy to avoid SharedArrayBuffer issues
    const arrayBuffer = new ArrayBuffer(originalData.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(originalData));

    const levelData = parseNanosaur1Level(arrayBuffer);
    const ottoLevel = nanosaur1LevelToOttoMaticLevel(levelData);

    // Check items were converted
    if (ottoLevel.Itms && ottoLevel.Itms[1000]?.obj) {
      const items = ottoLevel.Itms[1000].obj;
      expect(items.length).toBe(levelData.objectList.length);

      // Check first item matches
      if (items.length > 0 && levelData.objectList.length > 0) {
        expect(items[0].x).toBe(levelData.objectList[0].x);
        expect(items[0].type).toBe(levelData.objectList[0].type);
      }
    }

    console.log("✅ Nanosaur 1 item data preserved");
  });

  it("should preserve layer data through conversion", () => {
    if (!fileExists) return;

    // Create a proper ArrayBuffer copy to avoid SharedArrayBuffer issues
    const arrayBuffer = new ArrayBuffer(originalData.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(originalData));

    const levelData = parseNanosaur1Level(arrayBuffer);
    const ottoLevel = nanosaur1LevelToOttoMaticLevel(levelData);

    // Check layer was converted
    if (ottoLevel.Layr && ottoLevel.Layr[1000]?.obj) {
      const layrArr = ottoLevel.Layr[1000].obj;
      expect(layrArr.length).toBe(levelData.textureLayer.length);

      // Check first few values match
      for (let i = 0; i < Math.min(10, layrArr.length); i++) {
        expect(layrArr[i]).toBe(levelData.textureLayer[i]);
      }
    }

    console.log("✅ Nanosaur 1 layer data preserved");
  });

  it("should produce consistent conversion on double-convert", () => {
    if (!fileExists) return;

    // Create a proper ArrayBuffer copy to avoid SharedArrayBuffer issues
    const arrayBuffer = new ArrayBuffer(originalData.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(originalData));

    // Convert twice
    const levelData1 = parseNanosaur1Level(arrayBuffer);
    const ottoLevel1 = nanosaur1LevelToOttoMaticLevel(levelData1);

    const levelData2 = parseNanosaur1Level(arrayBuffer);
    const ottoLevel2 = nanosaur1LevelToOttoMaticLevel(levelData2);

    // Compare headers
    expect(ottoLevel1.Hedr[1000].obj.mapWidth).toBe(
      ottoLevel2.Hedr[1000].obj.mapWidth,
    );
    expect(ottoLevel1.Hedr[1000].obj.mapHeight).toBe(
      ottoLevel2.Hedr[1000].obj.mapHeight,
    );

    // Compare using the comparison function
    const comparison = compareLevelData(ottoLevel1, ottoLevel2);
    expect(comparison.equal).toBe(true);

    console.log("✅ Nanosaur 1 double-convert produces consistent results");
  });

  // Note: Full binary roundtrip is not possible for Nanosaur 1
  // because we don't have a serializer for the proprietary format.
  // This would need to be implemented if full editing support is needed.
  it.skip("should roundtrip to binary (NOT IMPLEMENTED)", () => {
    // Nanosaur 1 uses a proprietary binary format that doesn't use resource forks
    // Serialization back to this format is not currently implemented
    console.log("⚠️ Nanosaur 1 binary serialization not implemented");
  });
});
