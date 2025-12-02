/**
 * Otto Matic Map Roundtrip Test
 *
 * Tests the complete roundtrip for Otto Matic terrain files:
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
import { ottoMaticSpecs } from "../../src/python/structSpecs/ottoMatic";
import { OttoGlobals } from "../../src/data/globals/globals";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";

describe("Otto Matic Map Roundtrip", () => {
  const testFilePath = join(
    __dirname,
    "../../../games/ottomatic/Data/Terrain/EarthFarm.ter.rsrc",
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

    const fork = load(originalData);

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
  });

  it("should parse to JSON with otto specs", () => {
    if (!fileExists) return;

    const jsonData = saveToJsonObject(
      originalData,
      ottoMaticSpecs,
      [],
      [],
      true,
    );

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

  it("should apply preprocessing correctly", () => {
    if (!fileExists) return;

    const jsonData = saveToJsonObject(
      originalData,
      ottoMaticSpecs,
      [],
      [],
      true,
    );

    // Preprocessing should not throw
    expect(() => {
      preprocessJson(jsonData as any, OttoGlobals);
    }).not.toThrow();

    // After preprocessing, Layr should have sequential indices
    if (jsonData.Layr && jsonData.Layr["1000"]?.obj) {
      const layrArr = jsonData.Layr["1000"].obj;
      // First few should be sequential after preprocessing
      expect(layrArr[0]).toBe(0);
      expect(layrArr[1]).toBe(1);
    }
  });

  it("should roundtrip without hex data (raw resource fork)", () => {
    if (!fileExists) return;

    // Parse without otto specs (hex data only) for simpler roundtrip
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
    expect(jsonData2._metadata?.junk2).toBe(jsonData1._metadata?.junk2);

    // Compare resource types
    const types1 = Object.keys(jsonData1)
      .filter((k) => k !== "_metadata")
      .sort();
    const types2 = Object.keys(jsonData2)
      .filter((k) => k !== "_metadata")
      .sort();
    expect(types2).toEqual(types1);

    // Compare hex data for a few key resources
    expect(jsonData2.Hedr?.["1000"]?.data).toBe(jsonData1.Hedr?.["1000"]?.data);
    expect(jsonData2.alis?.["1000"]?.data).toBe(jsonData1.alis?.["1000"]?.data);

    console.log("✅ Hex data roundtrip successful");
  });

  it("should roundtrip with otto specs (structured data)", () => {
    if (!fileExists) return;

    // Parse with otto specs
    const jsonData1 = saveToJsonObject(
      originalData,
      ottoMaticSpecs,
      [],
      [],
      true,
    );

    // Convert back to binary
    const binaryData2 = saveFromJson(jsonData1, ottoMaticSpecs, true);

    // Parse the new binary
    const jsonData2 = saveToJsonObject(
      new Uint8Array(binaryData2),
      ottoMaticSpecs,
      [],
      [],
      true,
    );

    // Compare header values
    const header1 = jsonData1.Hedr?.["1000"]?.obj;
    const header2 = jsonData2.Hedr?.["1000"]?.obj;

    expect(header2?.version).toBe(header1?.version);
    expect(header2?.mapWidth).toBe(header1?.mapWidth);
    expect(header2?.mapHeight).toBe(header1?.mapHeight);
    expect(header2?.numItems).toBe(header1?.numItems);

    // Compare item counts
    const items1 = jsonData1.Itms?.["1000"]?.obj;
    const items2 = jsonData2.Itms?.["1000"]?.obj;

    if (items1 && items2) {
      expect(items2.length).toBe(items1.length);

      // Compare first item
      if (items1.length > 0) {
        expect(items2[0].x).toBe(items1[0].x);
        expect(items2[0].z).toBe(items1[0].z);
        expect(items2[0].type).toBe(items1[0].type);
      }
    }

    console.log("✅ Structured data roundtrip successful");
  });

  it("should produce similar binary size", () => {
    if (!fileExists) return;

    const jsonData = saveToJsonObject(originalData, [], [], [], false);
    const binaryData2 = saveFromJson(jsonData, [], false);

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

  it("should preserve all resource types", () => {
    if (!fileExists) return;

    const jsonData1 = saveToJsonObject(
      originalData,
      ottoMaticSpecs,
      [],
      [],
      true,
    );
    const binaryData2 = saveFromJson(jsonData1, ottoMaticSpecs, true);
    const fork2 = load(new Uint8Array(binaryData2));

    const fork1 = load(originalData);

    // Compare resource type counts
    expect(fork2.resources.size).toBe(fork1.resources.size);

    // Compare each type's resource count
    for (const [typeName, resources1] of fork1.resources) {
      const resources2 = fork2.resources.get(typeName);
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
