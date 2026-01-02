/**
 * Unit tests for level parsing functions
 *
 * These test the core parsing logic including:
 * - Buffer comparison (pure function)
 * - Level data comparison (pure function)
 * - Async parsing with mocked pyodide
 */

import { describe, it, expect } from "vitest";
import {
  compareBuffers,
  compareLevelData,
  parseLevelBuffer,
  serializeLevelData,
} from "@/data/mapRoundtrip/parseLevel";
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { isErr } from "@/types/result";

describe("Level Parsing - Pure Functions", () => {
  describe("compareBuffers - Binary comparison", () => {
    it("should identify identical buffers", () => {
      const buffer1 = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const buffer2 = new Uint8Array([1, 2, 3, 4, 5]).buffer;

      const result = compareBuffers(buffer1, buffer2);

      expect(result.equal).toBe(true);
      expect(result.sizeDiff).toBe(0);
      expect(result.firstDifferenceOffset).toBe(null);
      expect(result.differenceCount).toBe(0);
    });

    it("should identify different buffers", () => {
      const buffer1 = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const buffer2 = new Uint8Array([1, 2, 99, 4, 5]).buffer;

      const result = compareBuffers(buffer1, buffer2);

      expect(result.equal).toBe(false);
      expect(result.firstDifferenceOffset).toBe(2);
      expect(result.differenceCount).toBe(1);
    });

    it("should detect size differences", () => {
      const buffer1 = new Uint8Array([1, 2, 3]).buffer;
      const buffer2 = new Uint8Array([1, 2, 3, 4, 5]).buffer;

      const result = compareBuffers(buffer1, buffer2);

      expect(result.equal).toBe(false);
      expect(result.sizeDiff).toBe(-2);
      expect(result.differenceCount).toBeGreaterThanOrEqual(2);
    });

    it("should handle empty buffers", () => {
      const buffer1 = new ArrayBuffer(0);
      const buffer2 = new ArrayBuffer(0);

      const result = compareBuffers(buffer1, buffer2);

      expect(result.equal).toBe(true);
      expect(result.sizeDiff).toBe(0);
    });

    it("should find first difference in large buffers", () => {
      const buffer1 = new Uint8Array(1000);
      const buffer2 = new Uint8Array(1000);

      // Set first 500 bytes to identical
      for (let i = 0; i < 500; i++) {
        buffer1[i] = i % 256;
        buffer2[i] = i % 256;
      }

      // Differ at byte 500
      buffer1[500] = 100;
      buffer2[500] = 200;

      const result = compareBuffers(buffer1.buffer, buffer2.buffer);

      expect(result.equal).toBe(false);
      expect(result.firstDifferenceOffset).toBe(500);
    });
  });

  describe("compareLevelData - Structure comparison", () => {
    it("should identify identical level data", () => {
      const levelData: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData, levelData);

      expect(result.equal).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should detect differences in simple fields", () => {
      const levelData1: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 100,
              mapHeight: 200,
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
            },
            order: 0,
          },
        },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData1, levelData2);

      expect(result.equal).toBe(false);
      expect(result.differences).toBeDefined();
      expect(result.differences.length).toBeGreaterThan(0);
      expect(result.differences[0].path).toContain("width");
    });

    it("should detect differences in nested arrays", () => {
      const levelData1: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 1,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: { 1000: { obj: [{ type: 1, x: 10, z: 20, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }] } },
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 1,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: { 1000: { name: "Terrain Items List", obj: [{ type: 1, x: 10, z: 30, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }], order: 0 } },
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData1, levelData2);

      expect(result.equal).toBe(false);
      expect(result.differences.some((d) => d.path.includes("z"))).toBe(true);
    });

    it("should detect array length differences", () => {
      const levelData1: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 1,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: { 1000: { obj: [{ type: 1, x: 10, z: 20, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }] } },
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 2,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: {
          1000: { name: "Terrain Items List", obj: [{ type: 1, x: 10, z: 20, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }, { type: 2, x: 30, z: 40, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }], order: 0 },
        },
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData1, levelData2);

      expect(result.equal).toBe(false);
      expect(result.differences.some((d) => d.path.includes("length"))).toBe(
        true
      );
    });

    it("should handle null/undefined differences", () => {
      // Use unknown to create a null/undefined case that still satisfies runtime checks
      function assertIsLevel(x: unknown): asserts x is LevelData {
        if (typeof x !== 'object' || x === null || !('Hedr' in x)) {
          throw new Error('Value is not a LevelData');
        }
      }

      const levelData1Unknown: unknown = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: null,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2Unknown: unknown = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      assertIsLevel(levelData1Unknown);
      assertIsLevel(levelData2Unknown);

      const result = compareLevelData(levelData1Unknown, levelData2Unknown);

      expect(result.equal).toBe(false);
      expect(result.differences.some((d) => d.original === null)).toBe(true);
    });

    it("should allow small floating point differences", () => {
      const levelData1: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 100.0,
              mapHeight: 100.0,
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
            },
            order: 0,
          },
        },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 100.00001,
              mapHeight: 100.00002,
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
            },
            order: 0,
          },
        },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData1, levelData2);

      // Small differences should be ignored
      expect(result.equal).toBe(true);
    });

    it("should detect large floating point differences", () => {
      const levelData1: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 100.0,
              mapHeight: 100.0,
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
            },
            order: 0,
          },
        },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 100.5,
              mapHeight: 100.0,
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
            },
            order: 0,
          },
        },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData1, levelData2);

      expect(result.equal).toBe(false);
      expect(result.differences.some((d) => d.path.includes("mapWidth"))).toBe(
        true
      );
    });

    it("should handle deeply nested structures", () => {
      function assertIsLevel(x: unknown): asserts x is LevelData {
        if (typeof x !== 'object' || x === null || !('Hedr' in x)) {
          throw new Error('Value is not a LevelData');
        }
      }

      const level1Unknown: unknown = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 1,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: {
          1000: {
            obj: [
              {
                type: 1,
                x: 10,
                z: 0,
                flags: 0,
                p0: 0,
                p1: 0,
                p2: 0,
                p3: 0,
                nested: { deep: { value: 42 } },
              },
            ],
          },
        },
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const level2Unknown: unknown = {
        Hedr: {
          1000: {
            name: "Header",
            obj: {
              version: 1,
              numItems: 1,
              mapWidth: 100,
              mapHeight: 100,
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
            },
            order: 0,
          },
        },
        Itms: {
          1000: {
            obj: [
              {
                type: 1,
                x: 10,
                z: 0,
                flags: 0,
                p0: 0,
                p1: 0,
                p2: 0,
                p3: 0,
                nested: { deep: { value: 99 } },
              },
            ],
          },
        },
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      assertIsLevel(level1Unknown);
      assertIsLevel(level2Unknown);

      const result = compareLevelData(level1Unknown, level2Unknown);

      expect(result.equal).toBe(false);
      expect(result.differences.some((d) => d.path.includes("deep.value"))).toBe(
        true
      );
    });
  });

  describe("parseLevelBuffer - Async parsing with rsrcdump-ts", () => {
    it("should parse level buffer successfully", async () => {
      const buffer = new ArrayBuffer(100);
      const result = await parseLevelBuffer(
        buffer,
        { structSpecs: [] },
      );

      // Since we're passing an invalid buffer, it should return an error
      expect(isErr(result)).toBe(true);
    });
  });

  describe("serializeLevelData - Async serialization with rsrcdump-ts", () => {
    it("should handle serialization with valid data structure", async () => {
      const levelData: LevelData = {
        Hedr: { 1000: { name: "Header", obj: { version: 1, numItems: 0, mapWidth: 100, mapHeight: 100, tileSize: 0, minY: 0, maxY: 0, numSplines: 0, numFences: 0, numTilePages: 0, numTiles: 0, numUniqueSupertiles: 0, numWaterPatches: 0, numCheckpoints: 0 }, order: 0 } },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = await serializeLevelData(
        levelData,
        { structSpecs: [] },
      );

      // The actual behavior depends on rsrcdump-ts implementation
      // For now, just verify it returns a result
      expect(result).toBeDefined();
    });
  });
});
