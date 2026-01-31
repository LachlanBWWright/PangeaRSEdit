import { describe, it, expect } from "vitest";
import {
  SplineType,
  detectSplineType,
  gameUsesNonCircularSplines,
  shouldShowFirstNub,
  shouldSyncFirstAndLastNubs,
} from "@/data/splines/splineTypeDetection";
import { Game } from "@/data/globals/globals";

describe("Spline Type Detection", () => {
  describe("detectSplineType", () => {
    it("should detect circular spline when first and last nub are at same position", () => {
      const nubs = [
        { x: 100, z: 200 },
        { x: 150, z: 250 },
        { x: 200, z: 200 },
        { x: 100, z: 200 }, // Same as first
      ];
      expect(detectSplineType(nubs)).toBe(SplineType.CIRCULAR);
    });

    it("should detect circular spline with small position differences within threshold", () => {
      const nubs = [
        { x: 100, z: 200 },
        { x: 150, z: 250 },
        { x: 200, z: 200 },
        { x: 102, z: 203 }, // Within 5 unit threshold
      ];
      expect(detectSplineType(nubs)).toBe(SplineType.CIRCULAR);
    });

    it("should detect open spline when first and last nub are at different positions", () => {
      const nubs = [
        { x: 100, z: 200 },
        { x: 150, z: 250 },
        { x: 200, z: 300 }, // Different from first
      ];
      expect(detectSplineType(nubs)).toBe(SplineType.OPEN);
    });

    it("should return OPEN for splines with less than 2 nubs", () => {
      expect(detectSplineType([])).toBe(SplineType.OPEN);
      expect(detectSplineType([{ x: 100, z: 200 }])).toBe(SplineType.OPEN);
    });

    it("should detect open spline when positions differ beyond threshold", () => {
      const nubs = [
        { x: 100, z: 200 },
        { x: 150, z: 250 },
        { x: 110, z: 220 }, // 10 and 20 units away - beyond 5 unit threshold
      ];
      expect(detectSplineType(nubs)).toBe(SplineType.OPEN);
    });
  });

  describe("gameUsesNonCircularSplines", () => {
    it("should return true for Billy Frontier", () => {
      expect(gameUsesNonCircularSplines(Game.BILLY_FRONTIER)).toBe(true);
    });

    it("should return false for other games", () => {
      expect(gameUsesNonCircularSplines(Game.OTTO_MATIC)).toBe(false);
      expect(gameUsesNonCircularSplines(Game.BUGDOM)).toBe(false);
      expect(gameUsesNonCircularSplines(Game.BUGDOM_2)).toBe(false);
      expect(gameUsesNonCircularSplines(Game.NANOSAUR)).toBe(false);
      expect(gameUsesNonCircularSplines(Game.NANOSAUR_2)).toBe(false);
      expect(gameUsesNonCircularSplines(Game.CRO_MAG)).toBe(false);
    });
  });

  describe("shouldShowFirstNub", () => {
    it("should return true for open splines (both endpoints visible)", () => {
      expect(shouldShowFirstNub(SplineType.OPEN)).toBe(true);
    });

    it("should return false for circular splines (merged first/last)", () => {
      expect(shouldShowFirstNub(SplineType.CIRCULAR)).toBe(false);
    });
  });

  describe("shouldSyncFirstAndLastNubs", () => {
    it("should return true for circular splines (move last = move first)", () => {
      expect(shouldSyncFirstAndLastNubs(SplineType.CIRCULAR)).toBe(true);
    });

    it("should return false for open splines (independent endpoints)", () => {
      expect(shouldSyncFirstAndLastNubs(SplineType.OPEN)).toBe(false);
    });
  });
});
