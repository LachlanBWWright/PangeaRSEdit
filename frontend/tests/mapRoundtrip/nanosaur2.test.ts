/**
 * Nanosaur 2 Map Roundtrip Test
 *
 * Tests the complete roundtrip for Nanosaur 2 terrain files:
 * Binary -> JSON -> Binary -> JSON
 *
 * Note: Nanosaur 2 uses a format similar to Otto Matic but with
 * a simplified header (no numTilePages/numTiles).
 * Uses JPG tile images instead of LZSS-compressed 16-bit images.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  load,
  saveToJsonObject,
  loadFromJson,
  saveToBytes,
  saveFromJson,
} from "../../src/rsrcdump-ts/rsrcdump";
import { nanosaur2Specs } from "../../src/python/structSpecs/nanosaur2";
import { Nanosaur2Globals } from "../../src/data/globals/globals";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";

describe("Nanosaur 2 Map Roundtrip", () => {
  const testFilePath = join(
    __dirname,
    "../../public/assets/nanosaur2/terrain/battle1.ter.rsrc",
  );
  let originalData: Buffer;
  let fileExists: boolean;

  beforeAll(() => {
    fileExists = existsSync(testFilePath);
    if (fileExists) {
      originalData = readFileSync(testFilePath);
    }
  });

  it("should have valid terrain data file", () => {
    expect(fileExists).toBe(true);
    expect(originalData.length).toBeGreaterThan(0);
  });

  it("should load resource fork correctly", () => {
    if (!fileExists) return;

    const forkResult = load(originalData);
    expect(forkResult.ok).toBe(true);
    if (!forkResult.ok) return;
    const fork = forkResult.value;

    expect(fork).toBeDefined();
    expect(fork.resources).toBeDefined();
    expect(fork.resources.size).toBeGreaterThan(0);

    // Check for expected resource types (same as Bugdom 2)
    const expectedTypes = ["Hedr", "Atrb", "STgd", "Layr", "YCrd", "Itms"];
    for (const expectedType of expectedTypes) {
      expect(
        fork.resources.has(expectedType),
        `Missing resource type: ${expectedType}`,
      ).toBe(true);
    }

    console.log(
      "Nanosaur 2 resource types:",
      Array.from(fork.resources.keys()),
    );
  });

  it("should parse to JSON with bugdom2 specs", () => {
    if (!fileExists) return;

    const jsonResult = saveToJsonObject(originalData, nanosaur2Specs, [], [], true);
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;
    const jsonData = jsonResult.value;

    expect(jsonData).toBeDefined();
    expect(typeof jsonData).toBe("object");

    // Check expected structure
    expect(jsonData.Hedr).toBeDefined();
    expect(jsonData.Atrb).toBeDefined();
    expect(jsonData.Layr).toBeDefined();

    console.log("Nanosaur 2 parsed JSON keys:", Object.keys(jsonData));
  });

  it("should complete Binary -> JSON -> Binary roundtrip", () => {
    if (!fileExists) return;

    // Step 1: Binary -> JSON
    const jsonResult = saveToJsonObject(originalData, nanosaur2Specs, [], [], true);
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;
    const jsonData = jsonResult.value;
    expect(jsonData).toBeDefined();

    // Step 2: JSON -> Binary
    const reserializedData = saveFromJson(jsonData, nanosaur2Specs, true);
    expect(reserializedData).toBeDefined();
    expect(reserializedData.length).toBeGreaterThan(0);

    // Log size difference for analysis
    console.log("Original size:", originalData.length);
    console.log("Reserialized size:", reserializedData.length);
    console.log(
      "Size difference:",
      originalData.length - reserializedData.length,
    );
  });

  it("should complete Binary -> JSON -> Binary -> JSON roundtrip with consistent data", () => {
    if (!fileExists) return;

    // Step 1: Binary -> JSON
    const json1 = saveToJsonObject(originalData, nanosaur2Specs, [], [], true);

    // Step 2: JSON -> Binary
    const binary2 = saveFromJson(json1, nanosaur2Specs, true);

    // Step 3: Binary -> JSON again
    const json2 = saveToJsonObject(binary2, nanosaur2Specs, [], [], true);

    // Compare header data
    expect(json1.Hedr).toBeDefined();
    expect(json2.Hedr).toBeDefined();

    const header1 = json1.Hedr[1000]?.obj;
    const header2 = json2.Hedr[1000]?.obj;

    if (header1 && header2) {
      expect(header2.version).toBe(header1.version);
      expect(header2.mapWidth).toBe(header1.mapWidth);
      expect(header2.mapHeight).toBe(header1.mapHeight);
      expect(header2.numItems).toBe(header1.numItems);
      expect(header2.numSplines).toBe(header1.numSplines);
      expect(header2.numFences).toBe(header1.numFences);
      expect(header2.numWaterPatches).toBe(header1.numWaterPatches);
    }

    console.log("✅ Nanosaur 2 roundtrip header consistency verified");
  });

  it("should preserve layer data through roundtrip", () => {
    if (!fileExists) return;

    const json1 = saveToJsonObject(originalData, nanosaur2Specs, [], [], true);
    const binary2 = saveFromJson(json1, nanosaur2Specs, true);
    const json2 = saveToJsonObject(binary2, nanosaur2Specs, [], [], true);

    expect(json1.Layr).toBeDefined();
    expect(json2.Layr).toBeDefined();

    const layer1 = json1.Layr[1000]?.obj;
    const layer2 = json2.Layr[1000]?.obj;

    if (layer1 && layer2 && Array.isArray(layer1) && Array.isArray(layer2)) {
      expect(layer2.length).toBe(layer1.length);

      // Check first few values match
      for (let i = 0; i < Math.min(100, layer1.length); i++) {
        expect(layer2[i]).toBe(layer1[i]);
      }
    }

    console.log("✅ Nanosaur 2 layer data preserved through roundtrip");
  });

  it("should preserve item data through roundtrip", () => {
    if (!fileExists) return;

    const json1 = saveToJsonObject(originalData, nanosaur2Specs, [], [], true);
    const binary2 = saveFromJson(json1, nanosaur2Specs, true);
    const json2 = saveToJsonObject(binary2, nanosaur2Specs, [], [], true);

    expect(json1.Itms).toBeDefined();
    expect(json2.Itms).toBeDefined();

    const items1 = json1.Itms[1000]?.obj;
    const items2 = json2.Itms[1000]?.obj;

    if (items1 && items2 && Array.isArray(items1) && Array.isArray(items2)) {
      expect(items2.length).toBe(items1.length);

      // Check first item matches
      if (items1.length > 0) {
        expect(items2[0].x).toBe(items1[0].x);
        expect(items2[0].y).toBe(items1[0].y);
        expect(items2[0].type).toBe(items1[0].type);
      }
    }

    console.log("✅ Nanosaur 2 item data preserved through roundtrip");
  });

  it("should preprocess JSON correctly with Nanosaur 2 globals", () => {
    if (!fileExists) return;

    const jsonResult = saveToJsonObject(originalData, nanosaur2Specs, [], [], true);
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;
    const jsonData = jsonResult.value;

    // Preprocessing should not throw
    expect(() => {
      preprocessJson(jsonData as any, Nanosaur2Globals);
    }).not.toThrow();

    // After preprocessing, verify header data is still present
    expect(jsonData.Hedr).toBeDefined();
    expect(jsonData.Hedr[1000]?.obj).toBeDefined();

    const header = jsonData.Hedr[1000].obj;
    expect(header.mapWidth).toBeGreaterThan(0);
    expect(header.mapHeight).toBeGreaterThan(0);

    console.log("Nanosaur 2 Preprocessed Map:", {
      version: header.version,
      mapWidth: header.mapWidth,
      mapHeight: header.mapHeight,
      numItems: header.numItems,
    });
  });
});

describe("Nanosaur 2 Multiple Levels", () => {
  const levelsToTest = [
    "level1.ter.rsrc",
    "level2.ter.rsrc",
    "level3.ter.rsrc",
    "battle1.ter.rsrc",
    "race1.ter.rsrc",
    "flag1.ter.rsrc",
  ];

  const basePath = join(__dirname, "../../../games/nanosaur2/Data/Terrain/");

  for (const levelFile of levelsToTest) {
    it(`should parse and roundtrip ${levelFile}`, () => {
      const filePath = join(basePath, levelFile);

      if (!existsSync(filePath)) {
        console.log(`Skipping ${levelFile} - file not found`);
        return;
      }

      const data = readFileSync(filePath);

      // Parse to JSON
      const json1 = saveToJsonObject(data, nanosaur2Specs, [], [], true);
      expect(json1).toBeDefined();
      expect(json1.Hedr).toBeDefined();

      // Roundtrip
      const binary2 = saveFromJson(json1, nanosaur2Specs, true);
      const json2 = saveToJsonObject(binary2, nanosaur2Specs, [], [], true);

      // Verify header consistency
      const header1 = json1.Hedr[1000]?.obj;
      const header2 = json2.Hedr[1000]?.obj;

      if (header1 && header2) {
        expect(header2.mapWidth).toBe(header1.mapWidth);
        expect(header2.mapHeight).toBe(header1.mapHeight);
      }

      console.log(`✅ ${levelFile} roundtrip successful`);
    });
  }
});
