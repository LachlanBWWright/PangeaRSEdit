import { err, ok, Result } from "neverthrow";
import type { LoadedData } from "@/pages/SpriteViewer/types";
import type { Palette } from "@/pages/SpriteViewer/utils/paletteUtils";
import { writeShapesFile } from "@/parsers/mightyMikeShapesWriter";
import { rlbCompress } from "@/utils/rlwDecompress";
import { z } from "zod";

const channel = z.number().int().min(0).max(255);
const paletteSchema = z.array(z.object({ r: channel, g: channel, b: channel })).length(256);

export function nativePaletteBytes(colors: Palette["colors"]) {
  if (!paletteSchema.safeParse(colors).success) return err("Native palette output requires 256 RGB colors");
  const bytes = new Uint8Array(18 + 768 + 256);
  const view = new DataView(bytes.buffer);
  bytes[1] = 1; bytes[2] = 1;
  view.setUint16(5, 256, true);
  bytes[7] = 24;
  view.setUint16(12, 256, true);
  view.setUint16(14, 1, true);
  bytes[16] = 8; bytes[17] = 0x20;
  for (const [index, color] of colors.entries()) {
    bytes[18 + index * 3] = color.b;
    bytes[19 + index * 3] = color.g;
    bytes[20 + index * 3] = color.r;
    bytes[786 + index] = index;
  }
  return ok(bytes);
}

function canvasPixels(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return err("Cannot read image pixels");
  return Result.fromThrowable(() => context.getImageData(0, 0, canvas.width, canvas.height).data, () => "Cannot read image pixels")();
}

export function encodeTga(canvas: HTMLCanvasElement, colors: Palette["colors"]) {
  if (!canvas.width || !canvas.height || canvas.width > 8192 || canvas.height > 8192) return err("Invalid TGA image dimensions");
  if (!paletteSchema.safeParse(colors).success) return err("Native TGA output requires a 256-color palette");
  const pixels = canvasPixels(canvas);
  if (pixels.isErr()) return err(pixels.error);
  const bytes = new Uint8Array(18 + 768 + canvas.width * canvas.height);
  const view = new DataView(bytes.buffer);
  bytes[1] = 1;
  bytes[2] = 1;
  view.setUint16(5, 256, true);
  bytes[7] = 24;
  view.setUint16(12, canvas.width, true);
  view.setUint16(14, canvas.height, true);
  bytes[16] = 8;
  bytes[17] = 0x20;
  for (const [index, color] of colors.entries()) {
    bytes[18 + index * 3] = color.b;
    bytes[19 + index * 3] = color.g;
    bytes[20 + index * 3] = color.r;
  }
  for (let i = 0; i < pixels.value.length; i += 4) {
    if (pixels.value[i + 3] !== 255) return err("Native TGA backgrounds require opaque pixels");
    const match = colors.findIndex((color) => color.r === pixels.value[i] && color.g === pixels.value[i + 1] && color.b === pixels.value[i + 2]);
    if (match < 0) return err("Image contains colors outside its palette");
    bytes[786 + i / 4] = match;
  }
  return ok(bytes);
}

function encodeTileset(data: Extract<NonNullable<LoadedData>, { type: "tileset" }>, palette: Palette) {
  if (!paletteSchema.safeParse(palette.colors).success) return err("Tileset output requires a 256-color palette");
  const tileset = data.data;
  const bytes = tileset.decompressedData.slice();
  const written = new Map<number, Uint8Array>();
  for (const [index, canvas] of tileset.tileImages.entries()) {
    const definition = tileset.xlateTable[index];
    if (definition === undefined || definition < 0 || !Number.isInteger(definition)) return err("Invalid tileset translation entry");
    const start = tileset.tileDataStartOffset + definition * 1024;
    if (canvas.width !== 32 || canvas.height !== 32 || start < 0 || start + 1024 > bytes.length) return err("Invalid tile dimensions or pixel offset");
    const pixels = canvasPixels(canvas);
    if (pixels.isErr()) return err(pixels.error);
    const indexed = new Uint8Array(1024);
    for (let pixel = 0; pixel < 1024; pixel++) {
      const offset = pixel * 4;
      if ((pixels.value[offset + 3] ?? 0) < 128) { indexed[pixel] = 255; continue; }
      const r = pixels.value[offset], g = pixels.value[offset + 1], b = pixels.value[offset + 2];
      const original = bytes[start + pixel] ?? 0;
      const color = palette.colors[original];
      const match = color && color.r === r && color.g === g && color.b === b ? original
        : palette.colors.findIndex((entry, i) => i !== 255 && entry.r === r && entry.g === g && entry.b === b);
      if (match < 0) return err(`Tile ${index} contains colors outside its palette`);
      indexed[pixel] = match;
    }
    const previous = written.get(definition);
    if (previous && previous.some((value, i) => value !== indexed[i])) return err("Aliased tiles contain conflicting edits");
    written.set(definition, indexed);
    bytes.set(indexed, start);
  }
  return ok(new Uint8Array(rlbCompress(bytes.buffer)));
}

export function nativeSpriteFile(data: NonNullable<LoadedData>, palette: Palette) {
  if (data.type === "sprites") return writeShapesFile(data.data).map((bytes) => ({ extension: ".shapes", bytes: new Uint8Array(bytes) }));
  if (data.type === "tga") return encodeTga(data.data, palette.colors).map((bytes) => ({ extension: ".tga", bytes }));
  return encodeTileset(data, palette).map((bytes) => ({ extension: ".tileset", bytes }));
}
