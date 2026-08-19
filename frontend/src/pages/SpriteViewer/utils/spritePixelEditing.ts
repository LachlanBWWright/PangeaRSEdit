import type { ShapeFrame } from "@/parsers/mightyMikeShapesParser";

export type SpritePixelEdit =
  | { mode: "paint"; paletteIndex: number }
  | { mode: "erase" };

function createOpaqueMask(pixelCount: number): Uint8Array {
  return new Uint8Array(pixelCount);
}

export function editShapeFramePixel(
  frame: ShapeFrame,
  pixelIndex: number,
  edit: SpritePixelEdit,
): ShapeFrame {
  if (pixelIndex < 0 || pixelIndex >= frame.pixels.length) {
    return frame;
  }

  const pixels = new Uint8Array(frame.pixels);
  const mask = frame.mask
    ? new Uint8Array(frame.mask)
    : createOpaqueMask(frame.pixels.length);

  if (edit.mode === "erase") {
    mask[pixelIndex] = 0xff;
  } else {
    pixels[pixelIndex] = edit.paletteIndex;
    mask[pixelIndex] = 0x00;
  }

  return { ...frame, pixels, mask };
}
