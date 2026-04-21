/**
 * Unit tests for pure buffer operation functions
 *
 * These tests verify that all buffer operations are pure functions
 * with predictable inputs/outputs and no side effects
 */

import { describe, it, expect } from "vitest";
import {
  readUint32BE,
  readUint32LE,
  readUint16BE,
  readUint16LE,
  readUint8,
  writeUint32BE,
  writeUint32LE,
  sliceBuffer,
  copyBuffer,
  concatBuffers,
  findFirstDifference,
  createFilledBuffer,
  bufferToHex,
  hexToBuffer,
  bufferStats,
} from "@/utils/bufferOperations";

describe("Buffer Operations - Pure Functions", () => {
  describe("readUint32BE - Big-endian 32-bit reads", () => {
    it("should read 32-bit big-endian integer", () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78]).buffer;
      const result = readUint32BE(buffer, 0);

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        expect(result.value).toBe(0x12345678);
      }
    });

    it("should read at offset", () => {
      const buffer = new Uint8Array([0xFF, 0xFF, 0x12, 0x34, 0x56, 0x78]).buffer;
      const result = readUint32BE(buffer, 2);

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        expect(result.value).toBe(0x12345678);
      }
    });

    it("should error on buffer overflow", () => {
      const buffer = new Uint8Array([0x12, 0x34]).buffer;
      const result = readUint32BE(buffer, 0);

      expect(result.isErr()).toBe(true);
    });

    it("should error on negative offset", () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78]).buffer;
      const result = readUint32BE(buffer, -1);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("readUint32LE - Little-endian 32-bit reads", () => {
    it("should read 32-bit little-endian integer", () => {
      const buffer = new Uint8Array([0x78, 0x56, 0x34, 0x12]).buffer;
      const result = readUint32LE(buffer, 0);

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        expect(result.value).toBe(0x12345678);
      }
    });

    it("should differ from big-endian for same bytes", () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78]).buffer;

      const resultBE = readUint32BE(buffer, 0);
      const resultLE = readUint32LE(buffer, 0);

      expect(resultBE.isErr()).toBe(false);
      expect(resultLE.isErr()).toBe(false);

      if (!resultBE.isErr() && !resultLE.isErr()) {
        expect(resultBE.value).not.toBe(resultLE.value);
      }
    });
  });

  describe("readUint16 operations", () => {
    it("should read 16-bit big-endian", () => {
      const buffer = new Uint8Array([0x12, 0x34]).buffer;
      const result = readUint16BE(buffer, 0);

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        expect(result.value).toBe(0x1234);
      }
    });

    it("should read 16-bit little-endian", () => {
      const buffer = new Uint8Array([0x34, 0x12]).buffer;
      const result = readUint16LE(buffer, 0);

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        expect(result.value).toBe(0x1234);
      }
    });
  });

  describe("readUint8 operations", () => {
    it("should read single byte", () => {
      const buffer = new Uint8Array([0x42, 0x43]).buffer;
      const result = readUint8(buffer, 0);

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        expect(result.value).toBe(0x42);
      }
    });

    it("should read at various offsets", () => {
      const buffer = new Uint8Array([10, 20, 30, 40, 50]).buffer;

      for (let i = 0; i < 5; i++) {
        const result = readUint8(buffer, i);
        expect(result.isErr()).toBe(false);
        if (!result.isErr()) {
          expect(result.value).toBe((i + 1) * 10);
        }
      }
    });
  });

  describe("writeUint32 operations", () => {
    it("should write 32-bit big-endian", () => {
      const buffer = writeUint32BE(0x12345678);
      const view = new DataView(buffer);

      expect(view.getUint8(0)).toBe(0x12);
      expect(view.getUint8(1)).toBe(0x34);
      expect(view.getUint8(2)).toBe(0x56);
      expect(view.getUint8(3)).toBe(0x78);
    });

    it("should write 32-bit little-endian", () => {
      const buffer = writeUint32LE(0x12345678);
      const view = new DataView(buffer);

      expect(view.getUint8(0)).toBe(0x78);
      expect(view.getUint8(1)).toBe(0x56);
      expect(view.getUint8(2)).toBe(0x34);
      expect(view.getUint8(3)).toBe(0x12);
    });
  });

  describe("sliceBuffer - Buffer slicing", () => {
    it("should slice from start to end", () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const result = sliceBuffer(buffer, 1, 4);

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        const view = new Uint8Array(result.value);
        expect(view).toEqual(new Uint8Array([2, 3, 4]));
      }
    });

    it("should slice from start to end of buffer", () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const result = sliceBuffer(buffer, 2);

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        const view = new Uint8Array(result.value);
        expect(view).toEqual(new Uint8Array([3, 4, 5]));
      }
    });

    it("should error on invalid range", () => {
      const buffer = new Uint8Array([1, 2, 3]).buffer;
      const result = sliceBuffer(buffer, 5, 10);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("copyBuffer - Buffer copying", () => {
    it("should copy portion of buffer", () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const result = copyBuffer(buffer, 1, 3);

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        const view = new Uint8Array(result.value);
        expect(view).toEqual(new Uint8Array([2, 3, 4]));
      }
    });

    it("should error on out-of-bounds copy", () => {
      const buffer = new Uint8Array([1, 2, 3]).buffer;
      const result = copyBuffer(buffer, 0, 10);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("concatBuffers - Buffer concatenation", () => {
    it("should concatenate multiple buffers", () => {
      const buf1 = new Uint8Array([1, 2]).buffer;
      const buf2 = new Uint8Array([3, 4]).buffer;
      const buf3 = new Uint8Array([5, 6]).buffer;

      const result = concatBuffers([buf1, buf2, buf3]);
      const view = new Uint8Array(result);

      expect(view).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });

    it("should handle empty buffer list", () => {
      const result = concatBuffers([]);

      expect(result.byteLength).toBe(0);
    });

    it("should handle single buffer", () => {
      const buf = new Uint8Array([1, 2, 3]).buffer;
      const result = concatBuffers([buf]);
      const view = new Uint8Array(result);

      expect(view).toEqual(new Uint8Array([1, 2, 3]));
    });
  });

  describe("findFirstDifference - Buffer comparison", () => {
    it("should find identical buffers equal", () => {
      const buf1 = new Uint8Array([1, 2, 3]).buffer;
      const buf2 = new Uint8Array([1, 2, 3]).buffer;

      const result = findFirstDifference(buf1, buf2);

      expect(result.equal).toBe(true);
      expect(result.offset).toBe(null);
    });

    it("should find first difference offset", () => {
      const buf1 = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const buf2 = new Uint8Array([1, 2, 99, 4, 5]).buffer;

      const result = findFirstDifference(buf1, buf2);

      expect(result.equal).toBe(false);
      expect(result.offset).toBe(2);
    });

    it("should detect size differences", () => {
      const buf1 = new Uint8Array([1, 2, 3]).buffer;
      const buf2 = new Uint8Array([1, 2, 3, 4, 5]).buffer;

      const result = findFirstDifference(buf1, buf2);

      expect(result.equal).toBe(false);
      expect(result.offset).toBe(3);
    });
  });

  describe("createFilledBuffer - Buffer creation", () => {
    it("should create buffer filled with value", () => {
      const buffer = createFilledBuffer(5, 42);
      const view = new Uint8Array(buffer);

      expect(view).toEqual(new Uint8Array([42, 42, 42, 42, 42]));
    });

    it("should create buffer of specified size", () => {
      const buffer = createFilledBuffer(100, 0);

      expect(buffer.byteLength).toBe(100);
    });
  });

  describe("bufferToHex - Hex encoding", () => {
    it("should encode buffer to hex string", () => {
      const buffer = new Uint8Array([0x12, 0x34, 0xAB, 0xCD]).buffer;
      const hex = bufferToHex(buffer);

      expect(hex).toBe("1234abcd");
    });

    it("should handle single bytes", () => {
      const buffer = new Uint8Array([0x0F, 0xF0]).buffer;
      const hex = bufferToHex(buffer);

      expect(hex).toBe("0ff0");
    });
  });

  describe("hexToBuffer - Hex decoding", () => {
    it("should decode hex string to buffer", () => {
      const result = hexToBuffer("1234abcd");

      expect(result.isErr()).toBe(false);
      if (!result.isErr()) {
        const view = new Uint8Array(result.value);
        expect(view).toEqual(new Uint8Array([0x12, 0x34, 0xAB, 0xCD]));
      }
    });

    it("should error on odd-length hex string", () => {
      const result = hexToBuffer("123");

      expect(result.isErr()).toBe(true);
    });

    it("should error on invalid hex characters", () => {
      const result = hexToBuffer("12GG");

      expect(result.isErr()).toBe(true);
    });

    it("should roundtrip through hex encoding", () => {
      const original = new Uint8Array([1, 2, 3, 255, 128, 0]).buffer;
      const hex = bufferToHex(original);
      const decoded = hexToBuffer(hex);

      expect(decoded.isErr()).toBe(false);
      if (!decoded.isErr()) {
        const result = findFirstDifference(original, decoded.value);
        expect(result.equal).toBe(true);
      }
    });
  });

  describe("bufferStats - Buffer statistics", () => {
    it("should return stats for buffer", () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).buffer;
      const stats = bufferStats(buffer);

      expect(stats.size).toBe(10);
      expect(stats.first8Bytes).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("should truncate hex to 32 bytes", () => {
      const buffer = new Uint8Array(100).buffer;
      const stats = bufferStats(buffer);

      // 32 bytes * 2 chars per byte = 64 chars max
      expect(stats.hex.length).toBeLessThanOrEqual(64);
    });

    it("should handle small buffers", () => {
      const buffer = new Uint8Array([0xFF]).buffer;
      const stats = bufferStats(buffer);

      expect(stats.size).toBe(1);
      expect(stats.first8Bytes).toEqual([0xFF]);
    });
  });
});
