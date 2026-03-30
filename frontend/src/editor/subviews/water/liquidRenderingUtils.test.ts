import { describe, expect, it } from "vitest";
import { getLiquidCoverageOpacity } from "./liquidRenderingUtils";

describe("getLiquidCoverageOpacity", () => {
  it("returns zero when fully below terrain", () => {
    expect(getLiquidCoverageOpacity(100, [120, 130, 125])).toBe(0);
  });

  it("returns 0.9 when fully above terrain", () => {
    expect(getLiquidCoverageOpacity(150, [120, 130, 125])).toBeCloseTo(0.9);
  });

  it("returns a partial opacity for mixed samples", () => {
    expect(getLiquidCoverageOpacity(125, [120, 130, 125])).toBeCloseTo(0.6);
  });
});
