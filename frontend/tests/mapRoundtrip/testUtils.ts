/**
 * Shared utilities for map roundtrip tests
 */

import { describe, expect, it, beforeAll } from "vitest";
import { readFile, access } from "fs/promises";
import { ottoMaticLevel } from "../../src/python/structSpecs/ottoMaticInterface";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";
import { GlobalsInterface } from "../../src/data/globals/globals";
import {
  compareLevelData,
  compareBuffers,
} from "../../src/data/mapRoundtrip/parseLevel";

/**
 * Read a file as ArrayBuffer
 */
export async function readFileAsBuffer(filePath: string): Promise<ArrayBuffer> {
  const buffer = await readFile(filePath);
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
  return arrayBuffer;
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Interface for mock pyodide runner for testing
 */
export interface MockPyodideRunner {
  parseBuffer: (
    buffer: ArrayBuffer,
    specs: string[],
  ) => Promise<ottoMaticLevel>;
  serializeJson: (
    json: ottoMaticLevel,
    specs: string[],
  ) => Promise<ArrayBuffer>;
}

/**
 * Compare two JSON objects and return differences
 */
export function compareJsonObjects(
  original: ottoMaticLevel,
  roundtrip: ottoMaticLevel,
): {
  equal: boolean;
  differences: { path: string; original: unknown; roundtrip: unknown }[];
} {
  return compareLevelData(original, roundtrip);
}

/**
 * Compare two buffers and return comparison result
 */
export function compareBinaryBuffers(
  original: ArrayBuffer,
  roundtrip: ArrayBuffer,
): {
  equal: boolean;
  sizeDiff: number;
  firstDifferenceOffset: number | null;
  differenceCount: number;
} {
  return compareBuffers(original, roundtrip);
}

/**
 * Create a test suite for a game's map roundtrip
 * This is a factory function that creates the test suite with the given configuration
 */
export function createMapRoundtripTestSuite(config: {
  gameName: string;
  globals: GlobalsInterface;
  terrainRsrcPath: string | null;
  terrainTerPath: string | null;
  parseBuffer: (
    buffer: ArrayBuffer,
    specs: string[],
  ) => Promise<ottoMaticLevel>;
  serializeJson: (
    json: ottoMaticLevel,
    specs: string[],
  ) => Promise<ArrayBuffer>;
  skipRoundtrip?: boolean; // Some games may not support full roundtrip yet
}) {
  const {
    gameName,
    globals,
    terrainRsrcPath,
    // terrainTerPath (unused in tests)
    parseBuffer,
    serializeJson,
    skipRoundtrip = false,
  } = config;

  describe(`${gameName} Map Roundtrip`, () => {
    let terrainRsrcBuffer: ArrayBuffer | null = null;
    // ter-format buffer not currently used in tests; keep as reference if future tests need it

    beforeAll(async () => {
      // Load terrain files if they exist
      if (terrainRsrcPath && (await fileExists(terrainRsrcPath))) {
        terrainRsrcBuffer = await readFileAsBuffer(terrainRsrcPath);
      }
      // We currently only use terrainRsrcPath for roundtrip tests. ter-path kept for future.
    });

    it("should have valid terrain data file", () => {
      if (terrainRsrcPath) {
        expect(terrainRsrcBuffer).not.toBeNull();
        if (terrainRsrcBuffer) {
          expect(terrainRsrcBuffer.byteLength).toBeGreaterThan(0);
        }
      }
    });

    it("should parse terrain data to JSON", async () => {
      if (!terrainRsrcBuffer) {
        console.warn(`Skipping ${gameName} parse test - no terrain file`);
        return;
      }

      const jsonData = await parseBuffer(
        terrainRsrcBuffer,
        globals.STRUCT_SPECS,
      );

      // Basic structure checks
      expect(jsonData).toBeDefined();
      expect(jsonData.Hedr).toBeDefined();
      expect(jsonData.Hedr[1000]).toBeDefined();
      expect(jsonData.Hedr[1000].obj).toBeDefined();

      // Check header fields
      const header = jsonData.Hedr[1000].obj;
      expect(header.mapWidth).toBeGreaterThan(0);
      expect(header.mapHeight).toBeGreaterThan(0);
    });

    it("should apply preprocessing without errors", async () => {
      if (!terrainRsrcBuffer) {
        console.warn(`Skipping ${gameName} preprocess test - no terrain file`);
        return;
      }

      const jsonData = await parseBuffer(
        terrainRsrcBuffer,
        globals.STRUCT_SPECS,
      );

      // This should not throw; for the preprocessor we only need a Record-like shape
      function assertIsRecord(
        x: unknown,
      ): asserts x is Record<string, unknown> {
        if (typeof x !== "object" || x === null) {
          throw new Error("Parsed data is not an object");
        }
      }
      expect(() => {
        const jsonUnknown: unknown = jsonData as unknown;
        assertIsRecord(jsonUnknown);
        preprocessJson(jsonUnknown, globals);
      }).not.toThrow();
    });

    if (!skipRoundtrip) {
      it("should serialize JSON back to binary", async () => {
        if (!terrainRsrcBuffer) {
          console.warn(`Skipping ${gameName} serialize test - no terrain file`);
          return;
        }

        const jsonData = await parseBuffer(
          terrainRsrcBuffer,
          globals.STRUCT_SPECS,
        );
        const serializedBuffer = await serializeJson(
          jsonData,
          globals.STRUCT_SPECS,
        );

        expect(serializedBuffer).toBeDefined();
        expect(serializedBuffer.byteLength).toBeGreaterThan(0);
      });

      it("should roundtrip: parse -> serialize -> parse should produce equivalent JSON", async () => {
        if (!terrainRsrcBuffer) {
          console.warn(`Skipping ${gameName} roundtrip test - no terrain file`);
          return;
        }

        // Parse original
        const originalJson = await parseBuffer(
          terrainRsrcBuffer,
          globals.STRUCT_SPECS,
        );

        // Serialize
        const serializedBuffer = await serializeJson(
          originalJson,
          globals.STRUCT_SPECS,
        );

        // Parse again
        const roundtripJson = await parseBuffer(
          serializedBuffer,
          globals.STRUCT_SPECS,
        );

        // Compare
        const comparison = compareJsonObjects(originalJson, roundtripJson);

        if (!comparison.equal) {
          console.log(
            `${gameName} JSON differences:`,
            comparison.differences.slice(0, 10),
          );
        }

        expect(comparison.equal).toBe(true);
      });

      it("should produce binary output similar in size to original", async () => {
        if (!terrainRsrcBuffer) {
          console.warn(`Skipping ${gameName} size test - no terrain file`);
          return;
        }

        const jsonData = await parseBuffer(
          terrainRsrcBuffer,
          globals.STRUCT_SPECS,
        );
        const serializedBuffer = await serializeJson(
          jsonData,
          globals.STRUCT_SPECS,
        );

        // Allow for some size variation due to format differences
        const sizeDiff = Math.abs(
          terrainRsrcBuffer.byteLength - serializedBuffer.byteLength,
        );
        const sizeRatio =
          serializedBuffer.byteLength / terrainRsrcBuffer.byteLength;

        console.log(`${gameName} size comparison:`, {
          original: terrainRsrcBuffer.byteLength,
          roundtrip: serializedBuffer.byteLength,
          diff: sizeDiff,
          ratio: sizeRatio.toFixed(4),
        });

        // Size should be within 10% of original
        expect(sizeRatio).toBeGreaterThan(0.9);
        expect(sizeRatio).toBeLessThan(1.1);
      });
    }
  });
}
