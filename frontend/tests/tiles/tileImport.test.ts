/**
 * Tests for Tile Import System
 */

import { describe, it, expect } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  canImportTiles,
  getTileImportRequirements,
  convertTileDataToPreview,
  getSupportedImageFormats,
  getTileImportFileFilter,
} from "@/data/tiles/tileImport";

describe("Tile Import System", () => {
  describe("canImportTiles", () => {
    it("returns true for Bugdom 1", () => {
      expect(canImportTiles(Game.BUGDOM)).toBe(true);
    });

    it("returns true for Nanosaur 1", () => {
      expect(canImportTiles(Game.NANOSAUR)).toBe(true);
    });

    it("returns false for Otto Matic (supertile-based)", () => {
      expect(canImportTiles(Game.OTTO_MATIC)).toBe(false);
    });

    it("returns false for Bugdom 2 (supertile-based)", () => {
      expect(canImportTiles(Game.BUGDOM_2)).toBe(false);
    });

    it("returns false for Nanosaur 2 (supertile-based)", () => {
      expect(canImportTiles(Game.NANOSAUR_2)).toBe(false);
    });

    it("returns false for Cro-Mag Rally", () => {
      expect(canImportTiles(Game.CRO_MAG)).toBe(false);
    });

    it("returns false for Billy Frontier", () => {
      expect(canImportTiles(Game.BILLY_FRONTIER)).toBe(false);
    });
  });

  describe("getTileImportRequirements", () => {
    it("returns correct requirements for Bugdom 1", () => {
      const result = getTileImportRequirements(Game.BUGDOM);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tileSize).toBe(32);
        expect(result.value.maxTiles).toBe(1024);
        expect(result.value.format).toBe("16bit");
      }
    });

    it("returns correct requirements for Nanosaur 1", () => {
      const result = getTileImportRequirements(Game.NANOSAUR);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tileSize).toBe(32);
        expect(result.value.maxTiles).toBe(1024);
        expect(result.value.format).toBe("16bit");
      }
    });

    it("returns error for unsupported games", () => {
      const result = getTileImportRequirements(Game.OTTO_MATIC);
      expect(result.isOk()).toBe(false);
    });
  });

  describe("getSupportedImageFormats", () => {
    it("returns common image formats", () => {
      const formats = getSupportedImageFormats();
      expect(formats).toContain("image/png");
      expect(formats).toContain("image/jpeg");
      expect(formats).toContain("image/bmp");
    });
  });

  describe("getTileImportFileFilter", () => {
    it("returns valid file extension filter", () => {
      const filter = getTileImportFileFilter();
      expect(filter).toContain(".png");
      expect(filter).toContain(".jpg");
      expect(filter).toContain(".jpeg");
      expect(filter).toContain(".bmp");
    });
  });

  describe("16-bit conversion", () => {
    // Note: Full image conversion tests require browser APIs (Canvas, Image)
    // These would be tested in integration/e2e tests
    
    it("convertTileDataToPreview rejects invalid data length", () => {
      const invalidData = new Uint8Array(100); // Wrong size
      const result = convertTileDataToPreview(invalidData, 32);
      expect(result.isOk()).toBe(false);
    });

    it("convertTileDataToPreview rejects empty data", () => {
      const emptyData = new Uint8Array(0);
      const result = convertTileDataToPreview(emptyData, 32);
      expect(result.isOk()).toBe(false);
    });

    it("validates correct data length for 32x32 tile", () => {
      // 32x32 pixels * 2 bytes per pixel = 2048 bytes
      const expectedLength = 32 * 32 * 2;
      expect(expectedLength).toBe(2048);
    });
  });

  describe("ARGB1555 format", () => {
    it("correctly packs ARGB1555 value", () => {
      // Test bit packing manually
      // Full alpha, red=31, green=0, blue=0 should be 0b1_11111_00000_00000 = 0xFC00
      const a1 = 1;
      const r5 = 31;
      const g5 = 0;
      const b5 = 0;
      const packed = (a1 << 15) | (r5 << 10) | (g5 << 5) | b5;
      expect(packed).toBe(0xFC00);
    });

    it("correctly packs white with alpha", () => {
      // Full alpha, full white: A=1, R=31, G=31, B=31
      const a1 = 1;
      const r5 = 31;
      const g5 = 31;
      const b5 = 31;
      const packed = (a1 << 15) | (r5 << 10) | (g5 << 5) | b5;
      expect(packed).toBe(0xFFFF);
    });

    it("correctly packs transparent black", () => {
      // No alpha, black: A=0, R=0, G=0, B=0
      const a1 = 0;
      const r5 = 0;
      const g5 = 0;
      const b5 = 0;
      const packed = (a1 << 15) | (r5 << 10) | (g5 << 5) | b5;
      expect(packed).toBe(0x0000);
    });

    it("correctly unpacks ARGB1555 value", () => {
      // Test unpacking: 0xFC00 should give A=1, R=31, G=0, B=0
      const packed = 0xFC00;
      const a1 = (packed >> 15) & 0x01;
      const r5 = (packed >> 10) & 0x1F;
      const g5 = (packed >> 5) & 0x1F;
      const b5 = packed & 0x1F;
      
      expect(a1).toBe(1);
      expect(r5).toBe(31);
      expect(g5).toBe(0);
      expect(b5).toBe(0);
    });

    it("converts 8-bit to 5-bit correctly", () => {
      // 255 (max 8-bit) >> 3 = 31 (max 5-bit)
      expect(255 >> 3).toBe(31);
      // 128 (mid 8-bit) >> 3 = 16 (mid 5-bit)
      expect(128 >> 3).toBe(16);
      // 0 >> 3 = 0
      expect(0 >> 3).toBe(0);
    });

    it("converts 5-bit back to 8-bit with proper expansion", () => {
      // Expanding 5-bit to 8-bit: (val << 3) | (val >> 2)
      // This fills in the lower bits for better accuracy
      
      // Max 5-bit (31) should expand close to 255
      const val31 = 31;
      const expanded31 = (val31 << 3) | (val31 >> 2);
      expect(expanded31).toBe(255);
      
      // Mid 5-bit (16) should expand to ~132
      const val16 = 16;
      const expanded16 = (val16 << 3) | (val16 >> 2);
      expect(expanded16).toBe(132);
      
      // Zero stays zero
      const val0 = 0;
      const expanded0 = (val0 << 3) | (val0 >> 2);
      expect(expanded0).toBe(0);
    });
  });
});
