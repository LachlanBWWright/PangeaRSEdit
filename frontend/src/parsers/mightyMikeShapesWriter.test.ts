import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { ResultAsync } from "neverthrow";
import { parseShapesFile, type ShapesFile } from "./mightyMikeShapesParser";
import { writeShapesFile } from "./mightyMikeShapesWriter";
import { rlbDecompress } from "@/utils/rlwDecompress";

function semanticShapes(data: ShapesFile) {
  return data.shapes.map((shape) => ({ ...shape, frames: shape.frames.map((frame) => ({ ...frame,
    header: { width: frame.header.width, height: frame.header.height, offsetX: frame.header.offsetX, offsetY: frame.header.offsetY } })) }));
}

it.each(["main", "jurassic1"])("round-trips real %s Shapes including masks and animation command streams", async (name) => {
  const bytes = await ResultAsync.fromPromise(readFile(`public/data/mightymike/shapes/${name}.shapes`), () => "Missing stock shapes");
  expect(bytes.isOk()).toBe(true);
  if (bytes.isErr()) return;
  const parsed = parseShapesFile(Uint8Array.from(bytes.value).buffer);
  expect(parsed.isOk()).toBe(true);
  if (parsed.isErr()) return;
  const written = writeShapesFile(parsed.value);
  expect(written.isOk()).toBe(true);
  if (written.isErr()) return;
  const reopened = parseShapesFile(written.value);
  expect(reopened.isOk() && semanticShapes(reopened.value)).toEqual(semanticShapes(parsed.value));
  const raw = rlbDecompress(written.value);
  expect(raw.isOk()).toBe(true);
  if (raw.isErr()) return;
  const view = new DataView(raw.value.data);
  // These are the independent header checks used by the native Shapes loader.
  expect(view.getUint16(view.getInt32(0))).toBeLessThanOrEqual(256);
  expect(view.getUint16(view.getInt32(4))).toBe(parsed.value.shapes.length);
  expect(parsed.value.shapes.length).toBeLessThanOrEqual(100);
});

function sprite(): ShapesFile {
  return { colorTable: [], shapes: [{ shapeIndex: 0, frames: [{ header: { width: 2, height: 1, offsetX: -12, offsetY: 7, pixelOffset: 0, maskOffset: 0 },
    pixels: new Uint8Array([3, 254]), mask: new Uint8Array([0, 255]) }], animations: [{ animationIndex: 0, commands: [{ opcode: -1, operand: 32767 }] }] }] };
}

it("writes edited pixels, origins, flags and animation operands into native records", () => {
  const data = sprite();
  const first = data.shapes[0];
  if (!first) return;
  first.flags = 4;
  const written = writeShapesFile(data);
  expect(written.isOk()).toBe(true);
  if (written.isErr()) return;
  const reopened = parseShapesFile(written.value);
  expect(reopened.isOk() && semanticShapes(reopened.value)).toEqual(semanticShapes(data));
});

it("rejects invalid native counts, indices, dimensions, masks and signed fields", () => {
  const data = sprite();
  const first = data.shapes[0];
  const frame = first?.frames[0];
  if (!first || !frame) return;
  expect(writeShapesFile({ ...data, shapes: Array.from({ length: 101 }, () => first) }).isErr()).toBe(true);
  expect(writeShapesFile({ ...data, shapes: [{ ...first, shapeIndex: 5 }] }).isErr()).toBe(true);
  expect(writeShapesFile({ ...data, shapes: [{ ...first, frames: [{ ...frame, mask: new Uint8Array(0) }] }] }).isErr()).toBe(true);
  expect(writeShapesFile({ ...data, shapes: [{ ...first, frames: [{ ...frame, header: { ...frame.header, offsetX: 32768 } }] }] }).isErr()).toBe(true);
  expect(writeShapesFile({ ...data, shapes: [{ ...first, animations: [{ animationIndex: 0, commands: Array.from({ length: 256 }, () => ({ opcode: 0, operand: 0 })) }] }] }).isErr()).toBe(true);
});
