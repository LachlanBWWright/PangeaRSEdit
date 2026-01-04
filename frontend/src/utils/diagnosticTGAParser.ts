/**
 * Diagnostic TGA parser to extract and display palette information
 * Used to debug color issues in Mighty Mike tileset rendering
 */

export function parseTGAHeaderDiagnostic(buffer: ArrayBuffer): {
  idLength: number;
  colorMapType: number;
  imageType: number;
  colorMapOrigin: number;
  colorMapLength: number;
  colorMapDepth: number;
  width: number;
  height: number;
  pixelDepth: number;
  imageDescriptor: number;
} {
  const view = new DataView(buffer);

  // TGA header is little-endian
  return {
    idLength: view.getUint8(0),
    colorMapType: view.getUint8(1),
    imageType: view.getUint8(2),
    colorMapOrigin: view.getUint16(3, true), // little-endian
    colorMapLength: view.getUint16(5, true),
    colorMapDepth: view.getUint8(7),
    width: view.getUint16(12, true),
    height: view.getUint16(14, true),
    pixelDepth: view.getUint8(16),
    imageDescriptor: view.getUint8(17),
  };
}

export function extractPaletteFromTGA(buffer: ArrayBuffer, colorCount = 256): Uint8Array {
  const header = parseTGAHeaderDiagnostic(buffer);
  const paletteBytesPerEntry = header.colorMapDepth / 8;

  const paletteOffset = 18 + header.idLength;
  const paletteSize = colorCount * paletteBytesPerEntry;

  return new Uint8Array(buffer, paletteOffset, paletteSize);
}

export function analyzePalette(buffer: ArrayBuffer, sceneName: string): void {
  const header = parseTGAHeaderDiagnostic(buffer);
  const paletteBytesPerEntry = header.colorMapDepth / 8;
  const paletteData = extractPaletteFromTGA(buffer, 256);

  console.log(`\n[DIAGNOSTIC] === ${sceneName.toUpperCase()} TGA ===`);
  console.log(`[DIAGNOSTIC] Header:`, {
    imageType: header.imageType,
    colorMapDepth: header.colorMapDepth,
    paletteBytesPerEntry,
    colorMapLength: header.colorMapLength,
    width: header.width,
    height: header.height,
  });

  // Parse color 0, 1, 17, 128 as BGR (raw bytes)
  const colors = [0, 1, 17, 128];
  console.log(`[DIAGNOSTIC] Raw palette bytes (BGR format):`);

  for (const colorIdx of colors) {
    const offset = colorIdx * paletteBytesPerEntry;
    if (offset + paletteBytesPerEntry <= paletteData.length) {
      if (paletteBytesPerEntry === 3) {
        const b = paletteData[offset];
        const g = paletteData[offset + 1];
        const r = paletteData[offset + 2];
        const rgb = `RGB(${r},${g},${b})`;
        console.log(`  Color ${colorIdx}: BGR(${b},${g},${r}) -> ${rgb}`);
      } else if (paletteBytesPerEntry === 4) {
        const b = paletteData[offset];
        const g = paletteData[offset + 1];
        const r = paletteData[offset + 2];
        const a = paletteData[offset + 3];
        const rgba = `RGBA(${r},${g},${b},${a})`;
        console.log(`  Color ${colorIdx}: BGRA(${b},${g},${r},${a}) -> ${rgba}`);
      }
    }
  }
}
