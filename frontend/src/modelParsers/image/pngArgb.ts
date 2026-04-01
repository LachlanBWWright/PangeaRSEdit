import { PNG } from "pngjs/browser";
import { Buffer } from "buffer";

// Decode PNG Buffer to RGB8 Uint8Array (strips alpha)
export function pngToRgb8(pngBuffer: ArrayBuffer): {
  data: Uint8Array;
  width: number;
  height: number;
} {
  const { data: rgba, width, height } = pngToRgba8(pngBuffer);
  const rgb = new Uint8Array((rgba.length / 4) * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j + 0] = rgba[i + 0] ?? 0;
    rgb[j + 1] = rgba[i + 1] ?? 0;
    rgb[j + 2] = rgba[i + 2] ?? 0;
  }
  return { data: rgb, width, height };
}
// Convert 24-bit RGB (Uint8Array) to PNG Buffer
export function rgb24ToPng(
  rgb: Uint8Array,
  width: number,
  height: number,
): Buffer {
  // Convert to RGBA8 first
  const rgba = rgb24ToRgba8(rgb);
  return rgba8ToPng(rgba, width, height);
}
// Convert 24-bit RGB (Uint8Array) to 32-bit RGBA (Uint8Array), alpha set to 255
export function rgb24ToRgba8(rgb: Uint8Array): Uint8Array {
  const out = new Uint8Array((rgb.length / 3) * 4);
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    out[j + 0] = rgb[i + 0] ?? 0; // R
    out[j + 1] = rgb[i + 1] ?? 0; // G
    out[j + 2] = rgb[i + 2] ?? 0; // B
    out[j + 3] = 255; // A
  }
  return out;
}

// Convert 16-bit ARGB1555 (Uint16Array) to 8-bit RGBA (Uint8Array)
export function argb16ToRgba8(argb16: Uint16Array): Uint8Array {
  const out = new Uint8Array(argb16.length * 4);
  for (let i = 0; i < argb16.length; i++) {
    const v = argb16[i] ?? 0;
    // ARGB1555: 1 bit alpha, 5 bits red, 5 bits green, 5 bits blue
    const a = (v >> 15) & 0x1 ? 255 : 0;
    const r = (((v >> 10) & 0x1f) * 255) / 31;
    const g = (((v >> 5) & 0x1f) * 255) / 31;
    const b = ((v & 0x1f) * 255) / 31;
    out[i * 4 + 0] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a;
  }
  return out;
}

// Convert 8-bit RGBA (Uint8Array) to 16-bit ARGB1555 (Uint16Array)
export function rgba8ToArgb16(rgba: Uint8Array): Uint16Array {
  const out = new Uint16Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    const r = Math.round(((rgba[i * 4 + 0] ?? 0) / 255) * 31) & 0x1f;
    const g = Math.round(((rgba[i * 4 + 1] ?? 0) / 255) * 31) & 0x1f;
    const b = Math.round(((rgba[i * 4 + 2] ?? 0) / 255) * 31) & 0x1f;
    const a = (rgba[i * 4 + 3] ?? 0) >= 128 ? 1 : 0;
    out[i] = (a << 15) | (r << 10) | (g << 5) | b;
  }
  return out;
}

// Encode RGBA Uint8Array to PNG Buffer
export function rgba8ToPng(
  rgba: Uint8Array,
  width: number,
  height: number,
): Buffer {
  const expectedLength = width * height * 4;

  if (rgba.length !== expectedLength) {
    console.warn(`RGBA data length mismatch: got ${rgba.length}, expected ${expectedLength}`);
  }

  const png = new PNG({ width, height });
  png.data.set(rgba);
  const encoded = PNG.sync.write(png);
  return encoded;
}

/**
 * Trim a PNG buffer so it ends exactly after the IEND chunk's CRC.
 *
 * GLB containers may pad image data for 4-byte alignment.  pngjs rejects
 * buffers that contain trailing bytes after the IEND chunk, so we strip
 * them before handing the data to the decoder.
 */
function trimPngBuffer(
  buf: Buffer<ArrayBufferLike> | ArrayBuffer,
): ArrayBuffer {
  const bytes =
    buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf);

  // PNG chunk layout: [4-byte length][4-byte type][length-byte data][4-byte CRC]
  // Walk chunks starting after the 8-byte PNG signature.
  let offset = 8; // skip PNG signature
  while (offset + 8 <= bytes.byteLength) {
    const chunkLen =
      ((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0);

    const isIEND =
      bytes[offset + 4] === 0x49 &&
      bytes[offset + 5] === 0x45 &&
      bytes[offset + 6] === 0x4e &&
      bytes[offset + 7] === 0x44;

    // Move past length(4) + type(4) + data(chunkLen) + CRC(4)
    offset += 12 + chunkLen;

    if (isIEND) {
      break;
    }
  }

  if (offset < bytes.byteLength) {
    // There are trailing bytes – return a trimmed copy
    const trimmed = new ArrayBuffer(offset);
    new Uint8Array(trimmed).set(bytes.subarray(0, offset));
    return trimmed;
  }
  // No trimming needed – return a clean ArrayBuffer copy
  if (buf instanceof ArrayBuffer) {
    return buf;
  }
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

// Decode PNG Buffer to RGBA Uint8Array
export function pngToRgba8(
  pngBuffer: Buffer<ArrayBufferLike> | ArrayBuffer,
): {
  data: Uint8Array;
  width: number;
  height: number;
} {
  const trimmed = trimPngBuffer(pngBuffer);
  // Use PNG.sync.read from the same pngjs/browser we use for encoding,
  // bypassing Jimp which bundles a separate pngjs@6 copy that may
  // mishandle ArrayBuffer→Buffer conversion for trimmed data.
  const buf = Buffer.from(new Uint8Array(trimmed));
  const decoded = PNG.sync.read(buf);
  return {
    data: new Uint8Array(decoded.data),
    width: decoded.width,
    height: decoded.height,
  };
}

// Convert 16-bit ARGB1555 (Uint16Array) to PNG Buffer
export function argb16ToPng(
  argb16: Uint16Array,
  width: number,
  height: number,
): Buffer {
  const rgba = argb16ToRgba8(argb16);
  return rgba8ToPng(rgba, width, height);
}

// Convert PNG Buffer to 16-bit ARGB1555 (Uint16Array)
export function pngToArgb16(pngBuffer: ArrayBuffer): {
  data: Uint16Array;
  width: number;
  height: number;
} {
  const { data: rgba, width, height } = pngToRgba8(pngBuffer);
  const argb16 = rgba8ToArgb16(rgba);
  return { data: argb16, width, height };
}
