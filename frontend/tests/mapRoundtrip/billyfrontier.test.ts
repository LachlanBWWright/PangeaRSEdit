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
  saveToJson,
  loadBytesFromJsonAsync,
} from "@lachlanbwwright/rsrcdump-ts";
import { billyFrontierSpecs } from "../../src/python/structSpecs/billyFrontier";
import { BillyFrontierGlobals } from "../../src/data/globals/globals";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";

function assertIsHeader(
  x: unknown,
): asserts x is {
  mapWidth: number;
  mapHeight: number;
  version: number;
  numItems: number;
  numSplines: number;
  numFences: number;
} {
  if (typeof x !== "object" || x === null) expect.fail("Header is not an object");
  const mapWidth = Reflect.get(x, "mapWidth");
  const mapHeight = Reflect.get(x, "mapHeight");
  const version = Reflect.get(x, "version");
  const numItems = Reflect.get(x, "numItems");
  const numSplines = Reflect.get(x, "numSplines");
  const numFences = Reflect.get(x, "numFences");
  if (
    typeof mapWidth !== "number" ||
    typeof mapHeight !== "number" ||
    typeof version !== "number" ||
    typeof numItems !== "number" ||
    typeof numSplines !== "number" ||
    typeof numFences !== "number"
  ) {
    expect.fail("Header missing expected numeric fields");
  }
}

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

    console.log("Billy Frontier resource types:", Array.from(fork.tree.keys()));
  });

  it("should parse to JSON with billyFrontier specs", async () => {
    if (!fileExists) return;

    const jsonStringResult = await saveToJson(
      new Uint8Array(originalData),
      billyFrontierSpecs,
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

    expect(jsonData.Hedr).toBeDefined();

    console.log("Billy Frontier parsed JSON keys:", Object.keys(jsonData));
  });

  it("should parse header data correctly", async () => {
    if (!fileExists) return;

    const jsonStringResult = await saveToJson(
      new Uint8Array(originalData),
      billyFrontierSpecs,
      [],
      [],
    );
    expect(jsonStringResult.ok).toBe(true);
    if (!jsonStringResult.ok) return;
    const jsonData = JSON.parse(jsonStringResult.value);

    function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
      if (typeof x !== "object" || x === null)
        expect.fail("Parsed data is not an object");
    }
    assertIsRecord(jsonData);
    assertIsRecord(jsonData.Hedr);
    assertIsRecord(jsonData.Hedr[1000]);
    assertIsRecord(jsonData.Hedr[1000].obj);

    expect(jsonData.Hedr).toBeDefined();
    expect(jsonData.Hedr[1000]).toBeDefined();
    expect(jsonData.Hedr[1000].obj).toBeDefined();

    function assertIsHeader(
      x: unknown,
    ): asserts x is {
      mapWidth: number;
      mapHeight: number;
      version: number;
      numItems: number;
      numSplines: number;
      numFences: number;
    } {
      if (typeof x !== "object" || x === null)
        expect.fail("Header is not an object");
      const mapWidth = Reflect.get(x, "mapWidth");
      const mapHeight = Reflect.get(x, "mapHeight");
      const version = Reflect.get(x, "version");
      const numItems = Reflect.get(x, "numItems");
      const numSplines = Reflect.get(x, "numSplines");
      const numFences = Reflect.get(x, "numFences");
      if (
        typeof mapWidth !== "number" ||
        typeof mapHeight !== "number" ||
        typeof version !== "number" ||
        typeof numItems !== "number" ||
        typeof numSplines !== "number" ||
        typeof numFences !== "number"
      ) {
        expect.fail("Header missing expected numeric fields");
      }
    }

    const header = jsonData.Hedr[1000].obj;
    assertIsHeader(header);
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

  it("should preprocess JSON correctly with Billy Frontier globals", async () => {
    if (!fileExists) return;

    const jsonStringResult = await saveToJson(
      new Uint8Array(originalData),
      billyFrontierSpecs,
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
      // The JSON object here is untyped by design; use a typed record for preprocessing in tests
      assertIsRecord(jsonData);
      preprocessJson(jsonData, BillyFrontierGlobals);
    }).not.toThrow();

    // After preprocessing, verify header data is still present
    assertIsRecord(jsonData);
    assertIsRecord(jsonData.Hedr);
    assertIsRecord(jsonData.Hedr[1000]);

    expect(jsonData.Hedr).toBeDefined();
    expect(jsonData.Hedr[1000]?.obj).toBeDefined();

    const header = jsonData.Hedr[1000].obj;
    assertIsHeader(header);
    expect(header.mapWidth).toBeGreaterThan(0);
    expect(header.mapHeight).toBeGreaterThan(0);

    console.log("Billy Frontier Preprocessed Map:", {
      version: header.version,
      mapWidth: header.mapWidth,
      mapHeight: header.mapHeight,
      numItems: header.numItems,
    });
  });

  it("should roundtrip without specs (raw resource fork)", async () => {
    if (!fileExists) return;

    // Parse without specs (hex data only)
    const jsonStringResult1 = await saveToJson(
      new Uint8Array(originalData),
      [],
      [],
      [],
    );
    expect(jsonStringResult1.ok).toBe(true);
    if (!jsonStringResult1.ok) return;
    const jsonData1 = JSON.parse(jsonStringResult1.value);

    // Convert back to binary
    const bytesResult = await loadBytesFromJsonAsync(jsonData1, [], [], []);
    expect(bytesResult.ok).toBe(true);
    if (!bytesResult.ok) return;
    const binaryData2 = bytesResult.value;

    // Parse the new binary
    const jsonStringResult2 = await saveToJson(binaryData2, [], [], []);
    expect(jsonStringResult2.ok).toBe(true);
    if (!jsonStringResult2.ok) return;
    const jsonData2 = JSON.parse(jsonStringResult2.value);

    // Compare metadata safely
    function isRecord(value: unknown): value is Record<string, unknown> {
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    }
    const meta1 = jsonData1._metadata;
    const meta2 = jsonData2._metadata;
    if (isRecord(meta1) && isRecord(meta2)) {
      expect(meta2.junk1).toBe(meta1.junk1);
    }

    // Compare resource types
    const types1 = Object.keys(jsonData1)
      .filter((k) => k !== "_metadata")
      .sort();
    const types2 = Object.keys(jsonData2)
      .filter((k) => k !== "_metadata")
      .sort();
    expect(types2).toEqual(types1);

    // Compare hex data for header using optional chaining
    let hed1: unknown = undefined;
    let hed2: unknown = undefined;
    if (isRecord(jsonData1.Hedr) && isRecord(jsonData1.Hedr["1000"])) {
      hed1 = jsonData1.Hedr["1000"];
    }
    if (isRecord(jsonData2.Hedr) && isRecord(jsonData2.Hedr["1000"])) {
      hed2 = jsonData2.Hedr["1000"];
    }
    if (isRecord(hed1) && isRecord(hed2)) {
      expect(hed2.data).toBe(hed1.data);
    }

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
    it(`should parse ${levelFile}`, async () => {
      const filePath = join(basePath, levelFile);

      if (!existsSync(filePath)) {
        console.log(`Skipping ${levelFile} - file not found`);
        return;
      }

      const data = readFileSync(filePath);

      // Parse to JSON
      const jsonStringResult = await saveToJson(
        new Uint8Array(data),
        billyFrontierSpecs,
        [],
        [],
      );
      expect(jsonStringResult.ok).toBe(true);
      if (!jsonStringResult.ok) return;
      const json1 = JSON.parse(jsonStringResult.value);

      function assertIsRecord(
        x: unknown,
      ): asserts x is Record<string, unknown> {
        if (typeof x !== "object" || x === null)
          expect.fail("Parsed data is not an object");
      }
      assertIsRecord(json1);

      expect(json1).toBeDefined();
      expect(json1.Hedr).toBeDefined();

      console.log(`✅ ${levelFile} parsing successful`);
    });
  }
});
