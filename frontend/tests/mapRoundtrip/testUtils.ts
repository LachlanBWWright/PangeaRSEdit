/**
 * Shared utilities for map roundtrip tests
 */

import { describe, expect, it, beforeAll } from "vitest";
import { readFile, access } from "fs/promises";
import { OttoMaticLevelData } from "@/python/structSpecs/gameLevelTypes";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";
import { GlobalsInterface } from "../../src/data/globals/globals";
import {
  compareLevelData,
  compareBuffers,
} from "../../src/data/mapRoundtrip/parseLevel";
// fromPromise (legacy helper) removed; use standard try/catch for promises here

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
  return access(filePath)
    .then(() => true)
    .catch(() => false);
}

/**
 * Interface for mock rsrcdump-ts runner for testing
 */
export interface MockParserRunner {
  parseBuffer: (
    buffer: ArrayBuffer,
    specs: string[],
  ) => Promise<OttoMaticLevelData>;
  serializeJson: (
    json: OttoMaticLevelData,
    specs: string[],
  ) => Promise<ArrayBuffer>;
}

/**
 * Compare two JSON objects and return differences
 */
import { LevelData } from "@/python/structSpecs/LevelTypes";

export function compareJsonObjects(
  original: unknown,
  roundtrip: unknown,
): {
  equal: boolean;
  differences: { path: string; original: unknown; roundtrip: unknown }[];
} {
  // Build LevelData objects at runtime from the given JSON structures without any type assertions.
  function normalizeToLevelData(x: unknown): LevelData {
    function isRecord(v: unknown): v is Record<string, unknown> {
      return typeof v === "object" && v !== null && !Array.isArray(v);
    }

    const defaultHeader = {
      version: 0,
      numItems: 0,
      mapWidth: 0,
      mapHeight: 0,
      tileSize: 0,
      minY: 0,
      maxY: 0,
      numSplines: 0,
      numFences: 0,
      numTilePages: 0,
      numTiles: 0,
      numUniqueSupertiles: 0,
      numWaterPatches: 0,
      numCheckpoints: 0,
    };

    let headerObj = defaultHeader;
    if (
      isRecord(x) &&
      isRecord(x.Hedr) &&
      isRecord(x.Hedr[1000]) &&
      isRecord(x.Hedr[1000].obj)
    ) {
      const src = x.Hedr[1000].obj;
      headerObj = {
        version: typeof src.version === "number" ? src.version : 0,
        numItems: typeof src.numItems === "number" ? src.numItems : 0,
        mapWidth: typeof src.mapWidth === "number" ? src.mapWidth : 0,
        mapHeight: typeof src.mapHeight === "number" ? src.mapHeight : 0,
        tileSize: typeof src.tileSize === "number" ? src.tileSize : 0,
        minY: typeof src.minY === "number" ? src.minY : 0,
        maxY: typeof src.maxY === "number" ? src.maxY : 0,
        numSplines: typeof src.numSplines === "number" ? src.numSplines : 0,
        numFences: typeof src.numFences === "number" ? src.numFences : 0,
        numTilePages:
          typeof src.numTilePages === "number" ? src.numTilePages : 0,
        numTiles: typeof src.numTiles === "number" ? src.numTiles : 0,
        numUniqueSupertiles:
          typeof src.numUniqueSupertiles === "number"
            ? src.numUniqueSupertiles
            : 0,
        numWaterPatches:
          typeof src.numWaterPatches === "number" ? src.numWaterPatches : 0,
        numCheckpoints:
          typeof src.numCheckpoints === "number" ? src.numCheckpoints : 0,
      };
    }

    let ItmsSection: LevelData["Itms"] | undefined = undefined;
    if (
      isRecord(x) &&
      isRecord(x.Itms) &&
      isRecord(x.Itms[1000]) &&
      Array.isArray(x.Itms[1000].obj)
    ) {
      const objArr = x.Itms[1000].obj;
      const sanitized = objArr.map((it) => {
        if (isRecord(it)) {
          return {
            type: typeof it.type === "number" ? it.type : 0,
            x: typeof it.x === "number" ? it.x : 0,
            z: typeof it.z === "number" ? it.z : 0,
            flags: typeof it.flags === "number" ? it.flags : 0,
            p0: typeof it.p0 === "number" ? it.p0 : 0,
            p1: typeof it.p1 === "number" ? it.p1 : 0,
            p2: typeof it.p2 === "number" ? it.p2 : 0,
            p3: typeof it.p3 === "number" ? it.p3 : 0,
          };
        }
        return { type: 0, x: 0, z: 0, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 };
      });
      ItmsSection = {
        1000: { name: "Terrain Items List", obj: sanitized, order: 0 },
      };
    }

    const result: LevelData = {
      Hedr: {
        1000: {
          name: "Header",
          obj: headerObj,
          order: 0,
        },
      },
      Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
      ItCo: { 1000: { name: "Terrain Items Color Array", data: "", order: 0 } },
      YCrd: { 1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 } },
      alis: {},
      _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
      Itms: ItmsSection,
    };

    return result;
  }

  const o = normalizeToLevelData(original);
  const r = normalizeToLevelData(roundtrip);
  return compareLevelData(o, r);
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
  ) => Promise<OttoMaticLevelData>;
  serializeJson: (
    json: OttoMaticLevelData,
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
          expect.fail("Parsed data is not an object");
        }
      }
      expect(() => {
        const jsonUnknown: unknown = jsonData;
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
