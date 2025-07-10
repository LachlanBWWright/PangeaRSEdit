import { PNG } from "pngjs/browser";

// Decode PNG Buffer to RGB8 Uint8Array (strips alpha)
export function pngToRgb8(pngBuffer: Buffer): {
  data: Uint8Array;
  width: number;
  height: number;
} {
  const { data: rgba, width, height } = pngToRgba8(pngBuffer);
  const rgb = new Uint8Array((rgba.length / 4) * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j + 0] = rgba[i + 0];
    rgb[j + 1] = rgba[i + 1];
    rgb[j + 2] = rgba[i + 2];
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
    out[j + 0] = rgb[i + 0]; // R
    out[j + 1] = rgb[i + 1]; // G
    out[j + 2] = rgb[i + 2]; // B
    out[j + 3] = 255; // A
  }
  return out;
}

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
  console.log("Setting PNG data with length:", rgba.length);
  console.log("PNG dimensions:", width, "x", height);
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
