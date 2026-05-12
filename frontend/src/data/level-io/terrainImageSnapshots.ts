import { err, ok, type Result } from "neverthrow";
import type { LevelIoImagePayload } from "./levelIoTypes";

function copyClampedArrayToBuffer(data: Uint8ClampedArray): ArrayBuffer {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );
  return buffer;
}

export function snapshotCanvasImages(
  canvases: readonly HTMLCanvasElement[],
): Result<readonly LevelIoImagePayload[], string> {
  const snapshots: LevelIoImagePayload[] = [];
  for (let index = 0; index < canvases.length; index += 1) {
    const canvas = canvases[index];
    if (!canvas) {
      return err(`Missing canvas at index ${index}`);
    }
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return err(`Failed to get 2D context for canvas #${index}`);
    }
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    snapshots.push({
      width: imageData.width,
      height: imageData.height,
      rgbaBytes: copyClampedArrayToBuffer(imageData.data),
    });
  }
  return ok(snapshots);
}

export function imagePayloadToCanvas(
  payload: LevelIoImagePayload,
): Result<HTMLCanvasElement, string> {
  const canvas = document.createElement("canvas");
  canvas.width = payload.width;
  canvas.height = payload.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return err("Failed to get 2D context while creating image canvas");
  }
  const imageData = new ImageData(
    new Uint8ClampedArray(payload.rgbaBytes),
    payload.width,
    payload.height,
  );
  context.putImageData(imageData, 0, 0);
  return ok(canvas);
}

export function imagePayloadsToCanvases(
  payloads: readonly LevelIoImagePayload[],
): Result<HTMLCanvasElement[], string> {
  const canvases: HTMLCanvasElement[] = [];
  for (const payload of payloads) {
    const canvasResult = imagePayloadToCanvas(payload);
    if (canvasResult.isErr()) {
      return err(canvasResult.error);
    }
    canvases.push(canvasResult.value);
  }
  return ok(canvases);
}
