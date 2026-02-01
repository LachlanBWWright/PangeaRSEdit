/**
 * Integration tests for spline editing functionality
 */

import { describe, it, expect } from "vitest";
import { Game } from "@/data/globals/globals";
import { 
  detectSplineType, 
  SplineType,
  shouldShowFirstNub,
  shouldSyncFirstAndLastNubs,
  gameUsesNonCircularSplines,
} from "@/data/splines/splineTypeDetection";

describe("Spline Type Detection Integration", () => {
  describe("Real-world spline patterns", () => {
    it("detects Otto Matic patrol path as circular", () => {
      // Typical enemy patrol path - starts and ends at same point
      const patrolNubs = [
        { x: 1000, z: 1000 },
        { x: 1200, z: 1000 },
        { x: 1200, z: 1200 },
        { x: 1000, z: 1200 },
        { x: 1000, z: 1000 }, // Same as first
      ];
      
      expect(detectSplineType(patrolNubs)).toBe(SplineType.CIRCULAR);
    });

    it("detects Billy Frontier shootout lane as open", () => {
      // Camera path in shootout scene - distinct start and end
      const cameraNubs = [
        { x: 0, z: 500 },
        { x: 200, z: 480 },
        { x: 400, z: 460 },
        { x: 600, z: 440 },
        { x: 800, z: 420 },
      ];
      
      expect(detectSplineType(cameraNubs)).toBe(SplineType.OPEN);
    });

    it("detects race track segment as circular", () => {
      // Cro-Mag Rally track segment - closed loop
      const trackNubs = [
        { x: 500, z: 500 },
        { x: 600, z: 400 },
        { x: 700, z: 500 },
        { x: 600, z: 600 },
        { x: 500, z: 500 }, // Same as first
      ];
      
      expect(detectSplineType(trackNubs)).toBe(SplineType.CIRCULAR);
    });

    it("detects stampede lane as open", () => {
      // Billy Frontier stampede - straight lane with distinct endpoints
      const stampedeLaneNubs = [
        { x: 0, z: 1000 },
        { x: 500, z: 1000 },
        { x: 1000, z: 1000 },
        { x: 1500, z: 1000 },
        { x: 2000, z: 1000 },
      ];
      
      expect(detectSplineType(stampedeLaneNubs)).toBe(SplineType.OPEN);
    });
  });

  describe("Edge cases in level data", () => {
    it("handles nearly-closed splines within threshold", () => {
      // Splines may not be exactly closed due to editor rounding
      // Threshold is 5 units
      const nearlyClosedNubs = [
        { x: 1000, z: 1000 },
        { x: 1200, z: 1100 },
        { x: 1004, z: 1004 }, // Within 5 units of first
      ];
      
      expect(detectSplineType(nearlyClosedNubs)).toBe(SplineType.CIRCULAR);
    });

    it("handles splines just outside threshold", () => {
      // Splines just outside the threshold should be open
      const justOutsideNubs = [
        { x: 1000, z: 1000 },
        { x: 1200, z: 1100 },
        { x: 1006, z: 1006 }, // Beyond 5 units
      ];
      
      expect(detectSplineType(justOutsideNubs)).toBe(SplineType.OPEN);
    });

    it("handles negative coordinates", () => {
      // Level coordinates can be negative
      const negativeNubs = [
        { x: -500, z: -500 },
        { x: -300, z: -400 },
        { x: -500, z: -500 }, // Same as first
      ];
      
      expect(detectSplineType(negativeNubs)).toBe(SplineType.CIRCULAR);
    });

    it("handles very large coordinates", () => {
      // Large level coordinates
      const largeNubs = [
        { x: 50000, z: 50000 },
        { x: 51000, z: 50500 },
        { x: 50500, z: 51000 },
        { x: 50000, z: 50000 }, // Same as first
      ];
      
      expect(detectSplineType(largeNubs)).toBe(SplineType.CIRCULAR);
    });

    it("handles decimal coordinates", () => {
      // Sub-pixel coordinates from calculations
      const decimalNubs = [
        { x: 100.5, z: 200.3 },
        { x: 150.7, z: 250.9 },
        { x: 100.5, z: 200.3 }, // Same as first
      ];
      
      expect(detectSplineType(decimalNubs)).toBe(SplineType.CIRCULAR);
    });
  });

  describe("Helper function consistency", () => {
    it("shouldShowFirstNub is opposite for circular and open", () => {
      expect(shouldShowFirstNub(SplineType.CIRCULAR)).toBe(false);
      expect(shouldShowFirstNub(SplineType.OPEN)).toBe(true);
    });

    it("shouldSyncFirstAndLastNubs only for circular", () => {
      expect(shouldSyncFirstAndLastNubs(SplineType.CIRCULAR)).toBe(true);
      expect(shouldSyncFirstAndLastNubs(SplineType.OPEN)).toBe(false);
    });

    it("Billy Frontier uses non-circular splines", () => {
      expect(gameUsesNonCircularSplines(Game.BILLY_FRONTIER)).toBe(true);
    });

    it("other games use circular splines by default", () => {
      expect(gameUsesNonCircularSplines(Game.OTTO_MATIC)).toBe(false);
      expect(gameUsesNonCircularSplines(Game.BUGDOM)).toBe(false);
      expect(gameUsesNonCircularSplines(Game.CRO_MAG)).toBe(false);
    });
  });

  describe("Spline manipulation scenarios", () => {
    it("spline becomes circular after moving last nub to first position", () => {
      // User drags last nub to match first
      const initialNubs = [
        { x: 100, z: 100 },
        { x: 200, z: 100 },
        { x: 200, z: 200 },
        { x: 150, z: 250 }, // Different from first
      ];
      
      expect(detectSplineType(initialNubs)).toBe(SplineType.OPEN);
      
      // After user drags last nub to first position
      const closedNubs = [
        { x: 100, z: 100 },
        { x: 200, z: 100 },
        { x: 200, z: 200 },
        { x: 100, z: 100 }, // Now same as first
      ];
      
      expect(detectSplineType(closedNubs)).toBe(SplineType.CIRCULAR);
    });

    it("spline becomes open after moving last nub away from first", () => {
      // User drags last nub away from first
      const initialNubs = [
        { x: 100, z: 100 },
        { x: 200, z: 100 },
        { x: 200, z: 200 },
        { x: 100, z: 100 }, // Same as first
      ];
      
      expect(detectSplineType(initialNubs)).toBe(SplineType.CIRCULAR);
      
      // After user drags last nub away
      const openedNubs = [
        { x: 100, z: 100 },
        { x: 200, z: 100 },
        { x: 200, z: 200 },
        { x: 150, z: 250 }, // Now different from first
      ];
      
      expect(detectSplineType(openedNubs)).toBe(SplineType.OPEN);
    });
  });
});
