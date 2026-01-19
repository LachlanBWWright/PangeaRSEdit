/**
 * Tests for spline detection utilities
 */

import { describe, it, expect } from "vitest";
import {
  isSplineCircular,
  getSplineCircularInfo,
} from "@/data/splines/splineTypes";
import {
  shouldTreatAsCircular,
  getSplineRenderOptions,
  getSplineTypeDescription,
} from "@/data/splines/splineDetection";
import { Game } from "@/data/globals/globals";
import type { SplinePoint } from "@/python/structSpecs/LevelTypes";

function createNubs(coords: [number, number][]): SplinePoint[] {
  return coords.map(([x, z]) => ({ x, z }));
}

describe("splineTypes", () => {
  describe("isSplineCircular", () => {
    it("should return true when first and last nubs match", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 100], // Same as first
      ]);

      expect(isSplineCircular(nubs)).toBe(true);
    });

    it("should return true when positions are within threshold", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [200, 200],
        [100.5, 100.5], // Within default threshold of 1.0
      ]);

      expect(isSplineCircular(nubs, 1.0)).toBe(true);
    });

    it("should return false when first and last nubs differ", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [200, 200],
        [300, 300], // Different from first
      ]);

      expect(isSplineCircular(nubs)).toBe(false);
    });

    it("should return false for single nub", () => {
      const nubs = createNubs([[100, 100]]);

      expect(isSplineCircular(nubs)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(isSplineCircular([])).toBe(false);
    });

    it("should respect custom threshold", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [200, 200],
        [103, 103], // 4.24 distance from first
      ]);

      expect(isSplineCircular(nubs, 1.0)).toBe(false);
      expect(isSplineCircular(nubs, 5.0)).toBe(true);
    });
  });

  describe("getSplineCircularInfo", () => {
    it("should return info for circular spline", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [100, 100],
      ]);

      const info = getSplineCircularInfo(nubs);

      expect(info.isCircular).toBe(true);
      expect(info.endpointDistance).toBe(0);
    });

    it("should return info for non-circular spline", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [200, 200], // 141.42 from first
      ]);

      const info = getSplineCircularInfo(nubs);

      expect(info.isCircular).toBe(false);
      expect(info.endpointDistance).toBeCloseTo(141.42, 1);
    });

    it("should handle empty array", () => {
      const info = getSplineCircularInfo([]);

      expect(info.isCircular).toBe(false);
      expect(info.endpointDistance).toBe(0);
    });
  });
});

describe("splineDetection", () => {
  describe("shouldTreatAsCircular", () => {
    it("should treat most games as circular when endpoints match", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [100, 100],
      ]);

      expect(shouldTreatAsCircular(Game.OTTO_MATIC, nubs)).toBe(true);
      expect(shouldTreatAsCircular(Game.BUGDOM, nubs)).toBe(true);
      expect(shouldTreatAsCircular(Game.NANOSAUR, nubs)).toBe(true);
    });

    it("should treat most games as non-circular when endpoints differ", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [300, 300],
      ]);

      expect(shouldTreatAsCircular(Game.OTTO_MATIC, nubs)).toBe(false);
    });

    it("should use tighter threshold for Billy Frontier", () => {
      // Endpoints within general threshold (1.0) but still treated as non-circular
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [300, 300], // Clear difference
      ]);

      expect(shouldTreatAsCircular(Game.BILLY_FRONTIER, nubs)).toBe(false);
    });

    it("should treat Billy Frontier as circular when endpoints clearly match", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 100], // Exact match
      ]);

      expect(shouldTreatAsCircular(Game.BILLY_FRONTIER, nubs)).toBe(true);
    });
  });

  describe("getSplineRenderOptions", () => {
    it("should show endpoints for non-circular splines", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [300, 300],
      ]);

      const options = getSplineRenderOptions(Game.OTTO_MATIC, nubs);

      expect(options.circular).toBe(false);
      expect(options.showEndpoints).toBe(true);
    });

    it("should hide endpoints for circular splines", () => {
      const nubs = createNubs([
        [100, 100],
        [200, 100],
        [100, 100],
      ]);

      const options = getSplineRenderOptions(Game.OTTO_MATIC, nubs);

      expect(options.circular).toBe(true);
      expect(options.showEndpoints).toBe(false);
    });
  });

  describe("getSplineTypeDescription", () => {
    it("should describe circular splines", () => {
      const desc = getSplineTypeDescription(true);

      expect(desc).toContain("Circular");
      expect(desc).toContain("closed");
    });

    it("should describe non-circular splines", () => {
      const desc = getSplineTypeDescription(false);

      expect(desc).toContain("Linear");
      expect(desc).toContain("open");
    });
  });
});
