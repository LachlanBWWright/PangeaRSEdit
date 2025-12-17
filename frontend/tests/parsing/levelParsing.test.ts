/**
 * Unit tests for level parsing functions
 *
 * These test the core parsing logic including:
 * - Buffer comparison (pure function)
 * - Level data comparison (pure function)
 * - Async parsing with mocked pyodide
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  compareBuffers,
  compareLevelData,
  parseLevelBuffer,
  parseNanosaur1Buffer,
  serializeLevelData,
  performRoundtrip,
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
        Hedr: { height: 100, width: 100 },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData, levelData);

      expect(result.equal).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should detect differences in simple fields", () => {
      const levelData1: LevelData = {
        Hedr: { height: 100, width: 100 },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: { height: 100, width: 200 },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData1, levelData2);

      expect(result.equal).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
      expect(result.differences[0].path).toContain("width");
    });

    it("should detect differences in nested arrays", () => {
      const levelData1: LevelData = {
        Hedr: { height: 100, width: 100 },
        Itms: { 1000: { obj: [{ type: 1, x: 10, y: 20 }] } },
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: { height: 100, width: 100 },
        Itms: { 1000: { obj: [{ type: 1, x: 10, y: 30 }] } },
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData1, levelData2);

      expect(result.equal).toBe(false);
      expect(result.differences.some((d) => d.path.includes("y"))).toBe(true);
    });

    it("should detect array length differences", () => {
      const levelData1: LevelData = {
        Hedr: { height: 100, width: 100 },
        Itms: { 1000: { obj: [{ type: 1, x: 10, y: 20 }] } },
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: { height: 100, width: 100 },
        Itms: {
          1000: { obj: [{ type: 1, x: 10, y: 20 }, { type: 2, x: 30, y: 40 }] },
        },
        Tram: undefined,
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
      const levelData1: LevelData = {
        Hedr: { height: 100, width: 100 },
        Itms: null,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: { height: 100, width: 100 },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData1, levelData2);

      expect(result.equal).toBe(false);
      expect(result.differences.some((d) => d.original === null)).toBe(true);
    });

    it("should allow small floating point differences", () => {
      const levelData1: LevelData = {
        Hedr: { height: 100.0, width: 100.0 },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: { height: 100.00001, width: 100.00002 },
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
        Hedr: { height: 100.0, width: 100.0 },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const levelData2: LevelData = {
        Hedr: { height: 100.5, width: 100.0 },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = compareLevelData(levelData1, levelData2);

      expect(result.equal).toBe(false);
      expect(result.differences.some((d) => d.path.includes("height"))).toBe(
        true
      );
    });

    it("should handle deeply nested structures", () => {
      const level1 = {
        Hedr: { height: 100, width: 100 },
        Itms: {
          1000: {
            obj: [
              {
                type: 1,
                x: 10,
                nested: { deep: { value: 42 } },
              },
            ],
          },
        },
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      } as unknown as LevelData;

      const level2 = {
        Hedr: { height: 100, width: 100 },
        Itms: {
          1000: {
            obj: [
              {
                type: 1,
                x: 10,
                nested: { deep: { value: 99 } },
              },
            ],
          },
        },
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      } as unknown as LevelData;

      const result = compareLevelData(level1, level2);

      expect(result.equal).toBe(false);
      expect(result.differences.some((d) => d.path.includes("deep.value"))).toBe(
        true
      );
    });
  });

  describe("parseLevelBuffer - Async parsing with mocked pyodide", () => {
    let mockPyodideRunner: (code: string, buffer: ArrayBuffer) => Promise<string>;

    beforeEach(() => {
      // Mock pyodide runner that returns valid JSON
      mockPyodideRunner = async () => {
        return JSON.stringify({
          Hedr: { height: 100, width: 100 },
          Itms: undefined,
          Tram: undefined,
          Heig: undefined,
          Fenc: undefined,
        });
      };
    });

    it("should parse level buffer successfully", async () => {
      const buffer = new ArrayBuffer(100);
      const result = await parseLevelBuffer(
        buffer,
        { structSpecs: {} },
        mockPyodideRunner
      );

      expect(isErr(result)).toBe(false);
      if (!isErr(result)) {
        expect(result.value.Hedr?.height).toBe(100);
        expect(result.value.Hedr?.width).toBe(100);
      }
    });

    it("should handle parsing errors", async () => {
      const errorRunner = async () => {
        throw new Error("Pyodide error");
      };

      const buffer = new ArrayBuffer(100);
      const result = await parseLevelBuffer(
        buffer,
        { structSpecs: {} },
        errorRunner
      );

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("Pyodide");
      }
    });

    it("should handle invalid JSON response", async () => {
      const invalidRunner = async () => {
        return "not valid json";
      };

      const buffer = new ArrayBuffer(100);
      const result = await parseLevelBuffer(
        buffer,
        { structSpecs: {} },
        invalidRunner
      );

      expect(isErr(result)).toBe(true);
    });
  });

  describe("serializeLevelData - Async serialization with mocked pyodide", () => {
    let mockPyodideRunner: (code: string, jsonData: object) => Promise<ArrayBuffer>;

    beforeEach(() => {
      mockPyodideRunner = async () => {
        // Return a small buffer to represent serialized data
        return new Uint8Array([1, 2, 3, 4, 5]).buffer;
      };
    });

    it("should serialize level data successfully", async () => {
      const levelData: LevelData = {
        Hedr: { height: 100, width: 100 },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = await serializeLevelData(
        levelData,
        { structSpecs: {} },
        mockPyodideRunner
      );

      expect(isErr(result)).toBe(false);
      if (!isErr(result)) {
        expect(result.value.byteLength).toBeGreaterThan(0);
      }
    });

    it("should handle serialization errors", async () => {
      const errorRunner = async () => {
        throw new Error("Serialization failed");
      };

      const levelData: LevelData = {
        Hedr: { height: 100, width: 100 },
        Itms: undefined,
        Tram: undefined,
        Heig: undefined,
        Fenc: undefined,
      };

      const result = await serializeLevelData(
        levelData,
        { structSpecs: {} },
        errorRunner
      );

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("Serialization");
      }
    });
  });
});
