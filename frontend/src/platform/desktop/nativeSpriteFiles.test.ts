import { afterEach, expect, it, vi } from "vitest";
import { rlbDecompress } from "@/utils/rlwDecompress";
import { nativeSpriteFile, encodeTga, nativePaletteBytes } from "./nativeSpriteFiles";
import type { Palette } from "@/pages/SpriteViewer/utils/paletteUtils";
import type { TilesetData } from "@/pages/SpriteViewer/types";
import { readFilePalette } from "@/pages/SpriteViewer/utils/filePalette";
import { parseTilesetFile } from "@/parsers/mightyMikeTilesetParser";

afterEach(() => vi.restoreAllMocks());
const palette: Palette = { name: "Gray", colors: Array.from({ length: 256 }, (_, i) => ({ r: i, g: i, b: i })) };

function canvas(width: number, height: number, index: number, alpha = 255) {
  const image = document.createElement("canvas");
  image.width = width; image.height = height;
  const context = image.getContext("2d");
  if (context) {
    const pixels = context.createImageData(width, height);
    for (let i = 0; i < pixels.data.length; i += 4) pixels.data.set([index, index, index, alpha], i);
    vi.spyOn(context, "getImageData").mockReturnValue(pixels);
  }
  return image;
}

it("encodes top-origin indexed TGA with the native BGR palette and current pixel indices", () => {
  const result = encodeTga(canvas(2, 1, 42), palette.colors);
  expect(result.isOk()).toBe(true);
  if (result.isErr()) return;
  const view = new DataView(result.value.buffer);
  expect(result.value.slice(0, 3)).toEqual(new Uint8Array([0, 1, 1]));
  expect(view.getUint16(5, true)).toBe(256);
  expect(view.getUint16(12, true)).toBe(2);
  expect(result.value[16]).toBe(8);
  expect(result.value[17]).toBe(0x20);
  expect(result.value.slice(786)).toEqual(new Uint8Array([42, 42]));
  expect(encodeTga(canvas(1, 1, 5, 0), palette.colors).isErr()).toBe(true);
  expect(encodeTga(canvas(1, 1, 5), [{ r: 0, g: 0, b: 0 }]).isErr()).toBe(true);
});

function tileset(indices = [0]): TilesetData {
  const raw = new Uint8Array(1060);
  raw.fill(42, 32, 1056);
  raw.set([5, 6, 7, 8], 1056);
  return { type: "tileset", filename: "scene", sourceBytes: new ArrayBuffer(0), gridCanvas: canvas(32, 32, 42),
    data: { numTileDefinitions: indices.length, tileImages: indices.map(() => canvas(32, 32, 42)),
      xlateTable: indices, tileDataStartOffset: 32, decompressedData: raw } };
}

it("preserves raw tile metadata and duplicate palette indices while writing changed pixels", () => {
  const data = tileset();
  const changedPalette = { ...palette, colors: palette.colors.map((color, i) => i === 12 ? { r: 42, g: 42, b: 42 } : color) };
  const unchanged = nativeSpriteFile(data, changedPalette);
  if (unchanged.isErr()) return;
  const unpacked = rlbDecompress(Uint8Array.from(unchanged.value.bytes).buffer);
  expect(unpacked.isOk() && new Uint8Array(unpacked.value.data)).toEqual(data.data.decompressedData);
  data.data.tileImages[0] = canvas(32, 32, 17);
  const edited = nativeSpriteFile(data, palette);
  expect(edited.isOk()).toBe(true);
  if (edited.isErr()) return;
  const raw = rlbDecompress(Uint8Array.from(edited.value.bytes).buffer);
  if (raw.isErr()) return;
  expect(new Uint8Array(raw.value.data).slice(32, 1056)).toEqual(new Uint8Array(1024).fill(17));
  expect(new Uint8Array(raw.value.data).slice(1056)).toEqual(new Uint8Array([5, 6, 7, 8]));
});

it("rejects conflicting edits to aliases and invalid translation offsets", () => {
  const aliases = tileset([0, 0]);
  aliases.data.tileImages[1] = canvas(32, 32, 17);
  expect(nativeSpriteFile(aliases, palette).isErr()).toBe(true);
  expect(nativeSpriteFile(tileset([-1]), palette).isErr()).toBe(true);
  expect(nativeSpriteFile(tileset([999]), palette).isErr()).toBe(true);
});

class PaletteFile extends File {
  constructor(private readonly content: Uint8Array) { super([Uint8Array.from(content)], "sprite.palette.tga"); }
  override async arrayBuffer() { return Uint8Array.from(this.content).buffer; }
}

it("reopens the native palette companion and rejects truncated palettes and tilesets", async () => {
  const encoded = nativePaletteBytes(palette.colors);
  expect(encoded.isOk()).toBe(true);
  if (encoded.isErr()) return;
  const reopened = await readFilePalette(new PaletteFile(encoded.value));
  expect(reopened.isOk() && reopened.value?.slice(42 * 4, 42 * 4 + 4)).toEqual(new Uint8Array([42, 42, 42, 255]));
  expect((await readFilePalette(new PaletteFile(new Uint8Array([0])))).isErr()).toBe(true);
  expect(parseTilesetFile(new ArrayBuffer(0), palette.colors).isErr()).toBe(true);
  const bomb = new Uint8Array(8);
  new DataView(bomb.buffer).setUint32(0, 0x7fffffff);
  expect(parseTilesetFile(bomb.buffer, palette.colors).isErr()).toBe(true);
});
