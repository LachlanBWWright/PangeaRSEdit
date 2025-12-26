/**
 * Unit tests for RLW/RLB decompression functions
 *
 * These are pure function tests with no side effects
 * Tests verify both happy paths and error cases
 */

import { describe, it, expect } from "vitest";
import {
  rlbDecompress,
  rlwDecompress,
  rlwCompress,
  PACK_TYPE_RLB,
  PACK_TYPE_RLW,
  PACK_TYPE_NONE,
} from "@/utils/rlwDecompress";
import { isErr } from "@/types/result";

describe("RLW/RLB Decompression", () => {
  describe("rlbDecompress - Byte-level run-length decoding", () => {
    it("should decompress a simple RLB file with packed runs", () => {
      // Packed run: 0xFF = 256 - 255 + 1 = 2 times 0x41 ('A')
      const compressed = new Uint8Array(12);
      compressed[0] = 0; // decompressed size part 1
      compressed[1] = 0;
      compressed[2] = 0;
      compressed[3] = 6;
      compressed[4] = 0; // compression type part 1
      compressed[5] = 0;
      compressed[6] = 0;
      compressed[7] = PACK_TYPE_RLB;
      compressed[8] = 0xFF; // packed count (2 times)
      compressed[9] = 0x41; // 'A'

      const result = rlbDecompress(compressed.buffer);

      expect(isErr(result)).toBe(false);
      if (!isErr(result)) {
        const decompressed = new Uint8Array(result.value.data);
        expect(decompressed[0]).toBe(0x41);
        expect(decompressed[1]).toBe(0x41);
        expect(result.value.decompressedSize).toBe(6);
        expect(result.value.compressionType).toBe(PACK_TYPE_RLB);
      }
    });

    it("should decompress RLB file with literal runs", () => {
      // Literal run: 2 bytes of literal data
      const compressed = new Uint8Array(13);
      compressed[0] = 0;
      compressed[1] = 0;
      compressed[2] = 0;
      compressed[3] = 3;
      compressed[4] = 0;
      compressed[5] = 0;
      compressed[6] = 0;
      compressed[7] = PACK_TYPE_RLB;
      compressed[8] = 0x01; // 2 literal bytes (count + 1)
      compressed[9] = 0x41; // 'A'
      compressed[10] = 0x42; // 'B'

      const result = rlbDecompress(compressed.buffer);

      expect(isErr(result)).toBe(false);
      if (!isErr(result)) {
        const decompressed = new Uint8Array(result.value.data);
        expect(decompressed[0]).toBe(0x41);
        expect(decompressed[1]).toBe(0x42);
      }
    });

    it("should reject RLB file with wrong compression type", () => {
      const compressed = new Uint8Array(8);
      compressed[0] = 0;
      compressed[1] = 0;
      compressed[2] = 0;
      compressed[3] = 10;
      compressed[4] = 0;
      compressed[5] = 0;
      compressed[6] = 0;
      compressed[7] = PACK_TYPE_RLW; // Wrong type, not RLB

      const result = rlbDecompress(compressed.buffer);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("Expected RLB");
      }
    });
  });

  describe("rlwDecompress - Word-level run-length decoding", () => {
    it("should decompress RLW file with packed word runs", () => {
      const output = new ArrayBuffer(16);
      const view = new DataView(output);

      // Write header
      view.setUint32(0, 8, false); // decompressed size = 8 bytes
      view.setUint32(4, PACK_TYPE_RLW, false); // compression type = RLW

      // Packed run: repeat 0x1234 twice (0x80 | 1 = 0x81, then 0x1234)
      const compressed = new Uint8Array(12);
      compressed[0] = 0;
      compressed[1] = 0;
      compressed[2] = 0;
      compressed[3] = 8;
      compressed[4] = 0;
      compressed[5] = 0;
      compressed[6] = 0;
      compressed[7] = PACK_TYPE_RLW;
      compressed[8] = 0x81; // packed, count=2
      compressed[9] = 0x12;
      compressed[10] = 0x34;

      const result = rlwDecompress(compressed.buffer);

      expect(isErr(result)).toBe(false);
      if (!isErr(result)) {
        const decompressed = new DataView(result.value.data);
        expect(decompressed.getUint16(0, false)).toBe(0x1234);
        expect(decompressed.getUint16(2, false)).toBe(0x1234);
      }
    });

    it("should decompress RLW file with literal word streams", () => {
      const output = new ArrayBuffer(16);
      const view = new DataView(output);

      view.setUint32(0, 4, false);
      view.setUint32(4, PACK_TYPE_RLW, false);

      const compressed = new Uint8Array(14);
      compressed[0] = 0;
      compressed[1] = 0;
      compressed[2] = 0;
      compressed[3] = 4;
      compressed[4] = 0;
      compressed[5] = 0;
      compressed[6] = 0;
      compressed[7] = PACK_TYPE_RLW;
      compressed[8] = 0x01; // 2 literal words
      compressed[9] = 0x12;
      compressed[10] = 0x34;
      compressed[11] = 0x56;
      compressed[12] = 0x78;

      const result = rlwDecompress(compressed.buffer);

      expect(isErr(result)).toBe(false);
      if (!isErr(result)) {
        const decompressed = new DataView(result.value.data);
        expect(decompressed.getUint16(0, false)).toBe(0x1234);
        expect(decompressed.getUint16(2, false)).toBe(0x5678);
      }
    });

    it("should handle uncompressed (PACK_TYPE_NONE) files", () => {
      const compressed = new Uint8Array(14);
      compressed[0] = 0;
      compressed[1] = 0;
      compressed[2] = 0;
      compressed[3] = 6;
      compressed[4] = 0;
      compressed[5] = 0;
      compressed[6] = 0;
      compressed[7] = PACK_TYPE_NONE;
      compressed[8] = 0x41;
      compressed[9] = 0x42;
      compressed[10] = 0x43;

      const result = rlwDecompress(compressed.buffer);

      expect(isErr(result)).toBe(false);
      if (!isErr(result)) {
        expect(result.value.compressionType).toBe(PACK_TYPE_NONE);
        const data = new Uint8Array(result.value.data);
        expect(data[0]).toBe(0x41);
        expect(data[1]).toBe(0x42);
        expect(data[2]).toBe(0x43);
      }
    });

    it("should reject unsupported compression types", () => {
      const compressed = new Uint8Array(8);
      compressed[0] = 0;
      compressed[1] = 0;
      compressed[2] = 0;
      compressed[3] = 10;
      compressed[4] = 0;
      compressed[5] = 0;
      compressed[6] = 0;
      compressed[7] = 99; // Unsupported type

      const result = rlwDecompress(compressed.buffer);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("Unsupported compression");
      }
    });
  });

  describe("rlwCompress - Word-level compression roundtrip", () => {
    it("should compress and decompress identical data (roundtrip)", () => {
      // Original data: [0x1234, 0x1234, 0x5678]
      const original = new ArrayBuffer(6);
      const view = new DataView(original);
      view.setUint16(0, 0x1234, false);
      view.setUint16(2, 0x1234, false);
      view.setUint16(4, 0x5678, false);

      // Compress
      const compressed = rlwCompress(original);

      // Decompress
      const decompressResult = rlwDecompress(compressed);

      expect(isErr(decompressResult)).toBe(false);
      if (!isErr(decompressResult)) {
        // Compare original and decompressed
        const originalView = new DataView(original);
        const decompressedView = new DataView(decompressResult.value.data);

        expect(decompressedView.getUint16(0, false)).toBe(
          originalView.getUint16(0, false)
        );
        expect(decompressedView.getUint16(2, false)).toBe(
          originalView.getUint16(2, false)
        );
        expect(decompressedView.getUint16(4, false)).toBe(
          originalView.getUint16(4, false)
        );
      }
    });

    it("should produce smaller output for highly repetitive data", () => {
      // Create data with lots of repeating words
      const original = new ArrayBuffer(128);
      const view = new DataView(original);
      for (let i = 0; i < 64; i++) {
        view.setUint16(i * 2, 0xAAAA, false);
      }

      const compressed = rlwCompress(original);

      // Compressed should be smaller than original (128 bytes)
      // With run-length encoding, 64 identical words should compress to ~10 bytes
      expect(compressed.byteLength).toBeLessThan(original.byteLength);
    });

    it("should handle data with no compressible runs", () => {
      // Create data with no repeating patterns
      const original = new ArrayBuffer(6);
      const view = new DataView(original);
      view.setUint16(0, 0x1234, false);
      view.setUint16(2, 0x5678, false);
      view.setUint16(4, 0x9ABC, false);

      const compressed = rlwCompress(original);

      // Compressed will be larger due to header and overhead
      // But decompression should still work
      const decompressResult = rlwDecompress(compressed);
      expect(isErr(decompressResult)).toBe(false);
    });
  });
});
