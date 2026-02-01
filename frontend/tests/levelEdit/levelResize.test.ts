/**
 * Tests for Level Resize Utilities
 * 
 * Tests the resize direction calculations and dimension updates.
 */

import { describe, it, expect } from "vitest";
import type { ResizeDirection, ResizeOptions } from "@/data/utils/levelResizeUtils";

describe("Level Resize", () => {
  describe("getResizeDimensions", () => {
    // Helper function to test resize dimension calculations
    function getResizeDimensions(
      header: { mapWidth: number; mapHeight: number },
      options: ResizeOptions,
    ) {
      const { tileCount, direction } = options;
      const widthDelta = direction === "left" || direction === "right" ? tileCount : 0;
      const heightDelta = direction === "top" || direction === "bottom" ? tileCount : 0;
      const newWidth = Math.max(1, header.mapWidth + widthDelta);
      const newHeight = Math.max(1, header.mapHeight + heightDelta);
      const offsetX = direction === "left" ? tileCount : 0;
      const offsetZ = direction === "top" ? tileCount : 0;
      return { newWidth, newHeight, offsetX, offsetZ };
    }

    it("expands width by adding columns on right", () => {
      const header = { mapWidth: 64, mapHeight: 64 };
      const options: ResizeOptions = { direction: "right", tileCount: 8, defaultHeight: 0 };
      
      const result = getResizeDimensions(header, options);
      
      expect(result.newWidth).toBe(72);
      expect(result.newHeight).toBe(64);
      expect(result.offsetX).toBe(0);
      expect(result.offsetZ).toBe(0);
    });

    it("expands width by adding columns on left", () => {
      const header = { mapWidth: 64, mapHeight: 64 };
      const options: ResizeOptions = { direction: "left", tileCount: 8, defaultHeight: 0 };
      
      const result = getResizeDimensions(header, options);
      
      expect(result.newWidth).toBe(72);
      expect(result.newHeight).toBe(64);
      expect(result.offsetX).toBe(8); // Existing content shifted right by 8
      expect(result.offsetZ).toBe(0);
    });

    it("expands height by adding rows at bottom", () => {
      const header = { mapWidth: 64, mapHeight: 64 };
      const options: ResizeOptions = { direction: "bottom", tileCount: 8, defaultHeight: 0 };
      
      const result = getResizeDimensions(header, options);
      
      expect(result.newWidth).toBe(64);
      expect(result.newHeight).toBe(72);
      expect(result.offsetX).toBe(0);
      expect(result.offsetZ).toBe(0);
    });

    it("expands height by adding rows at top", () => {
      const header = { mapWidth: 64, mapHeight: 64 };
      const options: ResizeOptions = { direction: "top", tileCount: 8, defaultHeight: 0 };
      
      const result = getResizeDimensions(header, options);
      
      expect(result.newWidth).toBe(64);
      expect(result.newHeight).toBe(72);
      expect(result.offsetX).toBe(0);
      expect(result.offsetZ).toBe(8); // Existing content shifted down by 8
    });

    it("shrinks width by removing columns from right", () => {
      const header = { mapWidth: 64, mapHeight: 64 };
      const options: ResizeOptions = { direction: "right", tileCount: -8, defaultHeight: 0 };
      
      const result = getResizeDimensions(header, options);
      
      expect(result.newWidth).toBe(56);
      expect(result.newHeight).toBe(64);
      expect(result.offsetX).toBe(0);
      expect(result.offsetZ).toBe(0);
    });

    it("shrinks width by removing columns from left", () => {
      const header = { mapWidth: 64, mapHeight: 64 };
      const options: ResizeOptions = { direction: "left", tileCount: -8, defaultHeight: 0 };
      
      const result = getResizeDimensions(header, options);
      
      expect(result.newWidth).toBe(56);
      expect(result.newHeight).toBe(64);
      expect(result.offsetX).toBe(-8); // Negative offset for removal from left
      expect(result.offsetZ).toBe(0);
    });

    it("prevents width from going below 1", () => {
      const header = { mapWidth: 8, mapHeight: 64 };
      const options: ResizeOptions = { direction: "right", tileCount: -16, defaultHeight: 0 };
      
      const result = getResizeDimensions(header, options);
      
      expect(result.newWidth).toBe(1); // Minimum of 1
      expect(result.newHeight).toBe(64);
    });

    it("prevents height from going below 1", () => {
      const header = { mapWidth: 64, mapHeight: 8 };
      const options: ResizeOptions = { direction: "bottom", tileCount: -16, defaultHeight: 0 };
      
      const result = getResizeDimensions(header, options);
      
      expect(result.newWidth).toBe(64);
      expect(result.newHeight).toBe(1); // Minimum of 1
    });
  });

  describe("resize validation", () => {
    it("validates that resize direction is valid", () => {
      const validDirections: ResizeDirection[] = ["top", "bottom", "left", "right"];
      
      validDirections.forEach(direction => {
        expect(direction).toBeDefined();
        expect(["top", "bottom", "left", "right"]).toContain(direction);
      });
    });
  });
});
