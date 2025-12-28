/**
 * Mighty Mike Tileset Parser
 *
 * Parses decompressed tileset data and renders tiles using a palette.
 * Each tile is 32x32 pixels, 8-bit indexed color.
 *
 * Tileset format (from Mighty Mike source):
 * - Offset at +6: Tile definitions
 * - Offset at +10: Xlate table (translation table for tile lookups)
 * - Offset at +14: Tile attributes
 * - Offset at +22: Tile animations
 * - Offset at +26: Transparency colors
 */

import { Result, ok, err } from "@/types/result";
import { rlbDecompress } from "@/utils/rlwDecompress";

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface MightyMikeTileset {
  numTileDefinitions: number;
  tileImages: HTMLCanvasElement[];
  // Raw tile data for re-rendering with different palettes
  xlateTable: number[];
  tileDataStartOffset: number;
  decompressedData: Uint8Array;
}

/**
 * Parse a tileset file and render it with the given palette
 */
export function parseTilesetFile(
  buffer: ArrayBuffer,
  palette: RGBColor[]
): Result<MightyMikeTileset> {
  try {
    // Decompress the tileset data
    const decompressResult = rlbDecompress(buffer);
    if (!decompressResult.ok) {
      return decompressResult;
    }

    const decompressed = decompressResult.value.data;
    const view = new DataView(decompressed);
    const bytes = new Uint8Array(decompressed);

    // Read offset pointers (big-endian) - these point to offsets within the data
    const offsetToTileDefinitions = view.getUint32(6, false);
    const offsetToXlateTable = view.getUint32(10, false);

    // Skip the count uint16 for each section (as per Mighty Mike source)
    const tileDefCountOffset = offsetToTileDefinitions + 2;
    const xlateCountOffset = offsetToXlateTable + 2;

    // Read counts
    const numXlateEntries = view.getUint16(offsetToXlateTable, false);

    // Read and byteswap the xlate table (big-endian int16 values)
    const xlateTable: number[] = [];
    for (let i = 0; i < numXlateEntries; i++) {
      const offset = xlateCountOffset + i * 2;
      const value = view.getInt16(offset, false); // big-endian
      xlateTable.push(value);
    }

    // Read tile definitions and convert to canvas images
    const tileImages: HTMLCanvasElement[] = [];
    const tileDataStartOffset = tileDefCountOffset;

    // Create tiles for each xlate entry (the actual displayable tiles)
    for (let tileNum = 0; tileNum < numXlateEntries; tileNum++) {
      const xlateValue = xlateTable[tileNum] ?? 0;
      // xlateValue is the tile index in the tile definitions
      // Offset calculation: tileDataStartOffset + (xlateValue << 10)
      // TILE_SIZE_SH = 5, so TILE_SIZE_SH*2 = 10, meaning each tile is 32*32 = 1024 bytes
      const tileDataOffset = tileDataStartOffset + (xlateValue << 10);

      // Create canvas for this tile
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return err(new Error("Could not get canvas context"));
      }

      // Create image data
      const imageData = ctx.createImageData(32, 32);
      const data = imageData.data;

      // Fill in pixel data using palette
      for (let pixelIdx = 0; pixelIdx < 1024; pixelIdx++) {
        const colorIndex = bytes[tileDataOffset + pixelIdx] ?? 0;

        // Color index 255 is transparent
        const isTransparent = colorIndex === 255;
        const color = palette[colorIndex] || { r: 0, g: 0, b: 0 };

        const dataIdx = pixelIdx * 4;
        data[dataIdx + 0] = color.r;
        data[dataIdx + 1] = color.g;
        data[dataIdx + 2] = color.b;
        data[dataIdx + 3] = isTransparent ? 0 : 255; // Alpha
      }

      // Draw the image data onto the canvas
      ctx.putImageData(imageData, 0, 0);
      tileImages.push(canvas);
    }

    return ok({
      numTileDefinitions: numXlateEntries, // Return actual tile count (from xlate table)
      tileImages,
      xlateTable,
      tileDataStartOffset,
      decompressedData: bytes,
    });
  } catch (error) {
    return err(
      error instanceof Error
        ? error
        : new Error("Failed to parse tileset file")
    );
  }
}

/**
 * Re-render tileset tiles with a new palette
 */
export function rerenderTilesetWithPalette(
  tileset: MightyMikeTileset,
  newPalette: RGBColor[]
): HTMLCanvasElement[] {
  const tileImages: HTMLCanvasElement[] = [];
  const bytes = tileset.decompressedData;

  // Re-render each tile with the new palette
  for (let tileNum = 0; tileNum < tileset.numTileDefinitions; tileNum++) {
    const xlateValue = tileset.xlateTable[tileNum] ?? 0;
    const tileDataOffset = tileset.tileDataStartOffset + (xlateValue << 10);

    // Create canvas for this tile
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      continue;
    }

    // Create image data
    const imageData = ctx.createImageData(32, 32);
    const data = imageData.data;

    // Fill in pixel data using new palette
    for (let pixelIdx = 0; pixelIdx < 1024; pixelIdx++) {
      const colorIndex = bytes[tileDataOffset + pixelIdx] ?? 0;

      // Color index 255 is transparent
      const isTransparent = colorIndex === 255;
      const color = newPalette[colorIndex] || { r: 0, g: 0, b: 0 };

      const dataIdx = pixelIdx * 4;
      data[dataIdx + 0] = color.r;
      data[dataIdx + 1] = color.g;
      data[dataIdx + 2] = color.b;
      data[dataIdx + 3] = isTransparent ? 0 : 255; // Alpha
    }

    // Draw the image data onto the canvas
    ctx.putImageData(imageData, 0, 0);
    tileImages.push(canvas);
  }

  return tileImages;
}

/**
 * Create a grid preview of all tiles in the tileset
 */
export function createTilesetGridPreview(
  tileset: MightyMikeTileset
): HTMLCanvasElement {
  const tilesPerRow = 16;
  const tileSize = 32;
  const padding = 1;
  const width = tilesPerRow * (tileSize + padding) + padding;
  const height = Math.ceil(tileset.numTileDefinitions / tilesPerRow) * (tileSize + padding) + padding;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Fill background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  // Draw each tile
  tileset.tileImages.forEach((tileCanvas, index) => {
    const row = Math.floor(index / tilesPerRow);
    const col = index % tilesPerRow;
    const x = col * (tileSize + padding) + padding;
    const y = row * (tileSize + padding) + padding;

    ctx.drawImage(tileCanvas, x, y, tileSize, tileSize);

    // Optional: draw grid lines
    ctx.strokeStyle = "#444444";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, tileSize, tileSize);
  });

  return canvas;
}
