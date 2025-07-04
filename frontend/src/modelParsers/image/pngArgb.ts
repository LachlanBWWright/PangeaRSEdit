import { PNG } from "pngjs";

// Convert 16-bit ARGB1555 (Uint16Array) to 8-bit RGBA (Uint8Array)
export function argb16ToRgba8(argb16: Uint16Array): Uint8Array {
  const out = new Uint8Array(argb16.length * 4);
  for (let i = 0; i < argb16.length; i++) {
    const v = argb16[i];
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
    const r = Math.round((rgba[i * 4 + 0] / 255) * 31) & 0x1f;
    const g = Math.round((rgba[i * 4 + 1] / 255) * 31) & 0x1f;
    const b = Math.round((rgba[i * 4 + 2] / 255) * 31) & 0x1f;
    const a = rgba[i * 4 + 3] >= 128 ? 1 : 0;
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
  const png = new PNG({ width, height });
  png.data.set(rgba);
  return PNG.sync.write(png);
}

// Decode PNG Buffer to RGBA Uint8Array
export function pngToRgba8(pngBuffer: Buffer): {
  data: Uint8Array;
  width: number;
  height: number;
} {
  const decoded = PNG.sync.read(pngBuffer);
  return { data: decoded.data, width: decoded.width, height: decoded.height };
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
export function pngToArgb16(pngBuffer: Buffer): {
  data: Uint16Array;
  width: number;
  height: number;
} {
  const { data: rgba, width, height } = pngToRgba8(pngBuffer);
  const argb16 = rgba8ToArgb16(rgba);
  return { data: argb16, width, height };
}
