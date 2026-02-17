/**
 * Cro-Mag Rally Map Roundtrip Test
 *
 * Tests the complete roundtrip for Cro-Mag Rally terrain files:
 * Binary -> JSON -> Binary -> JSON
 *
 * Note: Cro-Mag Rally uses a similar format to Otto Matic but with numPaths
 * instead of numWaterPatches in the header.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  load,
  saveToJson,
  loadBytesFromJsonAsync,
} from "@lachlanbwwright/rsrcdump-ts";
import { croMagSpecs } from "../../src/python/structSpecs/croMag";
import { CroMagGlobals } from "../../src/data/globals/globals";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";

describe("Cro-Mag Rally Map Roundtrip", () => {
  const testFilePath = join(
    __dirname,
    "../../public/assets/croMag/terrain/StoneAge_Desert.ter.rsrc",
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

    console.log("Cro-Mag Rally resource types:", Array.from(fork.tree.keys()));
  });

  it("should parse to JSON with cro-mag specs", async () => {
    if (!fileExists) return;

    const jsonStringResult = await saveToJson(
      new Uint8Array(originalData),
      croMagSpecs,
      [],
      [],
    );
    expect(jsonStringResult.ok).toBe(true);
    if (!jsonStringResult.ok) return;
    const jsonData = JSON.parse(jsonStringResult.value);

    function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
      if (typeof x !== "object" || x === null)
        throw new Error("Parsed data is not an object");
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

    const header = jsonData.Hedr["1000"].obj;
    expect(header.mapWidth).toBeGreaterThan(0);
    expect(header.mapHeight).toBeGreaterThan(0);

    console.log("Cro-Mag Rally Header:", {
      version: header.version,
      mapWidth: header.mapWidth,
      mapHeight: header.mapHeight,
      numItems: header.numItems,
    });
  });

  it("should apply preprocessing correctly", async () => {
    if (!fileExists) return;

    const jsonStringResult = await saveToJson(
      new Uint8Array(originalData),
      croMagSpecs,
      [],
      [],
    );
    expect(jsonStringResult.ok).toBe(true);
    if (!jsonStringResult.ok) return;
    const jsonData = JSON.parse(jsonStringResult.value);

    function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
      if (typeof x !== "object" || x === null) {
        throw new Error("Parsed data is not an object");
      }
    }
    expect(() => {
      assertIsRecord(jsonData);
      preprocessJson(jsonData, CroMagGlobals);
    }).not.toThrow();
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
    if (isRecord(jsonData1) && isRecord(jsonData2)) {
      const meta1 = jsonData1._metadata;
      const meta2 = jsonData2._metadata;
      if (isRecord(meta1) && isRecord(meta2)) {
        expect(meta2.junk1).toBe(meta1.junk1);
      }

      const types1 = Object.keys(jsonData1)
        .filter((k) => k !== "_metadata")
        .sort();
      const types2 = Object.keys(jsonData2)
        .filter((k) => k !== "_metadata")
        .sort();
      expect(types2).toEqual(types1);

      // Compare hex data for header safely
      const hd1 = jsonData1.Hedr;
      const hd2 = jsonData2.Hedr;
      if (
        isRecord(hd1) &&
        isRecord(hd2) &&
        isRecord(hd1["1000"]) &&
        isRecord(hd2["1000"])
      ) {
        expect(hd2["1000"].data).toBe(hd1["1000"].data);
      }
    }

    console.log("✅ Cro-Mag Rally hex data roundtrip successful");
  });

  it.skip("should roundtrip with cro-mag specs (structured data)", () => {
    // Skip: StructConverter.pack not implemented
  });

  it("should produce similar binary size", async () => {
    if (!fileExists) return;

    const jsonStringResult = await saveToJson(
      new Uint8Array(originalData),
      [],
      [],
      [],
    );
    expect(jsonStringResult.ok).toBe(true);
    if (!jsonStringResult.ok) return;
    const jsonData = JSON.parse(jsonStringResult.value);

    const bytesResult = await loadBytesFromJsonAsync(jsonData, [], [], []);
    expect(bytesResult.ok).toBe(true);
    if (!bytesResult.ok) return;
    const binaryData2 = bytesResult.value;

    const sizeRatio = binaryData2.length / originalData.length;

    console.log("Size comparison:", {
      original: originalData.length,
      roundtrip: binaryData2.length,
      ratio: sizeRatio.toFixed(4),
    });

    expect(sizeRatio).toBeGreaterThan(0.8);
    expect(sizeRatio).toBeLessThan(1.2);
  });

  it.skip("should preserve all resource types", () => {
    // Skip: StructConverter.pack not implemented
  });
});
