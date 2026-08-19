import { describe, expect, it } from "vitest";
import { snapCanvasPointAtScale } from "@/editor/subviews/shared/nubSnapping";

describe("nub snapping", () => {
  it("snaps to the closest target inside the screen-space threshold", () => {
    expect(snapCanvasPointAtScale([20, 20], [[10, 20], [17, 20]], 1)).toEqual([
      17, 20,
    ]);
  });

  it("leaves points outside the threshold unsnapped", () => {
    expect(snapCanvasPointAtScale([30, 20], [[10, 20]], 1)).toEqual([30, 20]);
  });

  it("keeps the threshold constant in screen space while zoomed", () => {
    expect(snapCanvasPointAtScale([18, 10], [[10, 10]], 2)).toEqual([18, 10]);
    expect(snapCanvasPointAtScale([18, 10], [[10, 10]], 0.5)).toEqual([
      10, 10,
    ]);
  });
});
