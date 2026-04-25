import { ok, err, type Result } from "neverthrow";

/**
 * Decompress RLB-compressed data.
 */
export function decompressRLB(
  compressedData: Uint8Array,
  decompSize: number,
): Uint8Array {
  const output = new Uint8Array(decompSize);
  let srcPos = 0;
  let dstPos = 0;

  while (dstPos < decompSize && srcPos < compressedData.length) {
    const countByte = compressedData[srcPos];
    if (countByte === undefined) break;
    srcPos++;

    if (countByte > 0x7f) {
      const repeatCount = 257 - countByte;
      if (srcPos >= compressedData.length) break;
      const dataByte = compressedData[srcPos];
      if (dataByte === undefined) break;
      srcPos++;
      for (let i = 0; i < repeatCount && dstPos < decompSize; i++)
        output[dstPos++] = dataByte;
      continue;
    }

    const literalCount = countByte + 1;
    for (
      let i = 0;
      i < literalCount && dstPos < decompSize && srcPos < compressedData.length;
      i++
    ) {
      const byte = compressedData[srcPos];
      if (byte === undefined) break;
      output[dstPos++] = byte;
      srcPos++;
    }
  }

  return output.slice(0, dstPos);
}

export function shapeFrameToCanvas(
  frame: {
    header: { width: number; height: number };
    pixels: Uint8Array;
    mask?: Uint8Array;
  },
  colorTable: { r: number; g: number; b: number }[],
): Result<HTMLCanvasElement, string> {
  const canvas = document.createElement("canvas");
  canvas.width = frame.header.width;
  canvas.height = frame.header.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return err("Could not get canvas context");

  const imageData = ctx.createImageData(
    frame.header.width,
    frame.header.height,
  );
  const data = imageData.data;

  for (let i = 0; i < frame.pixels.length; i++) {
    const colorIndex = frame.pixels[i] ?? 0;
    const color = colorTable[colorIndex] || { r: 0, g: 0, b: 0 };
    let alpha = 255;
    if (frame.mask) {
      const maskByte = frame.mask[i];
      if (maskByte !== undefined) alpha = maskByte === 0x00 ? 255 : 0;
    }

    data[i * 4 + 0] = color.r;
    data[i * 4 + 1] = color.g;
    data[i * 4 + 2] = color.b;
    data[i * 4 + 3] = alpha;
  }

  ctx.putImageData(imageData, 0, 0);
  return ok(canvas);
}
