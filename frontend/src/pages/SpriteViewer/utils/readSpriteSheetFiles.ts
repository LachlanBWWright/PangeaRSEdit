import { err, Result, ResultAsync } from "neverthrow";
import type { Shape, RGBColor } from "@/parsers/mightyMikeShapesParser";
import { parseSpriteSheet, previewSpriteSheet } from "./spriteSheetImport";

export async function readSpriteSheetFiles(image: File, metadata: File | null, shape: Shape, palette: readonly RGBColor[]) {
  if (image.size > 64 * 1024 * 1024 || metadata && metadata.size > 1024 * 1024) return err("Choose a PNG smaller than 64 MiB and JSON smaller than 1 MiB.");
  const json = metadata ? await readMetadata(metadata) : null;
  if (json?.isErr()) return err(json.error);
  const bitmap = await ResultAsync.fromPromise(createImageBitmap(image), () => "Cannot decode the sheet image. Export a PNG from your sprite editor.");
  if (bitmap.isErr()) return err(bitmap.error);
  const canvas = document.createElement("canvas");
  if (bitmap.value.width * bitmap.value.height > 16 * 1024 * 1024) { bitmap.value.close(); return err("Sheet image exceeds 16 million pixels."); }
  canvas.width = bitmap.value.width;
  canvas.height = bitmap.value.height;
  const context = canvas.getContext("2d");
  if (!context) { bitmap.value.close(); return err("Cannot create the sprite conversion preview."); }
  const frames = parseSpriteSheet(json?.isOk() ? json.value : { frames: [{ filename: image.name,
    frame: { x: 0, y: 0, w: canvas.width, h: canvas.height } }] });
  if (frames.isErr()) { bitmap.value.close(); return err(frames.error); }
  const decoded = Result.fromThrowable(() => {
    context.drawImage(bitmap.value, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height).data;
  }, () => "Cannot read sheet image pixels.")();
  bitmap.value.close();
  if (decoded.isErr()) return err(decoded.error);
  return previewSpriteSheet(shape, frames.value, decoded.value, canvas.width, canvas.height, palette);
}

async function readMetadata(metadata: File) {
  const text = await ResultAsync.fromPromise(metadata.text(), () => "Cannot read sprite sheet JSON.");
  return text.isErr() ? err(text.error) : Result.fromThrowable((): unknown => JSON.parse(text.value), () => "Invalid sprite sheet JSON.")();
}
