import { describe, expect, it } from "vitest";
import type { ShapeFrame } from "@/parsers/mightyMikeShapesParser";
import { editShapeFramePixel } from "@/pages/SpriteViewer/utils/spritePixelEditing";

function createFrame(mask?: Uint8Array): ShapeFrame {
  return {
    header: {
      width: 2,
      height: 1,
      offsetX: 0,
      offsetY: 0,
      pixelOffset: 0,
      maskOffset: 0,
    },
    pixels: new Uint8Array([12, 34]),
    mask,
  };
}

describe("editShapeFramePixel", () => {
  it("paints with a palette index and makes the pixel opaque", () => {
    const original = createFrame(new Uint8Array([0xff, 0x00]));
    const edited = editShapeFramePixel(original, 0, {
      mode: "paint",
      paletteIndex: 77,
    });

    expect([...edited.pixels]).toEqual([77, 34]);
    expect(edited.mask ? [...edited.mask] : undefined).toEqual([0x00, 0x00]);
    expect([...original.pixels]).toEqual([12, 34]);
    expect(original.mask ? [...original.mask] : undefined).toEqual([0xff, 0x00]);
  });

  it("erases through the transparency mask without changing the palette index", () => {
    const edited = editShapeFramePixel(createFrame(), 1, { mode: "erase" });

    expect([...edited.pixels]).toEqual([12, 34]);
    expect(edited.mask ? [...edited.mask] : undefined).toEqual([0x00, 0xff]);
  });

  it("leaves the frame unchanged for an out-of-range pixel", () => {
    const original = createFrame();
    expect(editShapeFramePixel(original, 2, { mode: "erase" })).toBe(original);
  });
});
