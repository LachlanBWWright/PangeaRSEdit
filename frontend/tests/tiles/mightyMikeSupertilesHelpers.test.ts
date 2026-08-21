import { afterEach, describe, expect, test, vi } from "vitest";
import {
  buildCollisionCanvas,
  buildParamsCanvas,
} from "@/editor/subviews/supertiles/mightyMikeSupertilesHelpers";
import { parseTileImages } from "@/modelParsers/parseMightyMikeHelpers";

function createFillRectSpy() {
  return vi.spyOn(CanvasRenderingContext2D.prototype, "fillRect");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Mighty Mike overlays", () => {
  test("sprite-priority colors remain visible in the terrain background", () => {
    const putImageDataSpy = vi.spyOn(
      CanvasRenderingContext2D.prototype,
      "putImageData",
    );
    const tileBytes = new Uint8Array(32 * 32).fill(17);
    const palette = new Uint8Array(256 * 4);
    palette.set([24, 48, 72, 255], 17 * 4);

    parseTileImages(
      tileBytes.buffer,
      0,
      1,
      [17],
      palette,
    );
    const terrainImageData = putImageDataSpy.mock.calls[0]?.[0];
    const maskImageData = putImageDataSpy.mock.calls[1]?.[0];

    expect(Array.from(terrainImageData?.data.slice(0, 4) ?? [])).toEqual([
      24, 48, 72, 255,
    ]);
    expect(maskImageData?.data[3]).toBe(0);
  });

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
