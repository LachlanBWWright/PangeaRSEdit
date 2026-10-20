import { z } from "zod";
import { err, ok, Result, ResultAsync, type Result as Outcome } from "neverthrow";
import type { ProjectFile } from "@pangea/desktop-contracts";
import type { LoadedData, SpriteData } from "@/pages/SpriteViewer/types";
import type { Palette } from "@/pages/SpriteViewer/utils/paletteUtils";

const byteSchema = z.number().int().min(0).max(255);
const colorSchema = z.object({ r: byteSchema, g: byteSchema, b: byteSchema });
const pixelsSchema = z.array(byteSchema).max(16 * 1024 * 1024);
const frameSchema = z.object({ header: z.object({ width: z.number().int().min(0).max(4096), height: z.number().int().min(0).max(4096),
  offsetX: z.number(), offsetY: z.number(), pixelOffset: z.number(), maskOffset: z.number() }), pixels: pixelsSchema, mask: pixelsSchema.optional() })
  .refine((frame) => frame.pixels.length === frame.header.width * frame.header.height && (!frame.mask || frame.mask.length === frame.pixels.length));
const spriteSnapshotSchema = z.object({ kind: z.literal("pangea-sprite"), version: z.literal(1),
  colorTable: z.array(colorSchema).max(256), palette: z.object({ name: z.string(), colors: z.array(colorSchema).max(256) }),
  shapes: z.array(z.object({ shapeIndex: z.number().int(), frames: z.array(frameSchema).max(4096),
    animations: z.array(z.object({ animationIndex: z.number(), commands: z.array(z.object({ opcode: z.number(), operand: z.number() })) })) })).max(4096),
});

export function spriteProjectFiles(stem: string, data: LoadedData, palette: Palette): Outcome<ProjectFile[], string> {
  if (!data) return err("Load a sprite or texture first");
  const extension = data.type === "sprites" ? ".shapes" : data.type === "tileset" ? ".tileset" : ".tga";
  const original = { path: `${stem}${extension}`, bytes: new Uint8Array(data.sourceBytes) };
  if (data.type !== "sprites") return ok([original]);
  const snapshot = { kind: "pangea-sprite", version: 1, colorTable: data.data.colorTable, palette,
    shapes: data.data.shapes.map((shape) => ({ ...shape, frames: shape.frames.map((frame) => ({ ...frame,
      pixels: Array.from(frame.pixels), mask: frame.mask ? Array.from(frame.mask) : undefined })) })) };
  return ok([{ path: `${stem}.sprite.json`, bytes: new TextEncoder().encode(JSON.stringify(snapshot)) }, original]);
}

export async function readSpriteProject(file: File, companions: File[]): Promise<Outcome<{ data: SpriteData; palette: Palette }, string>> {
  const text = await ResultAsync.fromPromise(file.text(), () => "Cannot read sprite snapshot");
  if (text.isErr()) return err(text.error);
  const json = Result.fromThrowable((): unknown => JSON.parse(text.value), () => "Invalid sprite snapshot JSON")();
  if (json.isErr()) return err(json.error);
  const parsed = spriteSnapshotSchema.safeParse(json.value);
  if (!parsed.success) return err("Invalid sprite snapshot");
  const name = file.name.replace(/\.sprite\.json$/, "");
  const original = companions.find((entry) => entry.name === `${name}.shapes`);
  if (!original) return err("Sprite snapshot is missing its original .shapes file");
  const source = await ResultAsync.fromPromise(original.arrayBuffer(), () => "Cannot read sprite source");
  if (source.isErr()) return err(source.error);
  return ok({ palette: parsed.data.palette, data: { type: "sprites", filename: name, sourceBytes: source.value,
    data: { colorTable: parsed.data.colorTable, shapes: parsed.data.shapes.map((shape) => ({ ...shape,
      frames: shape.frames.map((frame) => ({ ...frame, pixels: Uint8Array.from(frame.pixels), mask: frame.mask ? Uint8Array.from(frame.mask) : undefined })) })) } } });
}
