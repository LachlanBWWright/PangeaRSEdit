import { afterEach, describe, expect, test, vi } from "vitest";
import {
  buildCollisionCanvas,
  buildParamsCanvas,
} from "@/editor/subviews/supertiles/mightyMikeSupertilesHelpers";

function createFillRectSpy() {
  return vi.spyOn(CanvasRenderingContext2D.prototype, "fillRect");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Mighty Mike overlays", () => {
  test("collision overlay still renders for logical tile zero when the mask flag is enabled", () => {
    const fillRectSpy = createFillRectSpy();

    const canvas = buildCollisionCanvas(
      1,
      1,
      [0],
      [],
      [
        {
          rawValue: 0x8000,
          tileIndex: 0,
          hasCollisionMask: true,
          usePixelAccurateCollision: false,
        },
      ],
    );

    expect(canvas).not.toBeNull();
    expect(fillRectSpy).toHaveBeenCalled();
  });

  test("params overlay still renders for logical tile zero when the tile has gameplay flags", () => {
    const fillRectSpy = createFillRectSpy();

    const canvas = buildParamsCanvas(
      "flagsAny",
      0,
      [{ flags: 1, p0: 0, p1: 0 }],
      1,
      1,
      [0],
    );

    expect(canvas).not.toBeNull();
    expect(fillRectSpy).toHaveBeenCalled();
  });

  test("solid side overlay renders edge markers when a solid-side bit is enabled", () => {
    const fillRectSpy = createFillRectSpy();

    const canvas = buildParamsCanvas(
      "solidEdges",
      0,
      [{ flags: 1, p0: 0, p1: 0 }],
      1,
      1,
      [0],
    );

    expect(canvas).not.toBeNull();
    expect(fillRectSpy).toHaveBeenCalled();
  });
});
