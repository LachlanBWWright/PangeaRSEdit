/**
 * Otto Matic Map Roundtrip Test
 *
 * Tests the complete roundtrip for Otto Matic terrain files:
 * Binary -> JSON -> Binary -> JSON
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { load } from "@lachlanbwwright/rsrcdump-ts";
import { saveToJsonObject, loadFromJson, saveToBytes, saveFromJson } from "@/rsrcdump-ts/rsrcdump";
import { ottoMaticSpecs } from "../../src/python/structSpecs/ottoMatic";
import { OttoGlobals } from "../../src/data/globals/globals";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";

describe("Otto Matic Map Roundtrip", () => {
  const testFilePath = join(
    __dirname,
    "../../public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc",
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

    // Check for expected resource types
    const expectedTypes = ["Hedr", "Atrb", "STgd", "Layr", "YCrd", "Itms"];
    for (const expectedType of expectedTypes) {
      expect(
        fork.tree.has(expectedType),
        `Missing resource type: ${expectedType}`,
      ).toBe(true);
    }
  });

  it("should parse to JSON with otto specs", async () => {
    if (!fileExists) return;

    const jsonResult = await saveToJsonObject(
      originalData,
      ottoMaticSpecs,
      [],
      [],
      true,
    );

    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;

    const jsonData = jsonResult.value;
    function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
      if (typeof x !== 'object' || x === null) throw new Error('Parsed data is not an object');
    }
    assertIsRecord(jsonData);
    assertIsRecord(jsonData.Hedr);
    assertIsRecord(jsonData.Hedr["1000"]);
    assertIsRecord(jsonData.Hedr["1000"].obj);

    expect(jsonData).toBeDefined();
    expect(jsonData._metadata).toBeDefined();
    expect(jsonData.Hedr).toBeDefined();
    expect(jsonData.Hedr["1000"]).toBeDefined();
    expect(jsonData.Hedr["1000"].obj).toBeDefined();

    // Verify header values
    const header = jsonData.Hedr["1000"].obj;
    expect(header.mapWidth).toBeGreaterThan(0);
    expect(header.mapHeight).toBeGreaterThan(0);
    expect(header.version).toBeDefined();

    console.log("Otto Matic Header:", {
      version: header.version,
      mapWidth: header.mapWidth,
      mapHeight: header.mapHeight,
      numItems: header.numItems,
      numSplines: header.numSplines,
      numFences: header.numFences,
    });
  });

  it("should apply preprocessing correctly", async () => {
    if (!fileExists) return;

    const jsonResult = await saveToJsonObject(
      originalData,
      ottoMaticSpecs,
      [],
      [],
      true,
    );

    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;

    const jsonData = jsonResult.value;

    // Preprocessing should not throw
    function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
      if (typeof x !== 'object' || x === null) {
        throw new Error('Parsed data is not an object');
      }
    }
    expect(() => {
      assertIsRecord(jsonData);
      preprocessJson(jsonData, OttoGlobals);
    }).not.toThrow();

    // After preprocessing, Layr should have sequential indices
    assertIsRecord(jsonData);
    if (jsonData.Layr && jsonData.Layr["1000"]?.obj) {
      const layrArr = jsonData.Layr["1000"].obj;
      // First few should be sequential after preprocessing
      expect(layrArr[0]).toBe(0);
      expect(layrArr[1]).toBe(1);
    }
  });

  it("should roundtrip without hex data (raw resource fork)", async () => {
    if (!fileExists) return;

    // Parse without otto specs (hex data only) for simpler roundtrip
    const jsonResult1 = await saveToJsonObject(originalData, [], [], [], false);
    expect(jsonResult1.ok).toBe(true);
    if (!jsonResult1.ok) return;
    const jsonData1 = jsonResult1.value;

    function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
      if (typeof x !== 'object' || x === null) throw new Error('Parsed data is not an object');
    }
    assertIsRecord(jsonData1);

    console.log("jsonData1 keys:", Object.keys(jsonData1));

    // Convert back to binary
    const forkResult = loadFromJson(jsonData1);
    if (!forkResult.ok) {
      console.error("loadFromJson error:", forkResult.error);
    }
    expect(forkResult.ok).toBe(true);
    if (!forkResult.ok) return;
    const fork = forkResult.value;

    console.log("fork resources size:", fork.tree.size);
    console.log("fork resources keys:", Array.from(fork.tree.keys()));

    const binaryData2 = saveToBytes(fork);
    console.log("binaryData2 length:", binaryData2.length);
    console.log(
      "First 16 bytes:",
      Array.from(binaryData2.slice(0, 16))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" "),
    );

    // Parse the new binary
    console.log("About to parse binary of length:", binaryData2.length);
    const loadResult = load(binaryData2);
    if (!loadResult.ok) {
      console.error("load error:", loadResult.error);
    } else {
      console.log("Loaded fork has", loadResult.value.tree.size, "types");
      console.log("Types:", Array.from(loadResult.value.tree.keys()));
    }

    const jsonResult2 = await saveToJsonObject(binaryData2, [], [], [], false);
    if (!jsonResult2.ok) {
      console.error("saveToJsonObject error 2:", jsonResult2.error);
    }
    expect(jsonResult2.ok).toBe(true);
    if (!jsonResult2.ok) return;
    const jsonData2 = jsonResult2.value;

    assertIsRecord(jsonData2);
    console.log("jsonData2 keys:", Object.keys(jsonData2));

    // Compare metadata safely
    const meta1 = jsonData1._metadata;
    const meta2 = jsonData2._metadata;
    function isRecord(value: unknown): value is Record<string, unknown> {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
    if (isRecord(meta1) && isRecord(meta2)) {
      expect(meta2.junk1).toBe(meta1.junk1);
      expect(meta2.junk2).toBe(meta1.junk2);
    }

    // Compare resource types
    const types1 = Object.keys(jsonData1)
      .filter((k) => k !== "_metadata")
      .sort();
    const types2 = Object.keys(jsonData2)
      .filter((k) => k !== "_metadata")
      .sort();
    expect(types2).toEqual(types1);

    // Compare hex data for a few key resources safely
    const hd1 = jsonData1.Hedr;
    const hd2 = jsonData2.Hedr;
    if (isRecord(hd1) && isRecord(hd2) && isRecord(hd1["1000"]) && isRecord(hd2["1000"])) {
      expect(hd2["1000"].data).toBe(hd1["1000"].data);
    }
    const al1 = jsonData1.alis;
    const al2 = jsonData2.alis;
    if (isRecord(al1) && isRecord(al2) && isRecord(al1["1000"]) && isRecord(al2["1000"])) {
      expect(al2["1000"].data).toBe(al1["1000"].data);
    }

    console.log("✅ Hex data roundtrip successful");
  });

  it.skip("should roundtrip with otto specs (structured data)", async () => {
    // Skip: JSON->Binary packing not implemented in StructConverter
    // This test will pass once pack() is implemented
    if (!fileExists) return;

    // Parse with otto specs
    const jsonResult1 = await saveToJsonObject(
      originalData,
      ottoMaticSpecs,
      [],
      [],
      true,
    );
    expect(jsonResult1.ok).toBe(true);
    if (!jsonResult1.ok) return;
    const jsonData1 = jsonResult1.value;

    // Convert back to binary
    const binaryResult = saveFromJson(jsonData1, ottoMaticSpecs, true);
    if (!binaryResult.ok) {
      console.error("saveFromJson error:", binaryResult.error);
    }
    expect(binaryResult.ok).toBe(true);
    if (!binaryResult.ok) return;
    const binaryData2 = binaryResult.value;

    // Parse the new binary
    const jsonResult2 = await saveToJsonObject(
      new Uint8Array(binaryData2),
      ottoMaticSpecs,
      [],
      [],
      true,
    );
    expect(jsonResult2.ok).toBe(true);
    if (!jsonResult2.ok) return;
    const jsonData2 = jsonResult2.value;

    // Compare header values safely
    function isRecord(value: unknown): value is Record<string, unknown> {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    let header1: Record<string, unknown> | undefined;
    let header2: Record<string, unknown> | undefined;
    if (isRecord(jsonData1) && isRecord(jsonData2)) {
      const h1 = jsonData1.Hedr;
      const h2 = jsonData2.Hedr;
      if (isRecord(h1) && isRecord(h2) && isRecord(h1["1000"]) && isRecord(h2["1000"])) {
        header1 = h1["1000"].obj as Record<string, unknown>;
        header2 = h2["1000"].obj as Record<string, unknown>;
      }
    }

    expect(header2?.version).toBe(header1?.version);
    expect(header2?.mapWidth).toBe(header1?.mapWidth);
    expect(header2?.mapHeight).toBe(header1?.mapHeight);
    expect(header2?.numItems).toBe(header1?.numItems);

    // Compare item counts
    let items1: unknown[] | undefined;
    let items2: unknown[] | undefined;
    if (isRecord(jsonData1) && isRecord(jsonData2)) {
      const i1 = jsonData1.Itms;
      const i2 = jsonData2.Itms;
      if (isRecord(i1) && isRecord(i2) && isRecord(i1["1000"]) && isRecord(i2["1000"])) {
        items1 = i1["1000"].obj as unknown[];
        items2 = i2["1000"].obj as unknown[];
      }
    }

    if (items1 && items2) {
      expect(items2.length).toBe(items1.length);

      // Compare first item
      if (items1.length > 0 && items2.length > 0) {
        function assertIsItem(x: unknown): asserts x is { x: number; z: number; type: number } {
          if (typeof x !== 'object' || x === null) throw new Error('Item is not an object');
          const r = x as Record<string, unknown>;
          if (typeof r.x !== 'number' || typeof r.z !== 'number' || typeof r.type !== 'number') {
            throw new Error('Item is missing numeric fields');
          }
        }
        assertIsItem(items1[0]);
        assertIsItem(items2[0]);
      }
    }

    console.log("✅ Structured data roundtrip successful");
  });

  it("should produce similar binary size", async () => {
    if (!fileExists) return;

    const jsonResult = await saveToJsonObject(originalData, [], [], [], false);
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;
    const jsonData = jsonResult.value;

    const binaryResult = saveFromJson(jsonData, [], false);
    expect(binaryResult.ok).toBe(true);
    if (!binaryResult.ok) return;
    const binaryData2 = binaryResult.value;

    const sizeRatio = binaryData2.length / originalData.length;

    console.log("Size comparison:", {
      original: originalData.length,
      roundtrip: binaryData2.length,
      ratio: sizeRatio.toFixed(4),
    });

    // Size should be reasonably close (within 20% for hex-only roundtrip)
    expect(sizeRatio).toBeGreaterThan(0.8);
    expect(sizeRatio).toBeLessThan(1.2);
  });

  it.skip("should preserve all resource types", async () => {
    // Skip: JSON->Binary packing not implemented in StructConverter
    // This test will pass once pack() is implemented
    if (!fileExists) return;

    const jsonResult1 = await saveToJsonObject(
      originalData,
      ottoMaticSpecs,
      [],
      [],
      true,
    );
    expect(jsonResult1.ok).toBe(true);
    if (!jsonResult1.ok) return;
    const jsonData1 = jsonResult1.value;

    const binaryResult = saveFromJson(jsonData1, ottoMaticSpecs, true);
    expect(binaryResult.ok).toBe(true);
    if (!binaryResult.ok) return;
    const binaryData2 = binaryResult.value;

    const fork2Result = load(new Uint8Array(binaryData2));
    expect(fork2Result.ok).toBe(true);
    if (!fork2Result.ok) return;
    const fork2 = fork2Result.value;

    const fork1Result = load(originalData);
    expect(fork1Result.ok).toBe(true);
    if (!fork1Result.ok) return;
    const fork1 = fork1Result.value;

    // Compare resource type counts
    expect(fork2.tree.size).toBe(fork1.tree.size);

    // Compare each type's resource count
    for (const [typeName, resources1] of fork1.tree) {
      const resources2 = fork2.tree.get(typeName);
      expect(
        resources2,
        `Missing resource type after roundtrip: ${typeName}`,
      ).toBeDefined();
      if (resources2) {
        expect(resources2.size).toBe(resources1.size);
      }
    }

    console.log("✅ All resource types preserved");
  });
});
