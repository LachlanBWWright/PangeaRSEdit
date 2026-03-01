/**
 * Utility for loading and caching Mighty Mike shape images
 * Handles fetching .shapes files from public folder and extracting frame images
 *
 * All functions return Result types for explicit error handling.
 */

import { parseShapesFile, shapeFrameToCanvas, ShapesFile, RGBColor } from "../parsers/mightyMikeShapesParser";
import { getItemShapesFile, getItemSpriteMapping } from "../data/items/mightyMikeItemSpriteMap";
import { Result, ok, err, isErr, fromPromise } from "../types/result";
import { gMightyMikePalette } from "./mightyMikePalette";

const SHAPES_BASE_PATH = "/PangeaRSEdit/data/mightymike/shapes";

// Cache for loaded .shapes files
const shapesFileCache = new Map<string, ShapesFile>();

/** Canvas plus the sprite's hot-spot offsets from the game's FrameHeader. */
export interface ItemFrameImage {
  canvas: HTMLCanvasElement;
  /** Horizontal offset from item world-position to the top-left of the sprite (negative = sprite starts left of item). */
  offsetX: number;
  /** Vertical offset from item world-position to the top of the sprite (negative = sprite starts above item). */
  offsetY: number;
}

// Cache for rendered frame images (canvas + offsets)
const frameCanvasCache = new Map<string, ItemFrameImage>();

// Cached palette conversion to avoid recreating on every frame render
let cachedPaletteRGBA: Uint8Array | null = null;
let cachedPaletteColors: RGBColor[] | null = null;

/**
 * Get the current game palette as an array of RGBColor objects
 * compatible with the shapes parser's shapeFrameToCanvas function.
 *
 * The palette data comes from the global MightyMikePaletteManager,
 * which should be loaded with border.tga palette data before rendering sprites.
 */
function getGamePaletteColors(): RGBColor[] {
  const paletteRGBA = gMightyMikePalette.getPaletteAsRGBA();
  if (cachedPaletteRGBA === paletteRGBA && cachedPaletteColors) {
    return cachedPaletteColors;
  }
  const colors: RGBColor[] = [];
  for (let i = 0; i < 256; i++) {
    const offset = i * 4;
    colors.push({
      r: paletteRGBA[offset] ?? 0,
      g: paletteRGBA[offset + 1] ?? 0,
      b: paletteRGBA[offset + 2] ?? 0,
    });
  }
  cachedPaletteRGBA = paletteRGBA;
  cachedPaletteColors = colors;
  return colors;
}

/**
 * Load a .shapes file from the public folder and cache it
 */
async function loadShapesFile(shapesFilename: string): Promise<Result<ShapesFile>> {
  // Check cache first
  const cached = shapesFileCache.get(shapesFilename);
  if (cached) {
    return ok(cached);
  }

  const url = `${SHAPES_BASE_PATH}/${shapesFilename}`;

  const fetchResult = await fromPromise(fetch(url));
  if (fetchResult.isErr()) {
    return err(
      new Error(
        `Failed to load shapes file '${shapesFilename}': ${fetchResult.error.message}`
      )
    );
  }

  const response = fetchResult.value;
  if (!response.ok) {
    return err(new Error(`HTTP ${response.status}: ${response.statusText}`));
  }

  const bufferResult = await fromPromise(response.arrayBuffer());
  if (bufferResult.isErr()) {
    return err(
      new Error(
        `Failed to read buffer from '${shapesFilename}': ${bufferResult.error.message}`
      )
    );
  }

  const result = parseShapesFile(bufferResult.value);

  if (isErr(result)) {
    return err(result.error);
  }

  // Cache the parsed file
  shapesFileCache.set(shapesFilename, result.value);
  return ok(result.value);
}

/**
 * Generate a unique cache key for a frame canvas
 */
function getFrameCacheKey(
  shapesFile: string,
  shapeIndex: number,
  frameIndex: number
): string {
  return `${shapesFile}:${shapeIndex}:${frameIndex}`;
}

/**
 * Load and render a specific frame from a shape as a canvas.
 * Returns the sprite at its natural pixel size for the level editor, with frame offsets.
 */
async function loadShapeFrame(
  shapesFilename: string,
  shapeIndex: number,
  frameIndex = 0
): Promise<Result<ItemFrameImage>> {
  const cacheKey = getFrameCacheKey(shapesFilename, shapeIndex, frameIndex);

  // Check cache first
  const cached = frameCanvasCache.get(cacheKey);
  if (cached) {
    return ok(cached);
  }

  const shapesFileResult = await loadShapesFile(shapesFilename);
  if (isErr(shapesFileResult)) {
    return err(shapesFileResult.error);
  }

  const shapesFile = shapesFileResult.value;

  if (shapeIndex < 0 || shapeIndex >= shapesFile.shapes.length) {
    return err(
      new Error(
        `Shape index ${shapeIndex} out of bounds (file has ${shapesFile.shapes.length} shapes)`
      )
    );
  }

  const shape = shapesFile.shapes[shapeIndex];
  if (!shape) {
    return err(
      new Error(
        `Shape ${shapeIndex} not found in shapes file`
      )
    );
  }

  if (frameIndex < 0 || frameIndex >= shape.frames.length) {
    return err(
      new Error(
        `Frame index ${frameIndex} out of bounds (shape has ${shape.frames.length} frames)`
      )
    );
  }

  const frame = shape.frames[frameIndex];
  if (!frame) {
    return err(
      new Error(
        `Frame ${frameIndex} not found in shape ${shapeIndex}`
      )
    );
  }

  // Render frame to canvas using the actual game palette (not the greyscale default)
  const paletteColors = getGamePaletteColors();
  const originalCanvasResult = shapeFrameToCanvas(frame, paletteColors);
  if (isErr(originalCanvasResult)) {
    return err(originalCanvasResult.error);
  }

  const frameImage: ItemFrameImage = {
    canvas: originalCanvasResult.value,
    offsetX: frame.header.offsetX,
    offsetY: frame.header.offsetY,
  };

  // Cache and return at natural pixel size
  frameCanvasCache.set(cacheKey, frameImage);
  return ok(frameImage);
}

/**
 * Load an item's image (first frame) for display in the level editor.
 * Returns Ok({canvas, offsetX, offsetY}) if successful, Ok(null) if item has no sprite, or Err if loading failed.
 */
export async function loadItemImage(
  itemType: number,
  currentScene?: string
): Promise<Result<ItemFrameImage | null>> {
  const mapping = getItemSpriteMapping(itemType);
  if (!mapping) {
    return ok(null); // Item has no sprite
  }

  const shapesFilename = getItemShapesFile(itemType, currentScene);
  if (!shapesFilename) {
    return ok(null); // Could not determine which shapes file to use
  }

  // Load the first frame (frame 0) of the sprite
  const frameResult = await loadShapeFrame(shapesFilename, mapping.spriteType, 0);
  if (isErr(frameResult)) {
    return err(frameResult.error);
  }
  return ok(frameResult.value);
}

/**
 * Preload item images for faster display
 * Useful to call before rendering the item menu
 * Returns a Result indicating overall success/failure
 */
export async function preloadItemImages(
  itemTypes: number[],
  currentScene?: string
): Promise<Result<void>> {
  const promises = itemTypes.map(itemType =>
    loadItemImage(itemType, currentScene)
  );

  const results = await Promise.all(promises);

  // Check if any failed
  const failures = results.filter(isErr);
  if (failures.length > 0) {
    return err(
      new Error(
        `Failed to preload ${failures.length} item image(s): ${
          failures.map(f => f.error.message).join("; ")
        }`
      )
    );
  }

  return ok(undefined);
}

/**
 * Clear all caches
 * Useful when switching between levels/scenes
 */
export function clearItemImageCache(): void {
  shapesFileCache.clear();
  frameCanvasCache.clear();
  cachedPaletteRGBA = null;
  cachedPaletteColors = null;
}

/**
 * Clear a specific shapes file from cache
 */
export function clearShapesFileCache(shapesFilename: string): void {
  shapesFileCache.delete(shapesFilename);

  // Also clear all frames from this file
  const keysToDelete: string[] = [];
  for (const key of frameCanvasCache.keys()) {
    if (key.startsWith(shapesFilename + ":")) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => frameCanvasCache.delete(key));
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  shapesFilesCached: number;
  framesRendered: number;
} {
  return {
    shapesFilesCached: shapesFileCache.size,
    framesRendered: frameCanvasCache.size,
  };
}
