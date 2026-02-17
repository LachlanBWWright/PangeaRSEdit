/**
 * Tests for data processors
 */

import { describe, it, expect } from "vitest";
import { fixNullToZero } from "@/data/processors/nullToZeroFixer";

describe("Data Processors", () => {
  describe("fixNullToZero", () => {
    describe("Basic null/undefined handling", () => {
      it("returns null for null input", () => {
        expect(fixNullToZero(null)).toBeNull();
      });

      it("returns undefined for undefined input", () => {
        expect(fixNullToZero(undefined)).toBeUndefined();
      });

      it("preserves numbers", () => {
        expect(fixNullToZero(42)).toBe(42);
        expect(fixNullToZero(0)).toBe(0);
        expect(fixNullToZero(-1)).toBe(-1);
      });

      it("preserves strings", () => {
        expect(fixNullToZero("test")).toBe("test");
      });

      it("preserves booleans", () => {
        expect(fixNullToZero(true)).toBe(true);
        expect(fixNullToZero(false)).toBe(false);
      });
    });

    describe("Array handling", () => {
      it("converts null in arrays to 0", () => {
        const arr = [1, null, 3];
        fixNullToZero(arr);
        expect(arr).toEqual([1, 0, 3]);
      });

      it("converts undefined in arrays to 0", () => {
        const arr = [1, undefined, 3];
        fixNullToZero(arr);
        expect(arr).toEqual([1, 0, 3]);
      });

      it("recursively fixes nested arrays", () => {
        const arr = [[1, null], [null, 2]];
        fixNullToZero(arr);
        expect(arr).toEqual([[1, 0], [0, 2]]);
      });

      it("recursively fixes objects in arrays", () => {
        const arr = [{ x: null }];
        fixNullToZero(arr);
        expect(arr).toEqual([{ x: 0 }]);
      });
    });

    describe("Object handling", () => {
      it("converts null 'obj' field to empty array", () => {
        const obj = { obj: null };
        fixNullToZero(obj);
        expect(obj).toEqual({ obj: [] });
      });

      it("converts undefined 'obj' field to empty array", () => {
        const obj = { obj: undefined };
        fixNullToZero(obj);
        expect(obj).toEqual({ obj: [] });
      });

      it("converts null coordinate fields to 0", () => {
        const obj = { x: null, y: null, z: null };
        fixNullToZero(obj);
        expect(obj).toEqual({ x: 0, y: 0, z: 0 });
      });

      it("converts null dimension fields to 0", () => {
        const obj = { width: null, height: null, depth: null };
        fixNullToZero(obj);
        expect(obj).toEqual({ width: 0, height: 0, depth: 0 });
      });

      it("converts null boundary fields to 0", () => {
        const obj = { min: null, max: null };
        fixNullToZero(obj);
        expect(obj).toEqual({ min: 0, max: 0 });
      });

      it("converts null color fields to 0", () => {
        const obj = { red: null, green: null, blue: null, alpha: null };
        fixNullToZero(obj);
        expect(obj).toEqual({ red: 0, green: 0, blue: 0, alpha: 0 });
      });

      it("converts null indexed fields (liquid nubs) to 0", () => {
        const obj = { x_0: null, x_1: null, y_0: null, y_1: null };
        fixNullToZero(obj);
        expect(obj).toEqual({ x_0: 0, x_1: 0, y_0: 0, y_1: 0 });
      });

      it("converts null flag fields to 0", () => {
        const obj = { flags: null, flag: null };
        fixNullToZero(obj);
        expect(obj).toEqual({ flags: 0, flag: 0 });
      });

      it("converts null type field to 0", () => {
        const obj = { type: null };
        fixNullToZero(obj);
        expect(obj).toEqual({ type: 0 });
      });

      it("does not modify non-numeric null fields", () => {
        const obj = { name: null, unknownField: null };
        fixNullToZero(obj);
        // unknownField is not recognized as numeric, so stays null
        expect(obj.name).toBeNull();
        expect(obj.unknownField).toBeNull();
      });

      it("recursively fixes nested objects", () => {
        const obj = {
          outer: {
            inner: {
              x: null,
              y: null,
            },
          },
        };
        fixNullToZero(obj);
        expect(obj).toEqual({
          outer: {
            inner: {
              x: 0,
              y: 0,
            },
          },
        });
      });
    });

    describe("Real-world level data scenarios", () => {
      it("fixes level dimensions with null values", () => {
        const header = {
          width: 64, // non-null stays
          height: null, // matches /height/i pattern
          size: null, // matches /size/i pattern
        };
        fixNullToZero(header);
        expect(header.width).toBe(64);
        expect(header.height).toBe(0);
        expect(header.size).toBe(0);
      });

      it("fixes terrain item with null coordinates", () => {
        const item = {
          type: null, // matches type pattern
          x: null,
          z: 100,
          flags: null, // matches flags pattern
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0,
        };
        fixNullToZero(item);
        expect(item.type).toBe(0);
        expect(item.x).toBe(0);
        expect(item.flags).toBe(0);
      });

      it("fixes spline nub with null coordinates", () => {
        const nub = { x: null, z: null };
        fixNullToZero(nub);
        expect(nub).toEqual({ x: 0, z: 0 });
      });

      it("fixes resource entry with null obj", () => {
        const entry = {
          Hedr: {
            1000: {
              obj: null,
            },
          },
        };
        fixNullToZero(entry);
        expect(entry.Hedr[1000].obj).toEqual([]);
      });
    });

    describe("Edge cases", () => {
      it("handles empty object", () => {
        const obj = {};
        expect(() => fixNullToZero(obj)).not.toThrow();
        expect(obj).toEqual({});
      });

      it("handles empty array", () => {
        const arr: unknown[] = [];
        expect(() => fixNullToZero(arr)).not.toThrow();
        expect(arr).toEqual([]);
      });

      it("handles mixed structure", () => {
        const data = {
          items: [
            { x: null, y: 10 },
            null,
            { x: 20, y: null },
          ],
          header: {
            width: null,
            name: "test",
          },
        };
        fixNullToZero(data);
        expect(data.items).toEqual([
          { x: 0, y: 10 },
          0,  // null in array becomes 0
          { x: 20, y: 0 },
        ]);
        expect(data.header.width).toBe(0);
        expect(data.header.name).toBe("test");
      });
    });
  });
});
