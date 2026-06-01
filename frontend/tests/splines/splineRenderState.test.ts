import { describe, expect, it } from "vitest";
import { getSplinePointGenerationInput } from "@/editor/subviews/splines/splineUtils";
import { getPreviewSplinePoints } from "@/editor/subviews/splines/splineRenderState";

describe("spline render state", () => {
  it("keeps the duplicate endpoint when generating circular spline points", () => {
    const nubs = [
      { x: 0, z: 0 },
      { x: 20, z: 0 },
      { x: 20, z: 20 },
      { x: 0, z: 0 },
    ];

    const input = getSplinePointGenerationInput(nubs);

    expect(input.isCircular).toBe(true);
    expect(input.workingNubs).toEqual(nubs);
  });

  it("renders the final visible span of a circular spline preview", () => {
    const previewPoints = getPreviewSplinePoints(
      [
        { x: 0, z: 0 },
        { x: 20, z: 0 },
        { x: 20, z: 20 },
        { x: 0, z: 0 },
      ],
      true,
    );

    const includesPenultimateNub = previewPoints.some((value, index) => {
      const nextValue = previewPoints[index + 1];
      return index % 2 === 0 && value === 20 && nextValue === 20;
    });

    expect(includesPenultimateNub).toBe(true);
  });
});
