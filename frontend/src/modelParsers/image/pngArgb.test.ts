import {
  argb16ToRgba8,
  rgba8ToArgb16,
  rgba8ToPng,
  pngToRgba8,
} from "./pngArgb";
import { describe, it, expect } from "vitest";

describe("16-bit ARGB1555 <-> PNG roundtrip", () => {
  it("should convert ARGB1555 to PNG and back without loss (except for alpha threshold)", async () => {
    console.log("PNG TEST");
    const width = 4,
      height = 4;
    // Test pattern: 16 unique values
    const argb16 = new Uint16Array([
      0x8000, // opaque black
      0xffff, // opaque white
      0x7fff, // transparent white
      0x0000, // transparent black
      0x8410, // opaque mid-gray
      0xfc00, // opaque red
      0x83e0, // opaque green
      0x801f, // opaque blue
      0x7c00, // transparent red
      0x03e0, // transparent green
      0x001f, // transparent blue
      0x8421, // opaque grayish
      0x8fff, // opaque white (alpha=1)
      0x0001, // transparent blue (alpha=0)
      0x87ff, // opaque cyan
      0x8c63, // opaque yellowish
    ]);
    // Convert to RGBA8
    const rgba = argb16ToRgba8(argb16);
    // Encode to PNG
    const png = rgba8ToPng(rgba, width, height);
    // Decode PNG back to RGBA8
    const { data: rgba2, width: w2, height: h2 } = await pngToRgba8(png);
    expect(w2).toBe(width);
    expect(h2).toBe(height);
    // Convert back to ARGB16
    const argb16_2 = rgba8ToArgb16(rgba2);
    // Compare original and round-tripped ARGB16
    for (let i = 0; i < argb16.length; i++) {
      // Allow for alpha thresholding (PNG is 8-bit, ARGB1555 is 1-bit alpha)
      const orig = argb16[i];
      const round = argb16_2[i];
      // Alpha must match
      expect((round >> 15) & 1).toBe((orig >> 15) & 1);
      // Color channels should be close (allow 1 step error due to quantization)
      const r0 = (orig >> 10) & 0x1f,
        r1 = (round >> 10) & 0x1f;
      const g0 = (orig >> 5) & 0x1f,
        g1 = (round >> 5) & 0x1f;
      const b0 = orig & 0x1f,
        b1 = round & 0x1f;
      expect(Math.abs(r0 - r1)).toBeLessThanOrEqual(1);
      expect(Math.abs(g0 - g1)).toBeLessThanOrEqual(1);
      expect(Math.abs(b0 - b1)).toBeLessThanOrEqual(1);
    }
    console.log("Matches after roundtrip:", argb16_2.length, argb16.length);
  });
});
