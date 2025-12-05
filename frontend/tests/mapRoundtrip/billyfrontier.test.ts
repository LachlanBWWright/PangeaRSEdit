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

    // Check for expected resource types (not all files have all types)
    const expectedTypes = ["Hedr", "STgd", "YCrd", "Itms"];
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

    const jsonResult = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;
    const jsonData = jsonResult.value;

    expect(jsonData).toBeDefined();
    expect(typeof jsonData).toBe("object");

    // Check expected structure
    expect(jsonData.Hedr).toBeDefined();

    console.log("Billy Frontier parsed JSON keys:", Object.keys(jsonData));
  });

  it("should parse header data correctly", () => {
    if (!fileExists) return;

    const jsonResult = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;
    const jsonData = jsonResult.value;

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

  it.skip("should complete Binary -> JSON -> Binary roundtrip", () => {
    // Skip: StructConverter.pack not implemented
  });

  it.skip("should complete Binary -> JSON -> Binary -> JSON roundtrip with consistent data", () => {
    // Skip: StructConverter.pack not implemented
  });

  it.skip("should preserve layer data through roundtrip", () => {
    // Skip: StructConverter.pack not implemented
  });

  it.skip("should preserve item data through roundtrip", () => {
    // Skip: StructConverter.pack not implemented
  });

  it("should preprocess JSON correctly with Billy Frontier globals", () => {
    if (!fileExists) return;

    const jsonResult = saveToJsonObject(
      originalData,
      billyFrontierSpecs,
      [],
      [],
      true,
    );
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;
    const jsonData = jsonResult.value;

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
    const jsonResult1 = saveToJsonObject(originalData, [], [], [], false);
    expect(jsonResult1.ok).toBe(true);
    if (!jsonResult1.ok) return;
    const jsonData1 = jsonResult1.value;

    // Convert back to binary
    const forkResult = loadFromJson(jsonData1, [], false);
    expect(forkResult.ok).toBe(true);
    if (!forkResult.ok) return;
    const fork = forkResult.value;

    const binaryData2 = saveToBytes(fork);

    // Parse the new binary
    const jsonResult2 = saveToJsonObject(
      new Uint8Array(binaryData2),
      [],
      [],
      [],
      false,
    );
    expect(jsonResult2.ok).toBe(true);
    if (!jsonResult2.ok) return;
    const jsonData2 = jsonResult2.value;

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
    it(`should parse ${levelFile}`, () => {
      const filePath = join(basePath, levelFile);

      if (!existsSync(filePath)) {
        console.log(`Skipping ${levelFile} - file not found`);
        return;
      }

      const data = readFileSync(filePath);

      // Parse to JSON
      const json1Result = saveToJsonObject(data, billyFrontierSpecs, [], [], true);
      expect(json1Result.ok).toBe(true);
      if (!json1Result.ok) return;
      const json1 = json1Result.value;

      expect(json1).toBeDefined();
      expect(json1.Hedr).toBeDefined();

      console.log(`✅ ${levelFile} parsing successful`);
    });
  }
});
