import { describe, expect, it } from "vitest";
import { getSpritePixelIndex } from "@/pages/SpriteViewer/utils/spriteRendering";
import type { SpriteRenderParams } from "@/pages/SpriteViewer/types";

const params: SpriteRenderParams = {
  originX: 20,
  originY: 30,
  zoom: 2,
  spriteOffsetX: 5,
  spriteOffsetY: 4,
  spriteW: 8,
  spriteH: 6,
};

describe("getSpritePixelIndex", () => {
  it("maps a canvas coordinate to the sprite pixel", () => {
    expect(getSpritePixelIndex(params, 10, 22)).toBe(0);
    expect(getSpritePixelIndex(params, 24, 28)).toBe(31);
  });

  it("returns null for coordinates outside the sprite bounds", () => {
    expect(getSpritePixelIndex(params, 9, 24)).toBeNull();
    expect(getSpritePixelIndex(params, 30, 34)).toBeNull();
  });

  it("handles zoomed pixels without treating their interior as separate pixels", () => {
    expect(getSpritePixelIndex(params, 11, 23)).toBe(0);
    expect(getSpritePixelIndex(params, 12, 24)).toBe(9);
  });
});
