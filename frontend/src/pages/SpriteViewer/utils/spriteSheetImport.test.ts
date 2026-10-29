import { describe, expect, it } from "vitest";
import type { Shape } from "@/parsers/mightyMikeShapesParser";
import { parseSpriteSheet, previewSpriteSheet } from "./spriteSheetImport";

const shape: Shape = { shapeIndex: 0, flags: 17, frames: [{ header: { width: 1, height: 1, offsetX: -7, offsetY: 9, pixelOffset: 0, maskOffset: 0 },
  pixels: new Uint8Array([5]) }], animations: [{ animationIndex: 0, commands: [{ opcode: 5, operand: 12 }, { opcode: 0, operand: 0 }] }] };
const palette = Array.from({ length: 256 }, (_, index) => ({ r: index, g: 0, b: 0 }));
const metadata = { frames: [{ filename: "walk", frame: { x: 0, y: 0, w: 1, h: 1 }, duration: 120 }] };

describe("external sprite sheet conversion", () => {
  it("retains native animation commands, flags and origins without translating source durations", () => {
    const parsed = parseSpriteSheet(metadata);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    const result = previewSpriteSheet(shape, parsed.value, new Uint8ClampedArray([5, 0, 0, 255]), 1, 1, palette);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.shape.animations).toEqual(shape.animations);
    expect(result.value.shape.flags).toBe(17);
    expect(result.value.shape.frames[0]?.header).toMatchObject({ offsetX: -7, offsetY: 9 });
    expect(result.value.frames[0]).toMatchObject({ name: "walk", durationMs: 120 });
    expect(result.value.changedColors).toBe(0);
  });

  it("restores trimmed transparent pixels and reports palette and alpha compromises", () => {
    const parsed = parseSpriteSheet({ frames: { trimmed: { frame: { x: 0, y: 0, w: 1, h: 1 }, trimmed: true,
      spriteSourceSize: { x: 1, y: 1, w: 1, h: 1 }, sourceSize: { w: 2, h: 2 } } } });
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    const result = previewSpriteSheet(shape, parsed.value, new Uint8ClampedArray([5, 4, 0, 200]), 1, 1, palette);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.shape.frames[0]?.mask).toEqual(new Uint8Array([255, 255, 255, 0]));
    expect(result.value.shape.frames[0]?.pixels).toEqual(new Uint8Array([0, 0, 0, 5]));
    expect(result.value.changedColors).toBe(1);
    expect(result.value.partialAlpha).toBe(1);
  });

  it("rejects rotated, invalid trimmed, out of bounds or different frame counts", () => {
    expect(parseSpriteSheet({ frames: [{ ...metadata.frames[0], rotated: true }] }).isErr()).toBe(true);
    expect(parseSpriteSheet({ frames: [{ ...metadata.frames[0], sourceSize: { w: 1, h: 1 }, spriteSourceSize: { x: 1, y: 0, w: 1, h: 1 } }] }).isErr()).toBe(true);
    const parsed = parseSpriteSheet(metadata);
    if (parsed.isErr()) return;
    const first = parsed.value[0];
    if (!first) return;
    expect(previewSpriteSheet({ ...shape, frames: [] }, parsed.value, new Uint8ClampedArray(4), 1, 1, palette).isErr()).toBe(true);
    expect(previewSpriteSheet(shape, parsed.value, new Uint8ClampedArray(0), 0, 0, palette).isErr()).toBe(true);
    expect(previewSpriteSheet(shape, [{ ...first, region: { x: 1, y: 0, w: 1, h: 1 } }], new Uint8ClampedArray(4), 1, 1, palette).isErr()).toBe(true);
  });
});
