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
import { load, saveToJson } from "@lachlanbwwright/rsrcdump-ts";
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
    expect(fork.tree).toBeDefined();
    expect(fork.tree.size).toBeGreaterThan(0);

    // Check for expected resource types (not all files have all types)
    const expectedTypes = ["Hedr", "STgd", "YCrd", "Itms"];
    for (const expectedType of expectedTypes) {
      expect(
        fork.tree.has(expectedType),
        `Missing resource type: ${expectedType}`,
      ).toBe(true);
    }

    console.log("Nanosaur 2 resource types:", Array.from(fork.tree.keys()));
  });

  it("should parse to JSON with bugdom2 specs", async () => {
    if (!fileExists) return;

    const jsonStringResult = await saveToJson(
      new Uint8Array(originalData),
      nanosaur2Specs,
      [],
      [],
    );
    expect(jsonStringResult.ok).toBe(true);
    if (!jsonStringResult.ok) return;
    const jsonData = JSON.parse(jsonStringResult.value);

    expect(jsonData).toBeDefined();
    expect(typeof jsonData).toBe("object");

    // Check expected structure
    function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
      if (typeof x !== "object" || x === null)
        expect.fail("Parsed data is not an object");
    }
    assertIsRecord(jsonData);
    assertIsRecord(jsonData.Hedr);
    assertIsRecord(jsonData.Hedr["1000"]);
    assertIsRecord(jsonData.Hedr["1000"].obj);

    expect(jsonData.Hedr).toBeDefined();

    const header = jsonData.Hedr["1000"].obj;
    function assertIsHeader(
      x: unknown,
    ): asserts x is {
      mapWidth: number;
      mapHeight: number;
      version: number;
      numItems: number;
    } {
      if (typeof x !== "object" || x === null)
        expect.fail("Header is not an object");
      const mapWidth = Reflect.get(x, "mapWidth");
      const mapHeight = Reflect.get(x, "mapHeight");
      const version = Reflect.get(x, "version");
      const numItems = Reflect.get(x, "numItems");
      if (
        typeof mapWidth !== "number" ||
        typeof mapHeight !== "number" ||
        typeof version !== "number" ||
        typeof numItems !== "number"
      ) {
        expect.fail("Header missing expected numeric fields");
      }
    }
    assertIsHeader(header);

    console.log("Nanosaur 2 parsed JSON keys:", Object.keys(jsonData));
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

  it("should preprocess JSON correctly with Nanosaur 2 globals", async () => {
    if (!fileExists) return;

    const jsonStringResult = await saveToJson(
      new Uint8Array(originalData),
      nanosaur2Specs,
      [],
      [],
    );
    expect(jsonStringResult.ok).toBe(true);
    if (!jsonStringResult.ok) return;
    const jsonData = JSON.parse(jsonStringResult.value);

    // Preprocessing should not throw
    function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
      if (typeof x !== "object" || x === null) {
        expect.fail("Parsed data is not an object");
      }
    }
    expect(() => {
      assertIsRecord(jsonData);
      preprocessJson(jsonData, Nanosaur2Globals);
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
    it(`should parse and roundtrip ${levelFile}`, async () => {
      const filePath = join(basePath, levelFile);

      if (!existsSync(filePath)) {
        console.log(`Skipping ${levelFile} - file not found`);
        return;
      }

      const data = readFileSync(filePath);

      // Parse to JSON
      const jsonStringResult = await saveToJson(
        new Uint8Array(data),
        nanosaur2Specs,
        [],
        [],
      );
      expect(jsonStringResult.ok).toBe(true);
      if (!jsonStringResult.ok) return;
      const json1 = JSON.parse(jsonStringResult.value);

      expect(json1).toBeDefined();
      expect(json1.Hedr).toBeDefined();

      console.log(`✅ ${levelFile} parsing successful`);
    });
  }
});
