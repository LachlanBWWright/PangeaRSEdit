/**
 * Tile Import System
 * 
 * Provides functionality to import new tiles from image files
 * for tile-based games (Bugdom 1, Nanosaur 1).
 * 
 * Images must be exactly 32x32 pixels and will be converted to
 * 16-bit ARGB1555 format to match the game's tile format.
 */

import { Result, ok, err } from "@/types/result";
import { GlobalsInterface, Game } from "@/data/globals/globals";
import { isTileBasedGame, TILE_GAME_CONFIGS } from "./tileStructures";

/**
 * Result of a tile import operation
 */
export interface TileImportResult {
  /** New tile index in the tileset */
  newTileIndex: number;
  /** 16-bit tile data (32x32 pixels = 2048 bytes) */
  tileData: Uint8Array;
  /** Preview image as data URL */
  previewDataUrl: string;
}

/**
 * Configuration for tile import
 */
export interface TileImportConfig {
  /** Whether to preserve alpha channel (default: true) */
  preserveAlpha: boolean;
  /** Alpha threshold for 1-bit conversion (0-255, default: 128) */
  alphaThreshold: number;
}

const DEFAULT_IMPORT_CONFIG: TileImportConfig = {
  preserveAlpha: true,
  alphaThreshold: 128,
};

/**
 * Validate that a game supports tile import
 */
export function canImportTiles(game: Game): boolean {
  return isTileBasedGame(game);
}

/**
 * Get import requirements for a game
 */
export function getTileImportRequirements(game: Game): Result<{
  tileSize: number;
  maxTiles: number;
  format: string;
}, Error> {
  const config = TILE_GAME_CONFIGS[game];
  
  if (!config) {
    return err(new Error(`Game ${game} does not support tile import`));
  }
  
  return ok({
    tileSize: config.tileSize,
    maxTiles: config.maxTiles,
    format: config.tileDataFormat,
  });
}

/**
 * Load an image file and validate it for tile import
 */
export async function loadAndValidateImage(
  file: File,
  globals: GlobalsInterface,
): Promise<Result<HTMLImageElement, Error>> {
  const config = TILE_GAME_CONFIGS[globals.GAME_TYPE];
  
  if (!config) {
    return err(new Error(`Game ${globals.GAME_TYPE} does not support tile import`));
  }
  
  const expectedSize = config.tileSize;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    return err(new Error(`Invalid file type: ${file.type}. Expected an image file.`));
  }
  
  // Load image
  const image = await loadImageFile(file);
  if (!image.ok) {
    return image;
  }
  
  const img = image.value;
  
  // Validate dimensions
  if (img.width !== expectedSize || img.height !== expectedSize) {
    return err(new Error(
      `Image must be ${expectedSize}x${expectedSize} pixels. Got ${img.width}x${img.height}.`
    ));
  }
  
  return ok(img);
}

/**
 * Load an image file as HTMLImageElement
 */
function loadImageFile(file: File): Promise<Result<HTMLImageElement, Error>> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(ok(img));
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(err(new Error(`Failed to load image: ${file.name}`)));
    };
    
    img.src = objectUrl;
  });
}

/**
 * Convert an image to 16-bit ARGB1555 tile data
 * 
 * Format: 1 bit alpha, 5 bits red, 5 bits green, 5 bits blue
 * Bit layout: ARRRRRGGGGGBBBBB (big endian)
 */
export function convertImageTo16BitTileData(
  image: HTMLImageElement,
  config: TileImportConfig = DEFAULT_IMPORT_CONFIG,
): Result<Uint8Array, Error> {
  const width = image.width;
  const height = image.height;
  
  // Create canvas to extract pixel data
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return err(new Error('Failed to create canvas context'));
  }
  
  // Draw image to canvas
  ctx.drawImage(image, 0, 0);
  
  // Get pixel data
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  
  // Output: 2 bytes per pixel (16-bit)
  const tileData = new Uint8Array(width * height * 2);
  
  for (let i = 0, j = 0; i < pixels.length; i += 4, j += 2) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    
    // Convert to 5-bit per channel
    const r5 = (r >> 3) & 0x1F;
    const g5 = (g >> 3) & 0x1F;
    const b5 = (b >> 3) & 0x1F;
    
    // Convert alpha to 1-bit
    const a1 = config.preserveAlpha
      ? (a >= config.alphaThreshold ? 1 : 0)
      : 1;
    
    // Pack as ARGB1555 (big endian)
    const packed = (a1 << 15) | (r5 << 10) | (g5 << 5) | b5;
    
    // Store as big endian
    tileData[j] = (packed >> 8) & 0xFF;
    tileData[j + 1] = packed & 0xFF;
  }
  
  return ok(tileData);
}

/**
 * Convert 16-bit tile data back to a preview image
 */
export function convertTileDataToPreview(
  tileData: Uint8Array,
  tileSize: number,
): Result<string, Error> {
  if (tileData.length !== tileSize * tileSize * 2) {
    return err(new Error(
      `Invalid tile data length: ${tileData.length}. Expected ${tileSize * tileSize * 2}.`
    ));
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return err(new Error('Failed to create canvas context'));
  }
  
  const imageData = ctx.createImageData(tileSize, tileSize);
  const pixels = imageData.data;
  
  for (let i = 0, j = 0; i < tileData.length; i += 2, j += 4) {
    // Read big endian 16-bit value
    const packed = (tileData[i] << 8) | tileData[i + 1];
    
    // Extract ARGB1555 components
    const a1 = (packed >> 15) & 0x01;
    const r5 = (packed >> 10) & 0x1F;
    const g5 = (packed >> 5) & 0x1F;
    const b5 = packed & 0x1F;
    
    // Convert to 8-bit per channel
    pixels[j] = (r5 << 3) | (r5 >> 2);     // R
    pixels[j + 1] = (g5 << 3) | (g5 >> 2); // G
    pixels[j + 2] = (b5 << 3) | (b5 >> 2); // B
    pixels[j + 3] = a1 ? 255 : 0;          // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  return ok(canvas.toDataURL('image/png'));
}

/**
 * Prepare a tile for import from an image file
 * 
 * This does NOT modify level data - it just converts the image
 * and returns the data needed to add it to a level.
 */
export async function prepareTileFromImage(
  file: File,
  globals: GlobalsInterface,
  config: TileImportConfig = DEFAULT_IMPORT_CONFIG,
): Promise<Result<Omit<TileImportResult, 'newTileIndex'>, Error>> {
  // Validate game supports tiles
  const gameConfig = TILE_GAME_CONFIGS[globals.GAME_TYPE];
  if (!gameConfig) {
    return err(new Error(`Game ${globals.GAME_TYPE} does not support tile import`));
  }
  
  // Load and validate image
  const imageResult = await loadAndValidateImage(file, globals);
  if (!imageResult.ok) {
    return imageResult;
  }
  
  const image = imageResult.value;
  
  // Convert to 16-bit tile data
  const tileDataResult = convertImageTo16BitTileData(image, config);
  if (!tileDataResult.ok) {
    return tileDataResult;
  }
  
  const tileData = tileDataResult.value;
  
  // Generate preview
  const previewResult = convertTileDataToPreview(tileData, gameConfig.tileSize);
  if (!previewResult.ok) {
    return previewResult;
  }
  
  return ok({
    tileData,
    previewDataUrl: previewResult.value,
  });
}

/**
 * Validate multiple files for batch tile import
 */
export async function validateTileImportBatch(
  files: File[],
  globals: GlobalsInterface,
): Promise<Result<{
  validFiles: File[];
  invalidFiles: { file: File; reason: string }[];
}, Error>> {
  const gameConfig = TILE_GAME_CONFIGS[globals.GAME_TYPE];
  if (!gameConfig) {
    return err(new Error(`Game ${globals.GAME_TYPE} does not support tile import`));
  }
  
  const validFiles: File[] = [];
  const invalidFiles: { file: File; reason: string }[] = [];
  
  for (const file of files) {
    const result = await loadAndValidateImage(file, globals);
    if (result.ok) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, reason: result.error.message });
    }
  }
  
  return ok({ validFiles, invalidFiles });
}

/**
 * Get supported image formats for tile import
 */
export function getSupportedImageFormats(): string[] {
  return ['image/png', 'image/jpeg', 'image/bmp', 'image/gif'];
}

/**
 * Get file extension filter for tile import dialog
 */
export function getTileImportFileFilter(): string {
  return '.png,.jpg,.jpeg,.bmp,.gif';
}
