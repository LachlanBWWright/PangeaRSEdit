/**
 * Bugdom 2 Map Roundtrip Test
 *
 * Tests the complete roundtrip for Bugdom 2 terrain files:
 * Binary -> JSON -> Binary -> JSON
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
import { bugdom2Specs } from "../../src/python/structSpecs/bugdom2";
import { Bugdom2Globals } from "../../src/data/globals/globals";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";

describe("Bugdom 2 Map Roundtrip", () => {
  const testFilePath = join(
    __dirname,
    "../../public/assets/bugdom2/terrain/Level1_Garden.ter.rsrc",
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

    // Check for expected resource types (Atrb may not exist in all files)
    const expectedTypes = ["Hedr", "STgd", "Layr", "YCrd", "Itms"];
    for (const expectedType of expectedTypes) {
      expect(
        fork.resources.has(expectedType),
        `Missing resource type: ${expectedType}`,
      ).toBe(true);
    }

    console.log("Bugdom 2 resource types:", Array.from(fork.resources.keys()));
  });

  it("should parse to JSON with bugdom2 specs", () => {
    if (!fileExists) return;

    const jsonResult = saveToJsonObject(
      originalData,
      bugdom2Specs,
      [],
      [],
      true,
    );
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;
    const jsonData = jsonResult.value;

    expect(jsonData).toBeDefined();
    expect(jsonData._metadata).toBeDefined();
    expect(jsonData.Hedr).toBeDefined();
    expect(jsonData.Hedr["1000"]).toBeDefined();
    expect(jsonData.Hedr["1000"].obj).toBeDefined();

    const header = jsonData.Hedr["1000"].obj;
    expect(header.mapWidth).toBeGreaterThan(0);
    expect(header.mapHeight).toBeGreaterThan(0);

    console.log("Bugdom 2 Header:", {
      version: header.version,
      mapWidth: header.mapWidth,
      mapHeight: header.mapHeight,
      numItems: header.numItems,
    });
  });

  it("should apply preprocessing correctly", () => {
    if (!fileExists) return;

    const jsonResult = saveToJsonObject(
      originalData,
      bugdom2Specs,
      [],
      [],
      true,
    );
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;
    const jsonData = jsonResult.value;

    expect(() => {
      preprocessJson(jsonData, Bugdom2Globals);
    }).not.toThrow();
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

    expect(jsonData2._metadata?.junk1).toBe(jsonData1._metadata?.junk1);

    const types1 = Object.keys(jsonData1)
      .filter((k) => k !== "_metadata")
      .sort();
    const types2 = Object.keys(jsonData2)
      .filter((k) => k !== "_metadata")
      .sort();
    expect(types2).toEqual(types1);

    expect(jsonData2.Hedr?.["1000"]?.data).toBe(jsonData1.Hedr?.["1000"]?.data);

    console.log("✅ Bugdom 2 hex data roundtrip successful");
  });

  it.skip("should roundtrip with bugdom2 specs (structured data)", () => {
    // Skip: StructConverter.pack not implemented
  });

  it("should produce similar binary size", () => {
    if (!fileExists) return;

    const jsonResult = saveToJsonObject(originalData, [], [], [], false);
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

    expect(sizeRatio).toBeGreaterThan(0.8);
    expect(sizeRatio).toBeLessThan(1.2);
  });

  it.skip("should preserve all resource types", () => {
    // Skip: StructConverter.pack not implemented
  });
});
