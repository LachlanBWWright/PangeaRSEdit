import { describe, expect, it, vi } from "vitest";
import type { SpriteData } from "@/pages/SpriteViewer/types";
import type { Palette } from "@/pages/SpriteViewer/utils/paletteUtils";
import { readSpriteProject, spriteProjectFiles } from "./spriteProjectFiles";
import { parseShapesFile } from "@/parsers/mightyMikeShapesParser";

// jsdom's File lacks the browser's text/arrayBuffer methods.
class ReadableFile extends File {
  constructor(private readonly content: Uint8Array, name: string) { super([Uint8Array.from(content)], name); }
  public override async text(): Promise<string> { return new TextDecoder().decode(this.content); }
  public override async arrayBuffer(): Promise<ArrayBuffer> { return Uint8Array.from(this.content).buffer; }
}

const palette: Palette = { name: "Edited palette", colors: Array.from({ length: 256 }, (_, index) => index === 1 ? { r: 255, g: 128, b: 64 } : { r: index, g: index, b: index }) };
const sprite: SpriteData = {
  type: "sprites", filename: "sprite", sourceBytes: new Uint8Array([0, 255, 128]).buffer,
  data: { colorTable: palette.colors, shapes: [{ shapeIndex: 0, frames: [{
    header: { width: 2, height: 1, offsetX: -3, offsetY: 7, pixelOffset: 0, maskOffset: 0 },
    pixels: new Uint8Array([0, 1]), mask: new Uint8Array([255, 0]),
  }], animations: [{ animationIndex: 0, commands: [{ opcode: 1, operand: 2 }] }] }] },
};

async function reopen(snapshot: unknown, companions = [new ReadableFile(new Uint8Array(sprite.sourceBytes), "sprite.shapes")]) {
  return readSpriteProject(new ReadableFile(new TextEncoder().encode(JSON.stringify(snapshot)), "sprite.sprite.json"), companions);
}
function snapshot() {
  return { kind: "pangea-sprite", version: 1, palette, colorTable: palette.colors,
    shapes: [{ shapeIndex: 1, frames: [{ header: sprite.data.shapes[0]?.frames[0]?.header,
      pixels: [0, 1], mask: [255, 0] }], animations: [{ animationIndex: 0, commands: [{ opcode: 1, operand: 2 }] }] }] };
}

describe("sprite project persistence", () => {
  it("round-trips editable state and produces edited native Shapes bytes", async () => {
    const files = spriteProjectFiles("Assets/sprites/sprite", sprite, palette);
    expect(files.isOk()).toBe(true);
    if (files.isErr()) return;
    expect(files.value.map((file) => file.path)).toEqual(["Assets/sprites/sprite.sprite.json", "Assets/sprites/sprite.shapes", "Assets/sprites/sprite.palette.tga"]);
    const companions = files.value.map((file) => new ReadableFile(file.bytes, file.path.split("/").at(-1) ?? ""));
    const saved = companions.find((file) => file.name.endsWith(".sprite.json"));
    expect(saved).toBeDefined();
    if (!saved) return;
    const loaded = await readSpriteProject(saved, companions);
    const native = files.value.find((file) => file.path.endsWith(".shapes"));
    expect(native).toBeDefined();
    if (!native) return;
    expect(loaded.isOk() && loaded.value).toEqual({ data: { ...sprite, sourceBytes: native.bytes.buffer }, palette });
    const parsed = parseShapesFile(Uint8Array.from(native.bytes).buffer);
    expect(parsed.isOk() && parsed.value.shapes[0]?.frames[0]?.pixels).toEqual(new Uint8Array([0, 1]));
  });

  it("reports a missing original source instead of silently losing it", async () => {
    const loaded = await reopen(snapshot(), []);
    expect(loaded.isErr() && loaded.error).toContain("original .shapes");
  });

  it("returns a typed failure for invalid JSON and no loaded sprite", async () => {
    expect(spriteProjectFiles("sprite", null, palette).isErr()).toBe(true);
    const loaded = await readSpriteProject(new ReadableFile(new TextEncoder().encode("invalid JSON"), "sprite.sprite.json"), []);
    expect(loaded.isErr() && loaded.error).toBe("Invalid sprite snapshot JSON");
  });

  it.each([
    { ...snapshot(), version: 99 },
    { ...snapshot(), palette: { ...palette, colors: [{ r: 256, g: 0, b: 0 }] } },
    { ...snapshot(), shapes: [{ shapeIndex: 1, frames: [{ header: { width: 2, height: 2, offsetX: 0, offsetY: 0, pixelOffset: 0, maskOffset: 0 }, pixels: [0], mask: [] }], animations: [] }] },
    { ...snapshot(), shapes: [{ shapeIndex: 1, frames: [{ header: { width: 1, height: 1, offsetX: 0, offsetY: 0, pixelOffset: 0, maskOffset: 0 }, pixels: [256] }], animations: [] }] },
  ])("rejects malformed snapshots before constructing typed pixel arrays: %j", async (value) => {
    const loaded = await reopen(value);
    expect(loaded.isErr() && loaded.error).toBe("Invalid sprite snapshot");
  });

  it("encodes current TGA pixels instead of saving stale source bytes", () => {
    const colors = Array.from({ length: 256 }, (_, i) => ({ r: i, g: i, b: i }));
    const canvas = document.createElement("canvas");
    canvas.width = 1; canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(1, 1);
    image.data.set([42, 42, 42, 255]);
    vi.spyOn(context, "getImageData").mockReturnValueOnce(image);
    const files = spriteProjectFiles("Assets/sprites/texture", { type: "tga", data: canvas,
      filename: "texture", sourceBytes: sprite.sourceBytes }, { name: "Gray", colors });
    expect(files.isOk()).toBe(true);
    expect(files.isOk() && files.value[0]?.bytes[2]).toBe(1);
  });
});
