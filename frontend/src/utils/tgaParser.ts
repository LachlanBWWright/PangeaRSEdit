/**
 * TGA (Targa) File Parser
 * Extracts color palette from TGA files used in Mighty Mike
 */

// Color correction lookup tables - matches Mighty Mike's Palette.c
// These convert from Apple RGB (16-bit) to sRGB (8-bit)
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

function applyColorCorrection(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  // Convert 8-bit values to 16-bit for lookup
  const r16 = Math.min(r * 257, 0xffff); // 0-255 -> 0-65535
  const g16 = Math.min(g * 257, 0xffff);
  const b16 = Math.min(b * 257, 0xffff);

  // Apply Apple RGB to linear conversion
  const argbRed = gAppleRGBToLinear[r16] ?? 0;
  const argbGreen = gAppleRGBToLinear[g16] ?? 0;
  const argbBlue = gAppleRGBToLinear[b16] ?? 0;

  // Apply sRGB matrix transformation (from Palette.c lines 217-219)
  let srgbRed = argbRed * 17510 - argbGreen * 1288 + argbBlue * 162 + 8192;
  let srgbGreen = argbRed * 395 + argbGreen * 15730 + argbBlue * 259 + 8192;
  let srgbBlue = argbRed * 29 + argbGreen * 487 + argbBlue * 15868 + 8192;

  if (srgbRed < 0) srgbRed = 0;

  srgbRed >>= 14;
  srgbGreen >>= 14;
  srgbBlue >>= 14;

  if (srgbRed > 0xffff) srgbRed = 0xffff;
  if (srgbGreen > 0xffff) srgbGreen = 0xffff;
  if (srgbBlue > 0xffff) srgbBlue = 0xffff;

  // Convert back to 8-bit using sRGB lookup table
  const finalRed = gLinearToSRGB[srgbRed] ?? 0;
  const finalGreen = gLinearToSRGB[srgbGreen] ?? 0;
  const finalBlue = gLinearToSRGB[srgbBlue] ?? 0;

  return [finalRed, finalGreen, finalBlue];
}

export interface TGAHeader {
  idLength: number;
  colorMapType: number;
  imageType: number;
  colorMapOrigin: number;
  colorMapLength: number;
  colorMapDepth: number;
  imageXOrigin: number;
  imageYOrigin: number;
  imageWidth: number;
  imageHeight: number;
  pixelDepth: number;
  imageDescriptor: number;
}

export interface TGAPalette {
  colors: Uint8ClampedArray; // RGBA format, 4 bytes per color, 256 colors = 1024 bytes
}

// Toggle for applying the AppleRGB -> sRGB color correction.
// Set to `false` to bypass the matrix-based correction during diagnostics.
export let APPLY_COLOR_CORRECTION = true;

export function setApplyColorCorrection(value: boolean) {
  APPLY_COLOR_CORRECTION = value;
}

/**
 * Parse TGA file header (18 bytes)
 */
function parseTGAHeader(data: DataView): TGAHeader {
  return {
    idLength: data.getUint8(0),
    colorMapType: data.getUint8(1),
    imageType: data.getUint8(2),
    colorMapOrigin: data.getUint16(3, true), // Little-endian
    colorMapLength: data.getUint16(5, true), // Little-endian
    colorMapDepth: data.getUint8(7),
    imageXOrigin: data.getUint16(8, true),
    imageYOrigin: data.getUint16(10, true),
    imageWidth: data.getUint16(12, true),
    imageHeight: data.getUint16(14, true),
    pixelDepth: data.getUint8(16),
    imageDescriptor: data.getUint8(17),
  };
}

/**
 * Extract palette from TGA file
 * TGA Image Types:
 * 1 = Uncompressed color-mapped (indexed color)
 * 9 = RLE compressed color-mapped
 */
export function extractTGAPalette(buffer: ArrayBuffer): TGAPalette | null {
  const data = new DataView(buffer);

  // Parse header
  const header = parseTGAHeader(data);

  // Validate color-mapped image type (type 1 = uncompressed, type 9 = RLE compressed)
  if (header.imageType !== 1 && header.imageType !== 9) {
    console.warn(
      `TGA file must be color-mapped (type 1 or 9), got type ${header.imageType}`,
    );
    return null;
  }

  // We only care about color-mapped images (colorMapType must be 1)
  if (header.colorMapType !== 1) {
    console.warn("TGA file does not have a color map");
    return null;
  }

  // Validate that pixel depth is 8-bit indexed color
  if (header.pixelDepth !== 8) {
    console.warn(
      `Unsupported pixel depth: ${header.pixelDepth} bits. Must be 8-bit indexed color.`,
    );
    return null;
  }

  // ID field may be present; compute paletteOffset accordingly
  // (some TGA exporters include an ID string between header and color map)

  // Get palette information
  const paletteEntryCount = header.colorMapLength;
  const paletteBytesPerEntry = Math.floor(header.colorMapDepth / 8);

  // Support 2 (RGB555), 3 (BGR), or 4 (BGRA) byte palette entries
  if (![2, 3, 4].includes(paletteBytesPerEntry)) {
    console.warn(
      `Unsupported palette depth: ${header.colorMapDepth} bits (${paletteBytesPerEntry} bytes per entry)`,
    );
    return null;
  }

  // Palette data starts after 18-byte header plus ID field length
  const paletteOffsetBase = 18 + (header.idLength || 0);

  // colorMapOrigin indicates the first palette index stored in the file.
  // Compute how many contiguous entries are actually present starting at that origin.
  const origin = header.colorMapOrigin || 0;
  const entriesAvailable = Math.max(0, paletteEntryCount - origin);
  if (entriesAvailable <= 0) {
    console.warn(
      `No palette entries available (origin=${origin}, length=${paletteEntryCount})`,
    );
    return null;
  }

  const paletteDataLength = entriesAvailable * paletteBytesPerEntry;
  const paletteAbsoluteOffset =
    paletteOffsetBase + origin * paletteBytesPerEntry;
  if (paletteAbsoluteOffset + paletteDataLength > buffer.byteLength) {
    console.warn("Palette data extends beyond file size");
    return null;
  }

  // Extract palette bytes starting at computed absolute offset
  const paletteData = new Uint8Array(
    buffer,
    paletteAbsoluteOffset,
    paletteDataLength,
  );

  // Convert to RGBA format (4 bytes per color, 256 colors max)
  const colors = new Uint8ClampedArray(256 * 4);

  // Initialize to black/opaque
  for (let i = 0; i < 256; i++) {
    const off = i * 4;
    colors[off + 0] = 0;
    colors[off + 1] = 0;
    colors[off + 2] = 0;
    colors[off + 3] = 255;
  }

  // Fill entries starting at 'origin'
  for (let i = 0; i < entriesAvailable && i + origin < 256; i++) {
    const srcOffset = i * paletteBytesPerEntry;
    const dstIndex = i + origin;
    const dstOffset = dstIndex * 4;

    if (paletteBytesPerEntry === 3 || paletteBytesPerEntry === 4) {
      // TGA palette stored as BGR or BGRA
      const b = paletteData[srcOffset + 0] ?? 0;
      const g = paletteData[srcOffset + 1] ?? 0;
      const r = paletteData[srcOffset + 2] ?? 0;
      const a =
        paletteBytesPerEntry === 4 ? paletteData[srcOffset + 3] ?? 255 : 255;

      const [correctedR, correctedG, correctedB] = APPLY_COLOR_CORRECTION
        ? applyColorCorrection(r, g, b)
        : [r, g, b];

      colors[dstOffset + 0] = correctedR;
      colors[dstOffset + 1] = correctedG;
      colors[dstOffset + 2] = correctedB;
      colors[dstOffset + 3] = a;
    } else if (paletteBytesPerEntry === 2) {
      // 16-bit palette entry (commonly 5-5-5). Interpret as little-endian 16-bit value
      const lo = paletteData[srcOffset + 0] ?? 0;
      const hi = paletteData[srcOffset + 1] ?? 0;
      const value = (hi << 8) | lo;
      // Extract 5-bit components (B: bits 0-4, G: bits 5-9, R: bits 10-14)
      const b5 = value & 0x1f;
      const g5 = (value >> 5) & 0x1f;
      const r5 = (value >> 10) & 0x1f;
      // Scale 5-bit to 8-bit
      const r = (r5 << 3) | (r5 >> 2);
      const g = (g5 << 3) | (g5 >> 2);
      const b = (b5 << 3) | (b5 >> 2);
      const [correctedR, correctedG, correctedB] = APPLY_COLOR_CORRECTION
        ? applyColorCorrection(r, g, b)
        : [r, g, b];
      colors[dstOffset + 0] = correctedR;
      colors[dstOffset + 1] = correctedG;
      colors[dstOffset + 2] = correctedB;
      colors[dstOffset + 3] = 255;
    }
  }

  // Fill remaining palette entries (256 total) with black if palette is smaller
  for (let i = paletteEntryCount; i < 256; i++) {
    const offset = i * 4;
    colors[offset + 0] = 0; // R
    colors[offset + 1] = 0; // G
    colors[offset + 2] = 0; // B
    colors[offset + 3] = 255; // A
  }

  // Intentionally no debug console logs here for automated tests.

  return {
    colors,
  };
}

/**
 * Convert TGA palette to a lookup table for faster rendering
 * Used for converting 8-bit indexed color to RGBA
 */
export function tgaPaletteToLookupTable(palette: TGAPalette): Uint8Array {
  // Return the colors array directly (already in RGBA format)
  return new Uint8Array(palette.colors);
}
