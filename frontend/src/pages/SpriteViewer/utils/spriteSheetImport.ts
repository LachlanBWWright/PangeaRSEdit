import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { RGBColor, Shape, ShapeFrame } from "@/parsers/mightyMikeShapesParser";

const size = z.object({ w: z.number().int().min(1).max(2048), h: z.number().int().min(1).max(2048) });
const rectangle = size.extend({ x: z.number().int().min(0), y: z.number().int().min(0) });
const entrySchema = z.object({ filename: z.string().optional(), frame: rectangle,
  rotated: z.boolean().default(false), trimmed: z.boolean().default(false),
  spriteSourceSize: rectangle.optional(), sourceSize: size.optional(), duration: z.number().positive().optional() });
const sheetSchema = z.object({ frames: z.union([z.array(entrySchema), z.record(z.string(), entrySchema)]) });
const arraySchema = z.array(entrySchema);

export interface SpriteSheetFrame {
  readonly name: string;
  readonly durationMs: number | null;
  readonly region: z.infer<typeof rectangle>;
  readonly source: z.infer<typeof rectangle>;
  readonly width: number;
  readonly height: number;
}

export interface SpriteSheetPreview {
  readonly shape: Shape;
  readonly frames: readonly SpriteSheetFrame[];
  readonly changedColors: number;
  readonly partialAlpha: number;
}

export function parseSpriteSheet(value: unknown): Result<SpriteSheetFrame[], string> {
  const parsed = sheetSchema.safeParse(value);
  if (!parsed.success) return err("Choose Aseprite JSON containing a frames array or dictionary.");
  const array = arraySchema.safeParse(parsed.data.frames);
  const entries = array.success ? array.data.map((entry, index) => [entry.filename ?? `Frame ${index + 1}`, entry])
    : Object.entries(parsed.data.frames);
  const frames: SpriteSheetFrame[] = [];
  for (const pair of entries) {
    const name = z.string().safeParse(pair[0]);
    const entry = entrySchema.safeParse(pair[1]);
    if (!name.success || !entry.success) return err("Invalid sprite frame entry.");
    if (entry.data.rotated) return err(`Frame ${name.data} is rotated. Export the sheet without rotation.`);
    const region = entry.data.frame;
    const original = entry.data.sourceSize ?? { w: region.w, h: region.h };
    const source = entry.data.spriteSourceSize ?? { x: 0, y: 0, w: region.w, h: region.h };
    if (source.w !== region.w || source.h !== region.h || source.x + source.w > original.w || source.y + source.h > original.h)
      return err(`Frame ${name.data} has invalid trimmed bounds.`);
    frames.push({ name: name.data, durationMs: entry.data.duration ?? null, region, source, width: original.w, height: original.h });
  }
  if (!frames.length || frames.length > 1000) return err("Import between 1 and 1000 frames.");
  if (frames.reduce((total, frame) => total + frame.width * frame.height * 2, 0) > 128 * 1024 * 1024)
    return err("Sprite frames exceed the 128 MiB native asset budget.");
  return ok(frames);
}

function paletteIndex(red: number, green: number, blue: number, colors: readonly RGBColor[]): { index: number; changed: boolean } {
  let index = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (const [candidate, color] of colors.entries()) {
    const next = (red - color.r) ** 2 + (green - color.g) ** 2 + (blue - color.b) ** 2;
    if (next >= distance) continue;
    index = candidate;
    distance = next;
    if (next === 0) break;
  }
  return { index, changed: distance !== 0 };
}

function convertFrame(frame: SpriteSheetFrame, image: Uint8ClampedArray, imageWidth: number, palette: readonly RGBColor[], original: ShapeFrame) {
  const pixels = new Uint8Array(frame.width * frame.height);
  const mask = new Uint8Array(pixels.length).fill(255);
  let changedColors = 0;
  let partialAlpha = 0;
  for (let y = 0; y < frame.region.h; y++) {
    for (let x = 0; x < frame.region.w; x++) {
      const sourceIndex = ((frame.region.y + y) * imageWidth + frame.region.x + x) * 4;
      const alpha = image[sourceIndex + 3] ?? 0;
      if (alpha !== 0 && alpha !== 255) partialAlpha++;
      if (alpha < 128) continue;
      const destination = (frame.source.y + y) * frame.width + frame.source.x + x;
      const color = paletteIndex(image[sourceIndex] ?? 0, image[sourceIndex + 1] ?? 0, image[sourceIndex + 2] ?? 0, palette);
      pixels[destination] = color.index;
      mask[destination] = 0;
      if (color.changed) changedColors++;
    }
  }
  return { frame: { header: { ...original.header, width: frame.width, height: frame.height }, pixels, mask }, changedColors, partialAlpha };
}

export function previewSpriteSheet(shape: Shape, frames: readonly SpriteSheetFrame[], image: Uint8ClampedArray,
  imageWidth: number, imageHeight: number, palette: readonly RGBColor[]): Result<SpriteSheetPreview, string> {
  if (palette.length !== 256) return err("Select the native 256-color palette before importing.");
  if (frames.length !== shape.frames.length) return err(`This shape has ${shape.frames.length} frames. Export the same frame count to preserve native animation commands.`);
  if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight) || imageWidth < 1 || imageHeight < 1 || image.length !== imageWidth * imageHeight * 4)
    return err("Invalid sprite sheet image dimensions.");
  const converted: ShapeFrame[] = [];
  let changedColors = 0;
  let partialAlpha = 0;
  for (const [index, frame] of frames.entries()) {
    const original = shape.frames[index];
    if (!original) return err("The selected shape changed. Preview the import again.");
    if (frame.region.x + frame.region.w > imageWidth || frame.region.y + frame.region.h > imageHeight)
      return err(`Frame ${frame.name} extends outside the sheet image.`);
    const result = convertFrame(frame, image, imageWidth, palette, original);
    converted.push(result.frame);
    changedColors += result.changedColors;
    partialAlpha += result.partialAlpha;
  }
  return ok({ shape: { ...shape, frames: converted }, frames, changedColors, partialAlpha });
}
