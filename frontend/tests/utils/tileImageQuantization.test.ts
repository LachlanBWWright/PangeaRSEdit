import { expect, test } from "vitest";
import { quantizeRgbaToSixteenBit } from "@/utils/imageConverter";

test("quantizes RGBA to the exact RGB555 and one-bit alpha preview", () => {
  const result = quantizeRgbaToSixteenBit(
    new Uint8ClampedArray([255, 127, 9, 127, 17, 34, 51, 128]),
  );
  expect([...result]).toEqual([248, 120, 8, 0, 16, 32, 48, 255]);
});
