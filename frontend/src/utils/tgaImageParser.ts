/**
 * TGA Image Parser
 * Converts TGA files to HTMLCanvasElement for rendering
 * Unlike tgaParser.ts which extracts only the palette,
 * this parser converts the full image to canvas
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
 * Convert TGA image to HTMLCanvasElement
 * Supports:
 * - Uncompressed RGB/RGBA (types 2, 3)
 * - RLE compressed RGB/RGBA (types 10, 11)
 * - RLE compressed indexed color (type 9)
 */
export function parseTGAToCanvas(buffer: ArrayBuffer): HTMLCanvasElement {
  const data = new DataView(buffer);
  const header = parseTGAHeader(data);

  console.log("[TGA] Parsing TGA header:", {
    imageType: header.imageType,
    imageWidth: header.imageWidth,
    imageHeight: header.imageHeight,
    pixelDepth: header.pixelDepth,
    colorMapType: header.colorMapType,
  });

  // Validate header
  if (header.imageWidth === 0 || header.imageHeight === 0) {
    throw new Error("Invalid TGA: image dimensions are zero");
  }

  // Support uncompressed (2, 3), RLE compressed (10, 11), and RLE indexed (9) TGA
  const isRLE =
    header.imageType === 9 || header.imageType === 10 || header.imageType === 11;
  const isUncompressed =
    header.imageType === 2 || header.imageType === 3;
  const isIndexed =
    header.imageType === 9 || header.colorMapType === 1;

  if (!isRLE && !isUncompressed) {
    throw new Error(
      `Unsupported TGA image type: ${header.imageType} (only types 2, 3, 9, 10, 11 supported)`
    );
  }

  // For indexed color, pixel depth is 8 bits per pixel
  // For RGB/RGBA, pixel depth is 24 or 32 bits per pixel
  let bytesPerPixel = header.pixelDepth / 8;

  if (isIndexed) {
    if (header.pixelDepth !== 8) {
      throw new Error(
        `Unsupported pixel depth for indexed color: ${header.pixelDepth} bits (must be 8)`
      );
    }
    bytesPerPixel = 1; // indexed color is 1 byte per pixel
  } else {
    if (bytesPerPixel !== 3 && bytesPerPixel !== 4) {
      throw new Error(
        `Unsupported pixel depth: ${header.pixelDepth} bits (must be 24 or 32)`
      );
    }
  }

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = header.imageWidth;
  canvas.height = header.imageHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Create image data
  const imageData = ctx.createImageData(
    header.imageWidth,
    header.imageHeight
  );
  const pixels = imageData.data;

  // Read color map if present (for indexed color)
  let colorMap: Uint8Array | undefined;
  let colorMapOffset = 18 + header.idLength;

  if (header.colorMapType === 1) {
    const colorMapSize = (header.colorMapLength * header.colorMapDepth) / 8;
    colorMap = new Uint8Array(buffer, colorMapOffset, colorMapSize);
    colorMapOffset += colorMapSize;
  }

  const dataOffset = colorMapOffset;

  // Parse pixel data
  if (isIndexed && colorMap) {
    // For indexed color, parse indices then convert using color map
    parseIndexedData(
      data,
      dataOffset,
      header.imageWidth,
      header.imageHeight,
      bytesPerPixel,
      header.colorMapDepth,
      colorMap,
      header.colorMapOrigin,
      pixels,
      isRLE
    );
  } else if (isRLE) {
    parseRLEData(
      data,
      dataOffset,
      header.imageWidth,
      header.imageHeight,
      bytesPerPixel,
      pixels
    );
  } else {
    parseUncompressedData(
      data,
      dataOffset,
      header.imageWidth,
      header.imageHeight,
      bytesPerPixel,
      pixels
    );
  }

  // Handle vertical flip (TGA coordinates origin at bottom-left by default)
  const isOriginBottom = (header.imageDescriptor & 0x20) === 0;
  if (isOriginBottom) {
    flipImageVertically(pixels, header.imageWidth, header.imageHeight);
  }

  // Draw to canvas
  ctx.putImageData(imageData, 0, 0);

  console.log("[TGA] Successfully created canvas:", {
    width: canvas.width,
    height: canvas.height,
  });

  return canvas;
}

/**
 * Parse uncompressed TGA pixel data
 */
function parseUncompressedData(
  data: DataView,
  offset: number,
  width: number,
  height: number,
  bytesPerPixel: number,
  pixels: Uint8ClampedArray
): void {
  let pixelIndex = 0;
  let dataOffset = offset;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // TGA stores as BGR(A), convert to RGBA
      if (dataOffset + bytesPerPixel > data.byteLength) {
        break;
      }

      const b = data.getUint8(dataOffset);
      const g = data.getUint8(dataOffset + 1);
      const r = data.getUint8(dataOffset + 2);
      const a = bytesPerPixel === 4 ? data.getUint8(dataOffset + 3) : 255;

      pixels[pixelIndex * 4 + 0] = r;
      pixels[pixelIndex * 4 + 1] = g;
      pixels[pixelIndex * 4 + 2] = b;
      pixels[pixelIndex * 4 + 3] = a;

      pixelIndex++;
      dataOffset += bytesPerPixel;
    }
  }
}

/**
 * Parse RLE (Run-Length Encoded) TGA pixel data
 */
function parseRLEData(
  data: DataView,
  offset: number,
  width: number,
  height: number,
  bytesPerPixel: number,
  pixels: Uint8ClampedArray
): void {
  let pixelIndex = 0;
  let dataOffset = offset;
  const totalPixels = width * height;

  while (pixelIndex < totalPixels && dataOffset < data.byteLength) {
    const packetHeader = data.getUint8(dataOffset);
    dataOffset++;

    const isRLE = (packetHeader & 0x80) !== 0;
    const packetCount = (packetHeader & 0x7f) + 1;

    if (isRLE) {
      // Repeated pixel (RLE packet)
      if (dataOffset + bytesPerPixel > data.byteLength) break;

      const b = data.getUint8(dataOffset);
      const g = data.getUint8(dataOffset + 1);
      const r = data.getUint8(dataOffset + 2);
      const a = bytesPerPixel === 4 ? data.getUint8(dataOffset + 3) : 255;
      dataOffset += bytesPerPixel;

      // Repeat this pixel packetCount times
      for (let i = 0; i < packetCount && pixelIndex < totalPixels; i++) {
        pixels[pixelIndex * 4 + 0] = r;
        pixels[pixelIndex * 4 + 1] = g;
        pixels[pixelIndex * 4 + 2] = b;
        pixels[pixelIndex * 4 + 3] = a;
        pixelIndex++;
      }
    } else {
      // Raw pixels (non-RLE packet)
      for (let i = 0; i < packetCount && pixelIndex < totalPixels; i++) {
        if (dataOffset + bytesPerPixel > data.byteLength) break;

        const b = data.getUint8(dataOffset);
        const g = data.getUint8(dataOffset + 1);
        const r = data.getUint8(dataOffset + 2);
        const a = bytesPerPixel === 4 ? data.getUint8(dataOffset + 3) : 255;

        pixels[pixelIndex * 4 + 0] = r;
        pixels[pixelIndex * 4 + 1] = g;
        pixels[pixelIndex * 4 + 2] = b;
        pixels[pixelIndex * 4 + 3] = a;

        pixelIndex++;
        dataOffset += bytesPerPixel;
      }
    }
  }
}

/**
 * Parse indexed color TGA pixel data using a color map
 */
function parseIndexedData(
  data: DataView,
  offset: number,
  width: number,
  height: number,
  _bytesPerPixel: number, // unused but kept for consistency
  colorMapDepth: number,
  colorMap: Uint8Array,
  colorMapOrigin: number,
  pixels: Uint8ClampedArray,
  isRLE: boolean
): void {
  const colorMapBytesPerEntry = colorMapDepth / 8;
  let pixelIndex = 0;
  let dataOffset = offset;
  const totalPixels = width * height;

  if (isRLE) {
    // RLE indexed data
    while (pixelIndex < totalPixels && dataOffset < data.byteLength) {
      const packetHeader = data.getUint8(dataOffset);
      dataOffset++;

      const isRLEPacket = (packetHeader & 0x80) !== 0;
      const packetCount = (packetHeader & 0x7f) + 1;

      if (isRLEPacket) {
        // Repeated index (RLE packet)
        if (dataOffset >= data.byteLength) break;

        const colorIndex = data.getUint8(dataOffset);
        dataOffset++;

        // Repeat this color packetCount times
        for (let i = 0; i < packetCount && pixelIndex < totalPixels; i++) {
          applyColorFromMap(
            pixels,
            pixelIndex,
            colorIndex,
            colorMapOrigin,
            colorMapBytesPerEntry,
            colorMap
          );
          pixelIndex++;
        }
      } else {
        // Raw indices (non-RLE packet)
        for (let i = 0; i < packetCount && pixelIndex < totalPixels; i++) {
          if (dataOffset >= data.byteLength) break;

          const colorIndex = data.getUint8(dataOffset);
          dataOffset++;

          applyColorFromMap(
            pixels,
            pixelIndex,
            colorIndex,
            colorMapOrigin,
            colorMapBytesPerEntry,
            colorMap
          );
          pixelIndex++;
        }
      }
    }
  } else {
    // Uncompressed indexed data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (dataOffset >= data.byteLength) break;

        const colorIndex = data.getUint8(dataOffset);
        dataOffset++;

        applyColorFromMap(
          pixels,
          pixelIndex,
          colorIndex,
          colorMapOrigin,
          colorMapBytesPerEntry,
          colorMap
        );
        pixelIndex++;
      }
    }
  }
}

/**
 * Apply a color from the color map to a pixel in the image data
 */
function applyColorFromMap(
  pixels: Uint8ClampedArray,
  pixelIndex: number,
  colorIndex: number,
  colorMapOrigin: number,
  colorMapBytesPerEntry: number,
  colorMap: Uint8Array
): void {
  // Calculate offset into color map
  const adjustedIndex = colorIndex - colorMapOrigin;
  const colorOffset = adjustedIndex * colorMapBytesPerEntry;

  if (colorOffset + colorMapBytesPerEntry > colorMap.length) {
    // Index out of bounds, use transparent black
    pixels[pixelIndex * 4 + 0] = 0;
    pixels[pixelIndex * 4 + 1] = 0;
    pixels[pixelIndex * 4 + 2] = 0;
    pixels[pixelIndex * 4 + 3] = 255;
    return;
  }

  // Color map entries can be 24-bit (BGR) or 32-bit (BGRA)
  const b = colorMap[colorOffset] ?? 0;
  const g = colorMap[colorOffset + 1] ?? 0;
  const r = colorMap[colorOffset + 2] ?? 0;
  const a = colorMapBytesPerEntry === 4 ? (colorMap[colorOffset + 3] ?? 255) : 255;

  // Convert BGR(A) to RGBA
  pixels[pixelIndex * 4 + 0] = r;
  pixels[pixelIndex * 4 + 1] = g;
  pixels[pixelIndex * 4 + 2] = b;
  pixels[pixelIndex * 4 + 3] = a;
}

/**
 * Flip image vertically (TGA has inverted Y axis by default)
 */
function flipImageVertically(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const bytesPerRow = width * 4;
  const tempRow = new Uint8ClampedArray(bytesPerRow);

  for (let y = 0; y < Math.floor(height / 2); y++) {
    const topOffset = y * bytesPerRow;
    const bottomOffset = (height - 1 - y) * bytesPerRow;

    // Copy top row to temp
    tempRow.set(pixels.subarray(topOffset, topOffset + bytesPerRow));

    // Copy bottom row to top
    pixels.copyWithin(topOffset, bottomOffset, bottomOffset + bytesPerRow);

    // Copy temp to bottom
    pixels.set(tempRow, bottomOffset);
  }
}
