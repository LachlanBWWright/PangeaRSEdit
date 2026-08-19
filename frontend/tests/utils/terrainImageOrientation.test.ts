import { describe, expect, it } from "vitest";
import { flipRgbaRowsVertically } from "@/data/terrain-io/terrainImageOrientation";

function toArrayBuffer(bytes: number[]): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

describe("flipRgbaRowsVertically", () => {
  it("flips JPEG terrain rows into the editor's top-down orientation", () => {
    const bottomUpRows = toArrayBuffer([
      0, 0, 255, 255,
      0, 255, 0, 255,
      255, 0, 0, 255,
      255, 255, 0, 255,
    ]);

    const flippedResult = flipRgbaRowsVertically(bottomUpRows, 1, 4);

    expect(flippedResult.isOk()).toBe(true);
    expect(Array.from(new Uint8Array(flippedResult._unsafeUnwrap()))).toEqual([
      255, 255, 0, 255,
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
    ]);
  });

  it("round-trips when the same terrain tile is flipped twice", () => {
    const original = toArrayBuffer([
      255, 0, 0, 255,
      255, 128, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
    ]);

    const flippedOnce = flipRgbaRowsVertically(original, 1, 4);
    const flippedTwice = flippedOnce.andThen((value) =>
      flipRgbaRowsVertically(value, 1, 4),
    );

    expect(flippedTwice.isOk()).toBe(true);
    expect(Array.from(new Uint8Array(flippedTwice._unsafeUnwrap()))).toEqual(
      Array.from(new Uint8Array(original)),
    );
  });

  it("rejects RGBA buffers whose length does not match the declared dimensions", () => {
    const flippedResult = flipRgbaRowsVertically(toArrayBuffer([255, 0, 0, 255]), 2, 1);

    expect(flippedResult.isErr()).toBe(true);
    expect(flippedResult._unsafeUnwrapErr().code).toBe("terrain.decode.bad-format");
  });
});
