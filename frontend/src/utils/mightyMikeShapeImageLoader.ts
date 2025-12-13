/**
 * Utility for loading and caching Mighty Mike shape images
 * Handles fetching .shapes files from public folder and extracting frame images
 */

import { parseShapesFile, shapeFrameToCanvas, ShapesFile } from "../parsers/mightyMikeShapesParser";
import { getItemShapesFile, getItemSpriteMapping } from "../data/items/mightyMikeItemSpriteMap";
import { isErr } from "../types/result";

const SHAPES_BASE_PATH = "/PangeaRSEdit/data/mightymike/shapes";

// Cache for loaded .shapes files
const shapesFileCache = new Map<string, ShapesFile>();

// Cache for rendered frame canvases
const frameCanvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Load a .shapes file from the public folder and cache it
 */
async function loadShapesFile(shapesFilename: string): Promise<ShapesFile> {
  // Check cache first
  if (shapesFileCache.has(shapesFilename)) {
    return shapesFileCache.get(shapesFilename)!;
  }

  const url = `${SHAPES_BASE_PATH}/${shapesFilename}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const result = parseShapesFile(buffer);

    if (isErr(result)) {
      throw result.error;
    }

    // Cache the parsed file
    shapesFileCache.set(shapesFilename, result.value);
    return result.value;
  } catch (error) {
    throw new Error(
      `Failed to load shapes file '${shapesFilename}': ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
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

const ITEM_DISPLAY_SIZE = 12; // Size to scale item sprites to (in pixels)

/**
 * Load and render a specific frame from a shape as a canvas
 * Scales the sprite to ITEM_DISPLAY_SIZE for use in the level editor
 */
async function loadShapeFrame(
  shapesFilename: string,
  shapeIndex: number,
  frameIndex: number = 0
): Promise<HTMLCanvasElement> {
  const cacheKey = getFrameCacheKey(shapesFilename, shapeIndex, frameIndex);

  // Check cache first
  if (frameCanvasCache.has(cacheKey)) {
    return frameCanvasCache.get(cacheKey)!;
  }

  try {
    const shapesFile = await loadShapesFile(shapesFilename);

    if (shapeIndex < 0 || shapeIndex >= shapesFile.shapes.length) {
      throw new Error(
        `Shape index ${shapeIndex} out of bounds (file has ${shapesFile.shapes.length} shapes)`
      );
    }

    const shape = shapesFile.shapes[shapeIndex];
    if (!shape) {
      throw new Error(
        `Shape ${shapeIndex} not found in shapes file`
      );
    }

    if (frameIndex < 0 || frameIndex >= shape.frames.length) {
      throw new Error(
        `Frame index ${frameIndex} out of bounds (shape has ${shape.frames.length} frames)`
      );
    }

    const frame = shape.frames[frameIndex];
    if (!frame) {
      throw new Error(
        `Frame ${frameIndex} not found in shape ${shapeIndex}`
      );
    }

    // Render frame to canvas at original size
    const originalCanvas = shapeFrameToCanvas(frame, shapesFile.colorTable);

    // Scale down to display size (12x12 pixels) for the level editor
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = ITEM_DISPLAY_SIZE;
    scaledCanvas.height = ITEM_DISPLAY_SIZE;

    const ctx = scaledCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context for scaling');
    }

    // Use nearest-neighbor scaling to preserve pixel art appearance
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(originalCanvas, 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE);

    // Cache the rendered canvas
    frameCanvasCache.set(cacheKey, scaledCanvas);
    return scaledCanvas;
  } catch (error) {
    throw new Error(
      `Failed to load shape frame: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Load an item's image (first frame) for display in the level editor
 * Returns a canvas or null if the item has no visible sprite
 */
export async function loadItemImage(
  itemType: number,
  currentScene?: string
): Promise<HTMLCanvasElement | null> {
  try {
    const mapping = getItemSpriteMapping(itemType);
    if (!mapping) {
      return null; // Item has no sprite
    }

    const shapesFilename = getItemShapesFile(itemType, currentScene);
    if (!shapesFilename) {
      return null; // Could not determine which shapes file to use
    }

    // Load the first frame (frame 0) of the sprite
    return await loadShapeFrame(shapesFilename, mapping.spriteType, 0);
  } catch (error) {
    console.error(
      `Failed to load item ${itemType} image:`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Preload item images for faster display
 * Useful to call before rendering the item menu
 */
export async function preloadItemImages(
  itemTypes: number[],
  currentScene?: string
): Promise<void> {
  const promises = itemTypes.map(itemType =>
    loadItemImage(itemType, currentScene).catch(error => {
      console.warn(`Failed to preload item ${itemType}:`, error);
    })
  );

  await Promise.all(promises);
}

/**
 * Clear all caches
 * Useful when switching between levels/scenes
 */
export function clearItemImageCache(): void {
  shapesFileCache.clear();
  frameCanvasCache.clear();
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
