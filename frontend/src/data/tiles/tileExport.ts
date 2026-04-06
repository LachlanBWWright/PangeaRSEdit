/**
 * Tile Export System
 * 
 * Provides functionality to export tiles from levels as image files.
 * Supports exporting individual tiles, tile palettes, or entire tilesets.
 */

import { Result } from "neverthrow";
import { ok, err, ResultAsync } from "neverthrow";
import { Game } from "@/data/globals/globals";
import { isTileBasedGame } from "./tileStructures";

/**
 * Configuration for tile export
 */
export interface TileExportConfig {
  /** Scale factor for output (1 = original size, 2 = 2x, etc.) */
  scale: number;
  /** Output format */
  format: "png" | "jpeg";
  /** JPEG quality (0-1) */
  jpegQuality: number;
  /** Whether to preserve transparency */
  preserveTransparency: boolean;
  /** Background color for non-transparent exports (CSS color) */
  backgroundColor: string;
}

const DEFAULT_EXPORT_CONFIG: TileExportConfig = {
  scale: 1,
  format: "png",
  jpegQuality: 0.92,
  preserveTransparency: true,
  backgroundColor: "#000000",
};

/**
 * Result of a tile export operation
 */
export interface TileExportResult {
  /** Data URL of the exported image */
  dataUrl: string;
  /** Width of the exported image */
  width: number;
  /** Height of the exported image */
  height: number;
  /** Number of tiles exported */
  tileCount: number;
}

/**
 * Validate that a game supports tile export
 */
export function canExportTiles(game: Game): boolean {
  return isTileBasedGame(game);
}

/**
 * Export a single tile as a data URL
 */
export function exportSingleTile(
  tileData: Uint8Array,
  tileSize: number,
  config: Partial<TileExportConfig> = {},
): Result<TileExportResult, Error> {
  const fullConfig = { ...DEFAULT_EXPORT_CONFIG, ...config };
  
  const expectedLength = tileSize * tileSize * 2;
  if (tileData.length !== expectedLength) {
    return err(new Error(
      `Invalid tile data length: ${tileData.length}. Expected ${expectedLength}.`
    ));
  }
  
  // Create canvas at scaled size
  const scaledSize = tileSize * fullConfig.scale;
  const canvas = document.createElement("canvas");
  canvas.width = scaledSize;
  canvas.height = scaledSize;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return err(new Error("Failed to create canvas context"));
  }
  
  // Set background if not preserving transparency
  if (!fullConfig.preserveTransparency) {
    ctx.fillStyle = fullConfig.backgroundColor;
    ctx.fillRect(0, 0, scaledSize, scaledSize);
  }
  
  // Convert tile data to ImageData at original size
  const imageData = ctx.createImageData(tileSize, tileSize);
  const pixels = imageData.data;
  
  for (let i = 0, j = 0; i < tileData.length; i += 2, j += 4) {
    // Read big endian 16-bit value (ARGB1555)
    const byte1 = tileData[i] ?? 0;
    const byte2 = tileData[i + 1] ?? 0;
    const packed = (byte1 << 8) | byte2;
    
    // Extract components
    const a1 = (packed >> 15) & 0x01;
    const r5 = (packed >> 10) & 0x1F;
    const g5 = (packed >> 5) & 0x1F;
    const b5 = packed & 0x1F;
    
    // Convert to 8-bit per channel
    pixels[j] = (r5 << 3) | (r5 >> 2);
    pixels[j + 1] = (g5 << 3) | (g5 >> 2);
    pixels[j + 2] = (b5 << 3) | (b5 >> 2);
    pixels[j + 3] = fullConfig.preserveTransparency ? (a1 ? 255 : 0) : 255;
  }
  
  // Draw at original size
  ctx.putImageData(imageData, 0, 0);
  
  // Scale if necessary
  if (fullConfig.scale !== 1) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = scaledSize;
    tempCanvas.height = scaledSize;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(canvas, 0, 0, tileSize, tileSize, 0, 0, scaledSize, scaledSize);
      canvas.width = scaledSize;
      canvas.height = scaledSize;
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }
  
  // Export as data URL
  const mimeType = fullConfig.format === "jpeg" ? "image/jpeg" : "image/png";
  const quality = fullConfig.format === "jpeg" ? fullConfig.jpegQuality : undefined;
  const dataUrl = canvas.toDataURL(mimeType, quality);
  
  return ok({
    dataUrl,
    width: scaledSize,
    height: scaledSize,
    tileCount: 1,
  });
}

/**
 * Calculate the optimal grid dimensions for a tile palette
 */
export function calculatePaletteGrid(
  tileCount: number,
  maxWidth = 16,
): { columns: number; rows: number } {
  // Target square-ish layout
  const columns = Math.min(maxWidth, Math.ceil(Math.sqrt(tileCount)));
  const rows = Math.ceil(tileCount / columns);
  return { columns, rows };
}

/**
 * Export multiple tiles as a palette image
 */
export async function exportTilePalette(
  tilesData: Uint8Array[],
  tileSize: number,
  config: Partial<TileExportConfig> = {},
  gridColumns?: number,
): Promise<Result<TileExportResult, Error>> {
  const fullConfig = { ...DEFAULT_EXPORT_CONFIG, ...config };
  
  if (tilesData.length === 0) {
    return err(new Error("No tiles to export"));
  }
  
  // Validate all tiles
  const expectedLength = tileSize * tileSize * 2;
  for (let i = 0; i < tilesData.length; i++) {
    const tile = tilesData[i];
    if (!tile || tile.length !== expectedLength) {
      return err(new Error(
        `Tile ${i} has invalid data length: ${tile?.length ?? 0}. Expected ${expectedLength}.`
      ));
    }
  }
  
  // Calculate grid dimensions
  const grid = calculatePaletteGrid(tilesData.length, gridColumns);
  
  // Create output canvas
  const scaledTileSize = tileSize * fullConfig.scale;
  const outputWidth = grid.columns * scaledTileSize;
  const outputHeight = grid.rows * scaledTileSize;
  
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return err(new Error("Failed to create canvas context"));
  }
  
  // Set background
  ctx.fillStyle = fullConfig.backgroundColor;
  ctx.fillRect(0, 0, outputWidth, outputHeight);
  
  // Draw each tile
  for (let i = 0; i < tilesData.length; i++) {
    const col = i % grid.columns;
    const row = Math.floor(i / grid.columns);
    
    // Export individual tile
    const tileData = tilesData[i];
    if (!tileData) continue; // Skip if no tile data
    
    const tileResult = exportSingleTile(tileData, tileSize, fullConfig);
    if (tileResult.isErr()) {
      continue; // Skip failed tiles
    }
    
    // Draw tile to canvas using createImageBitmap for proper async loading
    const fetched = await ResultAsync.fromPromise(
      fetch(tileResult.value.dataUrl),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
    if (fetched.isErr()) continue;
    const blobResult = await ResultAsync.fromPromise(
      fetched.value.blob(),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
    if (blobResult.isErr()) continue;
    const blob = blobResult.value;
    const bitmapResult = await ResultAsync.fromPromise(
      createImageBitmap(blob),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
    if (bitmapResult.isErr()) continue;
    const bitmap = bitmapResult.value;
    ctx.drawImage(bitmap, col * scaledTileSize, row * scaledTileSize);
    bitmap.close();
  }
  
  // Export as data URL
  const mimeType = fullConfig.format === "jpeg" ? "image/jpeg" : "image/png";
  const quality = fullConfig.format === "jpeg" ? fullConfig.jpegQuality : undefined;
  const dataUrl = canvas.toDataURL(mimeType, quality);
  
  return ok({
    dataUrl,
    width: outputWidth,
    height: outputHeight,
    tileCount: tilesData.length,
  });
}

/**
 * Trigger a download of the exported tile image
 */
export function downloadTileExport(
  result: TileExportResult,
  filename: string,
): void {
  const link = document.createElement("a");
  link.href = result.dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get the file extension for an export format
 */
export function getExportFileExtension(format: "png" | "jpeg"): string {
  return format === "jpeg" ? ".jpg" : ".png";
}

/**
 * Generate a filename for an exported tile
 */
export function generateTileFilename(
  tileIndex: number,
  format: "png" | "jpeg" = "png",
): string {
  return `tile_${tileIndex.toString().padStart(4, "0")}${getExportFileExtension(format)}`;
}

/**
 * Generate a filename for an exported tile palette
 */
export function generatePaletteFilename(
  levelName: string,
  format: "png" | "jpeg" = "png",
): string {
  const safeName = levelName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return `${safeName}_tileset${getExportFileExtension(format)}`;
}
