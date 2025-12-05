/**
 * Billy Frontier Map Roundtrip Test
 *
 * Tests the complete roundtrip for Billy Frontier terrain files:
 * Binary -> JSON -> Binary -> JSON
 *
 * Note: Billy Frontier uses its own billyFrontierSpecs with 256x256 supertile textures.
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
import { billyFrontierSpecs } from "../../src/python/structSpecs/billyFrontier";
import { BillyFrontierGlobals } from "../../src/data/globals/globals";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";

describe("Billy Frontier Map Roundtrip", () => {
  const testFilePath = join(
    __dirname,
    "../../public/assets/billyFrontier/terrain/swamp_duel.ter.rsrc",
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

    // Check for expected resource types
    const expectedTypes = ["Hedr", "Atrb", "STgd", "Layr", "YCrd", "Itms"];
    for (const expectedType of expectedTypes) {
      expect(
        fork.resources.has(expectedType),
        `Missing resource type: ${expectedType}`,
      ).toBe(true);
    }

    console.log(
      "Billy Frontier resource types:",
      Array.from(fork.resources.keys()),
    );
  });

  it("should parse to JSON with billyFrontier specs", () => {
    if (!fileExists) return;

    const jsonData = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );

    expect(jsonData).toBeDefined();
    expect(typeof jsonData).toBe("object");

    // Check expected structure
    expect(jsonData.Hedr).toBeDefined();
    expect(jsonData.Atrb).toBeDefined();
    expect(jsonData.Layr).toBeDefined();

    console.log("Billy Frontier parsed JSON keys:", Object.keys(jsonData));
  });

  it("should parse header data correctly", () => {
    if (!fileExists) return;

    const jsonData = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );

    expect(jsonData.Hedr).toBeDefined();
    expect(jsonData.Hedr[1000]).toBeDefined();
    expect(jsonData.Hedr[1000].obj).toBeDefined();

    const header = jsonData.Hedr[1000].obj;
    expect(header.mapWidth).toBeGreaterThan(0);
    expect(header.mapHeight).toBeGreaterThan(0);

    console.log("Billy Frontier Header:", {
      version: header.version,
      mapWidth: header.mapWidth,
      mapHeight: header.mapHeight,
      numItems: header.numItems,
      numSplines: header.numSplines,
      numFences: header.numFences,
    });
  });

  it("should complete Binary -> JSON -> Binary roundtrip", () => {
    if (!fileExists) return;

    // Step 1: Binary -> JSON
    const jsonData = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );
    expect(jsonData).toBeDefined();

    // Step 2: JSON -> Binary
    const reserializedData = saveFromJson(jsonData, billyFrontierSpecs, true);
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
    const json1 = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );

    // Step 2: JSON -> Binary
    const binary2 = saveFromJson(json1, billyFrontierSpecs, true);

    // Step 3: Binary -> JSON again
    const json2 = saveToJsonObject(binary2, billyFrontierSpecs, [], [], true);

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

    console.log("✅ Billy Frontier roundtrip header consistency verified");
  });

  it("should preserve layer data through roundtrip", () => {
    if (!fileExists) return;

    const json1 = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );
    const binary2 = saveFromJson(json1, billyFrontierSpecs, true);
    const json2 = saveToJsonObject(binary2, billyFrontierSpecs, [], [], true);

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

    console.log("✅ Billy Frontier layer data preserved through roundtrip");
  });

  it("should preserve item data through roundtrip", () => {
    if (!fileExists) return;

    const json1 = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );
    const binary2 = saveFromJson(json1, billyFrontierSpecs, true);
    const json2 = saveToJsonObject(binary2, billyFrontierSpecs, [], [], true);

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

    console.log("✅ Billy Frontier item data preserved through roundtrip");
  });

  it("should preprocess JSON correctly with Billy Frontier globals", () => {
    if (!fileExists) return;

    const jsonData = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );

    // Preprocessing should not throw
    expect(() => {
      preprocessJson(jsonData as any, BillyFrontierGlobals);
    }).not.toThrow();

    // After preprocessing, verify header data is still present
    expect(jsonData.Hedr).toBeDefined();
    expect(jsonData.Hedr[1000]?.obj).toBeDefined();

    const header = jsonData.Hedr[1000].obj;
    expect(header.mapWidth).toBeGreaterThan(0);
    expect(header.mapHeight).toBeGreaterThan(0);

    console.log("Billy Frontier Preprocessed Map:", {
      version: header.version,
      mapWidth: header.mapWidth,
      mapHeight: header.mapHeight,
      numItems: header.numItems,
    });
  });

  it("should roundtrip without specs (raw resource fork)", () => {
    if (!fileExists) return;

    // Parse without specs (hex data only)
    const jsonData1 = saveToJsonObject(originalData, [], [], [], false);

    // Convert back to binary
    const fork = loadFromJson(jsonData1, [], false);
    const binaryData2 = saveToBytes(fork);

    // Parse the new binary
    const jsonData2 = saveToJsonObject(
      new Uint8Array(binaryData2),
      [],
      [],
      [],
      false,
    );

    // Compare metadata
    expect(jsonData2._metadata?.junk1).toBe(jsonData1._metadata?.junk1);

    // Compare resource types
    const types1 = Object.keys(jsonData1)
      .filter((k) => k !== "_metadata")
      .sort();
    const types2 = Object.keys(jsonData2)
      .filter((k) => k !== "_metadata")
      .sort();
    expect(types2).toEqual(types1);

    // Compare hex data for header
    expect(jsonData2.Hedr?.["1000"]?.data).toBe(jsonData1.Hedr?.["1000"]?.data);

    console.log("✅ Billy Frontier hex data roundtrip successful");
  });
});

describe("Billy Frontier Multiple Levels", () => {
  const levelsToTest = [
    "town_shootout.ter.rsrc",
    "town_duel.ter.rsrc",
    "town_stampede.ter.rsrc",
    "swamp_shootout.ter.rsrc",
    "swamp_duel.ter.rsrc",
    "swamp_stampede.ter.rsrc",
  ];

  const basePath = join(
    __dirname,
    "../../../games/billyfrontier/Data/Terrain/",
  );

  for (const levelFile of levelsToTest) {
    it(`should parse and roundtrip ${levelFile}`, () => {
      const filePath = join(basePath, levelFile);

      if (!existsSync(filePath)) {
        console.log(`Skipping ${levelFile} - file not found`);
        return;
      }

      const data = readFileSync(filePath);

      // Parse to JSON
      const json1 = saveToJsonObject(data, billyFrontierSpecs, [], [], true);
      expect(json1).toBeDefined();
      expect(json1.Hedr).toBeDefined();

      // Roundtrip
      const binary2 = saveFromJson(json1, billyFrontierSpecs, true);
      const json2 = saveToJsonObject(binary2, billyFrontierSpecs, [], [], true);

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
