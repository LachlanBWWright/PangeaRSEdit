/**
 * TGA (Targa) File Parser
 * Extracts color palette from TGA files used in Mighty Mike
 */

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

  // We only care about color-mapped images (type 1 or 9)
  if (header.colorMapType !== 1) {
    console.warn("TGA file does not have a color map");
    return null;
  }

  // Get palette information
  const paletteEntryCount = header.colorMapLength;
  const paletteBytesPerEntry = Math.floor(header.colorMapDepth / 8);

  if (paletteBytesPerEntry !== 3 && paletteBytesPerEntry !== 4) {
    console.warn(
      `Unsupported palette depth: ${header.colorMapDepth} bits (${paletteBytesPerEntry} bytes per entry)`,
    );
    return null;
  }

  // Palette data starts after 18-byte header + id length
  const paletteOffset = 18 + header.idLength;
  const paletteSize = paletteEntryCount * paletteBytesPerEntry;

  if (paletteOffset + paletteSize > buffer.byteLength) {
    console.warn("Palette data extends beyond file size");
    return null;
  }

  // Extract palette bytes
  const paletteData = new Uint8Array(buffer, paletteOffset, paletteSize);

  // Convert to RGBA format (4 bytes per color, 256 colors max)
  const colors = new Uint8ClampedArray(256 * 4);

  for (let i = 0; i < Math.min(paletteEntryCount, 256); i++) {
    const srcOffset = i * paletteBytesPerEntry;
    const dstOffset = i * 4;
    if (paletteBytesPerEntry === 3) {
      // TGA palette is stored as BGR
      // TGA format: byte[0]=B, byte[1]=G, byte[2]=R
      colors[dstOffset + 0] = paletteData[srcOffset + 2]!; // R from byte 2
      colors[dstOffset + 1] = paletteData[srcOffset + 1]!; // G from byte 1
      colors[dstOffset + 2] = paletteData[srcOffset + 0]!; // B from byte 0
      colors[dstOffset + 3] = 255; // A (opaque)
    } else if (paletteBytesPerEntry === 4) {
      // TGA palette is stored as BGRA
      // TGA format: byte[0]=B, byte[1]=G, byte[2]=R, byte[3]=A
      colors[dstOffset + 0] = paletteData[srcOffset + 2]!; // R from byte 2
      colors[dstOffset + 1] = paletteData[srcOffset + 1]!; // G from byte 1
      colors[dstOffset + 2] = paletteData[srcOffset + 0]!; // B from byte 0
      colors[dstOffset + 3] = paletteData[srcOffset + 3]!; // A from byte 3
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

  // Debug: log palette extraction with focus on green colors
  if (paletteEntryCount > 17) {
    const color17_r = colors[17 * 4 + 0] ?? 0;
    const color17_g = colors[17 * 4 + 1] ?? 0;
    const color17_b = colors[17 * 4 + 2] ?? 0;
    console.log("[TGA PALETTE] Extracted successfully:", {
      totalColors: paletteEntryCount,
      bitsPerColor: header.colorMapDepth,
      color17_debug: `Raw bytes were BGR(49,254,68) -> should be RGB(68,254,49)`,
      color17_actual: `RGB(${color17_r},${color17_g},${color17_b})`,
      isGreen: color17_g > color17_r + 30 && color17_g > color17_b + 30 ? "YES" : "NO",
    });
  }

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
