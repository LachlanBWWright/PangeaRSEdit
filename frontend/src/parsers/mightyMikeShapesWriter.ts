import { z } from "zod";
import { err, ok } from "neverthrow";
import type { Shape, ShapesFile } from "./mightyMikeShapesParser";
import { rlbCompress } from "../utils/rlwDecompress";

const i16 = z.number().int().min(-32768).max(32767);
const frameSchema = z.object({ header: z.object({ width: z.number().int().min(0).max(2048), height: z.number().int().min(0).max(2048), offsetX: i16, offsetY: i16 }),
  pixels: z.instanceof(Uint8Array), mask: z.instanceof(Uint8Array).optional() })
  .refine((frame) => frame.pixels.length === frame.header.width * frame.header.height && (!frame.mask || frame.mask.length === frame.pixels.length));
const shapesSchema = z.array(z.object({ shapeIndex: z.number().int(), flags: i16.optional(), frames: z.array(frameSchema).max(1000),
  animations: z.array(z.object({ animationIndex: z.number().int(), commands: z.array(z.object({ opcode: i16, operand: i16 })).max(255) })).max(2048) })).max(100);

function shapeSize(shape: Shape): number {
  return 10 + 2 + shape.frames.length * 4 + 2 + shape.animations.length * 4
    + shape.frames.reduce((size, frame) => size + 16 + frame.pixels.length + (frame.mask?.length ?? 0), 0)
    + shape.animations.reduce((size, animation) => size + 1 + animation.commands.length * 4, 0);
}

function writeShape(bytes: Uint8Array, view: DataView, base: number, shape: Shape) {
  view.setInt16(base, shape.flags ?? 0);
  const frames = base + 10;
  view.setInt32(base + 2, frames - base);
  view.setInt16(frames, shape.frames.length);
  const animations = frames + 2 + shape.frames.length * 4;
  view.setInt32(base + 6, animations - base);
  view.setInt16(animations, shape.animations.length);
  let cursor = animations + 2 + shape.animations.length * 4;
  for (const [index, frame] of shape.frames.entries()) {
    view.setInt32(frames + 2 + index * 4, cursor - base);
    view.setInt16(cursor, frame.header.width);
    view.setInt16(cursor + 2, frame.header.height);
    view.setInt16(cursor + 4, frame.header.offsetX);
    view.setInt16(cursor + 6, frame.header.offsetY);
    view.setInt32(cursor + 8, cursor + 16 - base);
    view.setInt32(cursor + 12, frame.mask ? cursor + 16 + frame.pixels.length - base : 0);
    cursor += 16;
    bytes.set(frame.pixels, cursor);
    cursor += frame.pixels.length;
    if (frame.mask) { bytes.set(frame.mask, cursor); cursor += frame.mask.length; }
  }
  for (const [index, animation] of shape.animations.entries()) {
    view.setInt32(animations + 2 + index * 4, cursor - base);
    bytes[cursor++] = animation.commands.length;
    for (const command of animation.commands) {
      view.setInt16(cursor, command.opcode);
      view.setInt16(cursor + 2, command.operand);
      cursor += 4;
    }
  }
}

export function writeShapesFile(data: ShapesFile) {
  if (!shapesSchema.safeParse(data.shapes).success) return err("Invalid Shapes dimensions, pixels, offsets or animation commands");
  if (data.shapes.some((shape, index) => shape.shapeIndex !== index || shape.animations.some((animation, i) => animation.animationIndex !== i)))
    return err("Shapes and animations must retain their native index order");
  const size = 12 + 2 + data.shapes.length * 4 + data.shapes.reduce((sum, shape) => sum + shapeSize(shape), 0);
  if (size > 128 * 1024 * 1024) return err("Shapes output exceeds 128 MiB");
  const buffer = new ArrayBuffer(size);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  view.setInt32(4, 12);
  view.setInt16(12, data.shapes.length);
  let cursor = 14 + data.shapes.length * 4;
  for (const [index, shape] of data.shapes.entries()) {
    view.setInt32(14 + index * 4, cursor);
    writeShape(bytes, view, cursor, shape);
    cursor += shapeSize(shape);
  }
  return ok(rlbCompress(buffer));
}
