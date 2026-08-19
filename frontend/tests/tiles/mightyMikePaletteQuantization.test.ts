import { describe, expect, it } from "vitest";
import {
  quantizeMightyMikeTile,
  transformMightyMikePaletteIndices,
} from "@/editor/subviews/mightymike/mightyMikePaletteQuantization";

function createPalette(): number[] {
  return Array.from({ length: 256 }, (_, index) => [index, index, index, 255]).flat();
}

describe("Mighty Mike palette quantization", () => {
  it("maps transparent pixels to a configured transparent palette index", () => {
    const rgba = new Uint8ClampedArray(32 * 32 * 4);
    rgba.fill(255);
    rgba[3] = 0;
    const result = quantizeMightyMikeTile({
      rgba,
      palette: createPalette(),
      transparencyColors: [17],
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.indices[0]).toBe(17);
    expect(result.value.rgba[3]).toBe(0);
    expect(result.value.indices[1]).not.toBe(17);
  });

  it("rotates palette indices without converting through RGBA", () => {
    const indices = Array.from({ length: 32 * 32 }, (_, index) => index % 256);
    const result = transformMightyMikePaletteIndices(indices, "rotate");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value[31]).toBe(indices[0]);
    expect(result.value[32 * 32 - 1]).toBe(indices[31]);
  });
});
