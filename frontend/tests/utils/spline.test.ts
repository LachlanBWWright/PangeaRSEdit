import { describe, expect, test } from "vitest";
import { getPoints } from "@/utils/spline";

describe("getPoints", () => {
  test("does not append bogus origin points when closing circular splines", () => {
    const points = getPoints(
      [
        { x: 100, z: 100 },
        { x: 120, z: 100 },
        { x: 120, z: 120 },
        { x: 100, z: 120 },
      ],
      true,
    );

    expect(points.length).toBeGreaterThan(0);
    expect(points.some((point) => point.x === 0 && point.z === 0)).toBe(false);
    expect(Math.min(...points.map((point) => point.x))).toBeGreaterThan(95);
    expect(Math.min(...points.map((point) => point.z))).toBeGreaterThan(95);
  });
});
