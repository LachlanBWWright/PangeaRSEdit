/**
 * Mighty Mike Palette Manager
 *
 * This module implements a palette system that more closely matches the original C code:
 * - Dynamic palette that can be modified at runtime
 * - Multiple color format storage (RGB components, 32-bit, 16-bit)
 * - Transparency color mask array for collision detection
 * - Color correction support matching Palette.c
 *
 * Based on: Drivers/Palette.c (Brian Greenstone, Pangea Software 1994)
 */

import { APPLY_COLOR_CORRECTION } from "./tgaParser";

// Color lookup tables - matches Mighty Mike's Palette.c
const gAppleRGBToLinear = buildAppleRGBToLinearTable();
const gLinearToSRGB = buildLinearToSRGBTable();

function buildAppleRGBToLinearTable(): Uint16Array {
  const table = new Uint16Array(1 << 16);
  for (let i = 0; i < 1 << 16; i++) {
    const linearScale = i / 0xffff;
    const appleRGBToLinear = Math.pow(linearScale, 1.8);
    table[i] = Math.floor(appleRGBToLinear * 65535 + 0.5);
  }
  return table;
}

function buildLinearToSRGBTable(): Uint8Array {
  const table = new Uint8Array(1 << 16);
  for (let i = 0; i < 1 << 16; i++) {
    const linearScale = i / 0xffff;
    let srgbIntensity: number;
    if (linearScale < 0.0031308) {
      srgbIntensity = linearScale / 12.92;
    } else {
      srgbIntensity = 1.055 * Math.pow(linearScale, 1 / 2.4) - 0.055;
    }
    table[i] = Math.floor(srgbIntensity * 255 + 0.5);
  }
  return table;
}

/**
 * RGBColor structure matching C implementation
 * Each component is 16-bit (0-65535) for precision
 */
export interface RGBColor {
  red: number; // 0-65535
  green: number; // 0-65535
  blue: number; // 0-65535
}

/**
 * GamePalette structure matching C implementation
 * Stores colors in three formats for different use cases
 */
export class GamePalette {
  // Original color values (16-bit per component)
  baseColors: RGBColor[] = [];

  // 32-bit ARGB format for 32-bit displays
  finalColors32: Uint32Array = new Uint32Array(256);

  // 16-bit RGB565 format for 16-bit displays
  finalColors16: Uint16Array = new Uint16Array(256);

  constructor() {
    // Initialize to black
    for (let i = 0; i < 256; i++) {
      this.baseColors[i] = { red: 0, green: 0, blue: 0 };
      this.finalColors32[i] = 0x000000ff;
      this.finalColors16[i] = 0x0000;
    }
  }

  /**
   * Clone this palette (for backup/restore)
   */
  clone(): GamePalette {
    const copy = new GamePalette();
    for (let i = 0; i < 256; i++) {
      const color = this.baseColors[i];
      if (color) {
        copy.baseColors[i] = {
          red: color.red,
          green: color.green,
          blue: color.blue,
        };
      }
      copy.finalColors32[i] = this.finalColors32[i] ?? 0x000000ff;
      copy.finalColors16[i] = this.finalColors16[i] ?? 0x0000;
    }
    return copy;
  }

  /**
   * Get RGBA color as 8-bit values
   */
  getColorRGBA(index: number): [number, number, number, number] {
    if (index < 0 || index >= 256) {
      return [0, 0, 0, 255];
    }

    const color = this.baseColors[index];
    if (!color) {
      return [0, 0, 0, 255];
    }
    const r = color.red >> 8;
    const g = color.green >> 8;
    const b = color.blue >> 8;
    return [r, g, b, 255];
  }

  /**
   * Get color as 32-bit value
   */
  getColor32(index: number): number {
    if (index < 0 || index >= 256) {
      return 0x000000ff;
    }
    return this.finalColors32[index] ?? 0x000000ff;
  }

  /**
   * Get color as 16-bit RGB565
   */
  getColor16(index: number): number {
    if (index < 0 || index >= 256) {
      return 0x0000;
    }
    return this.finalColors16[index] ?? 0x0000;
  }
}

/**
 * Mighty Mike Palette Manager
 * Maintains active palette and transparency masks
 * Matches behavior of Drivers/Palette.c
 */
export class MightyMikePaletteManager {
  private gGamePalette: GamePalette;
  private gBackUpPalette: GamePalette;

  // Transparency color mask for collision detection
  // True = color can collide, False = transparent (no collision)
  private gColorMaskArray: boolean[] = [];

  // Color 255 is always treated as visually transparent in rendering
  // But it's only transparent for collision if marked in gColorMaskArray

  constructor() {
    this.gGamePalette = new GamePalette();
    this.gBackUpPalette = new GamePalette();

    // Initialize all colors to opaque for collision
    for (let i = 0; i < 256; i++) {
      this.gColorMaskArray[i] = true;
    }
  }

  /**
   * Load palette from an 8-bit RGBA array
   * Input should be 256 colors × 4 bytes (RGBA) = 1024 bytes
   */
  loadPaletteFromRGBA(paletteData: Uint8Array): void {
    if (paletteData.length !== 1024) {
      console.warn(
        `[PALETTE] Invalid palette size: ${String(
          paletteData.length,
        )}, expected 1024`,
      );
      return;
    }

    for (let i = 0; i < 256; i++) {
      const offset = i * 4;
      const r8 = paletteData[offset] ?? 0;
      const g8 = paletteData[offset + 1] ?? 0;
      const b8 = paletteData[offset + 2] ?? 0;

      // Convert 8-bit to 16-bit for baseColors storage
      const rColor: RGBColor = {
        red: r8 * 257, // 0-255 -> 0-65535
        green: g8 * 257,
        blue: b8 * 257,
      };

      this.setPaletteColor(i, rColor);
    }
  }

  /**
   * Set a single palette color
   * This matches Palette.c: SetPaletteColor()
   */
  setPaletteColor(index: number, color: RGBColor): void {
    if (index < 0 || index >= 256) {
      return;
    }

    let finalColor32: number;
    let finalColor16: number;

    if (APPLY_COLOR_CORRECTION) {
      // Apply color correction (Apple RGB -> sRGB)
      // This matches Palette.c lines 211-243

      // Get 16-bit values from RGBColor
      const argbRed = gAppleRGBToLinear[color.red] ?? 0;
      const argbGreen = gAppleRGBToLinear[color.green] ?? 0;
      const argbBlue = gAppleRGBToLinear[color.blue] ?? 0;

      // Apply sRGB matrix transformation
      let srgbRed = argbRed * 17510 - argbGreen * 1288 + argbBlue * 162 + 8192;
      let srgbGreen = argbRed * 395 + argbGreen * 15730 + argbBlue * 259 + 8192;
      let srgbBlue = argbRed * 29 + argbGreen * 487 + argbBlue * 15868 + 8192;

      // Clamp negative values
      if (srgbRed < 0) srgbRed = 0;

      // Right-shift by 14 bits
      srgbRed >>= 14;
      srgbGreen >>= 14;
      srgbBlue >>= 14;

      // Clamp to 16-bit range
      if (srgbRed > 0xffff) srgbRed = 0xffff;
      if (srgbGreen > 0xffff) srgbGreen = 0xffff;
      if (srgbBlue > 0xffff) srgbBlue = 0xffff;

      // Apply second lookup table (linear to sRGB)
      const red = gLinearToSRGB[srgbRed] ?? 0;
      const green = gLinearToSRGB[srgbGreen] ?? 0;
      const blue = gLinearToSRGB[srgbBlue] ?? 0;

      // Pack into 32-bit ARGB (0xRRGGBBAA)
      finalColor32 = 0x000000ff | (red << 24) | (green << 16) | (blue << 8);

      // Pack into 16-bit RGB565
      // Red: 5 bits (shift to bits 11-15)
      // Green: 6 bits (shift to bits 5-10)
      // Blue: 5 bits (bits 0-4)
      finalColor16 =
        (((red >> 3) & 0x1f) << 11) |
        (((green >> 2) & 0x3f) << 5) |
        ((blue >> 3) & 0x1f);
    } else {
      // No color correction - direct conversion
      const red = color.red >> 8;
      const green = color.green >> 8;
      const blue = color.blue >> 8;

      finalColor32 = 0x000000ff | (red << 24) | (green << 16) | (blue << 8);

      finalColor16 =
        (((red >> 3) & 0x1f) << 11) |
        (((green >> 2) & 0x3f) << 5) |
        ((blue >> 3) & 0x1f);
    }

    // Store in all formats
    this.gGamePalette.baseColors[index] = color;
    this.gGamePalette.finalColors32[index] = finalColor32;
    this.gGamePalette.finalColors16[index] = finalColor16;
  }

  /**
   * Clear transparency mask
   * All colors are opaque by default
   */
  clearTileColorMasks(): void {
    for (let i = 0; i < 256; i++) {
      this.gColorMaskArray[i] = true;
    }
  }

  /**
   * Set transparency colors for collision detection
   * These colors will be transparent for collision purposes
   * This matches Playfield.c: LoadTileSet() lines 345-352
   */
  setTransparencyColors(colorIndices: number[]): void {
    this.clearTileColorMasks();
    for (const colorIndex of colorIndices) {
      if (colorIndex >= 0 && colorIndex < 256) {
        this.gColorMaskArray[colorIndex] = false;
      }
    }
  }

  /**
   * Check if a color is transparent for collision
   * This is for collision detection, NOT visual rendering
   */
  isColorTransparent(colorIndex: number): boolean {
    if (colorIndex < 0 || colorIndex >= 256) {
      return true;
    }
    return !this.gColorMaskArray[colorIndex];
  }

  /**
   * Get transparency mask array (for debugging)
   */
  getColorMaskArray(): boolean[] {
    return [...this.gColorMaskArray];
  }

  /**
   * Make backup of current palette for fading
   * This matches Palette.c: MakeBackUpPalette()
   */
  makeBackUpPalette(): void {
    this.gBackUpPalette = this.gGamePalette.clone();
  }

  /**
   * Restore palette from backup
   * This matches Palette.c: RestoreBackUpPalette()
   */
  restoreBackUpPalette(): void {
    this.gGamePalette = this.gBackUpPalette.clone();
  }

  /**
   * Fade all colors by a brightness factor (0-100)
   * This matches Palette.c: FadeInGameCLUT() / FadeOutGameCLUT()
   */
  fadeColors(brightnessPercent: number): void {
    const factor = brightnessPercent / 100;

    for (let i = 0; i < 255; i++) {
      // Use backup palette as source
      const baseColor = this.gBackUpPalette.baseColors[i];
      if (!baseColor) continue;

      // Scale brightness
      const faledColor: RGBColor = {
        red: Math.floor(baseColor.red * factor),
        green: Math.floor(baseColor.green * factor),
        blue: Math.floor(baseColor.blue * factor),
      };

      this.setPaletteColor(i, faledColor);
    }
  }

  /**
   * Erase palette to black
   * This matches Palette.c: EraseCLUT()
   */
  eraseCLUT(): void {
    const blackColor: RGBColor = { red: 0, green: 0, blue: 0 };
    for (let i = 0; i < 255; i++) {
      this.gGamePalette.baseColors[i] = blackColor;
      this.gGamePalette.finalColors32[i] = 0x000000ff;
      this.gGamePalette.finalColors16[i] = 0x0000;
    }
  }

  /**
   * Get current game palette
   */
  getGamePalette(): GamePalette {
    return this.gGamePalette;
  }

  /**
   * Get palette as RGBA array (for tile rendering)
   */
  getPaletteAsRGBA(): Uint8Array {
    const rgba = new Uint8Array(1024);
    for (let i = 0; i < 256; i++) {
      const [r, g, b, a] = this.gGamePalette.getColorRGBA(i);
      rgba[i * 4 + 0] = r;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = a;
    }
    return rgba;
  }
}

// Global instance matching Palette.c: GamePalette gGamePalette;
export const gMightyMikePalette = new MightyMikePaletteManager();
