/**
 * Utility for loading and caching Mighty Mike shape images
 * Handles fetching .shapes files from public folder and extracting frame images
 *
 * All functions return Result types for explicit error handling.
 */

import { parseShapesFile, shapeFrameToCanvas, ShapesFile } from "../parsers/mightyMikeShapesParser";
import { getItemShapesFile, getItemSpriteMapping } from "../data/items/mightyMikeItemSpriteMap";
import { Result, ok, err, isErr } from "../types/result";

const SHAPES_BASE_PATH = "/PangeaRSEdit/data/mightymike/shapes";

// Cache for loaded .shapes files
const shapesFileCache = new Map<string, ShapesFile>();

// Cache for rendered frame canvases
const frameCanvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Load a .shapes file from the public folder and cache it
 */
async function loadShapesFile(shapesFilename: string): Promise<Result<ShapesFile>> {
  // Check cache first
  if (shapesFileCache.has(shapesFilename)) {
    return ok(shapesFileCache.get(shapesFilename)!);
  }

  const url = `${SHAPES_BASE_PATH}/${shapesFilename}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return err(new Error(`HTTP ${response.status}: ${response.statusText}`));
    }

    const buffer = await response.arrayBuffer();
    const result = parseShapesFile(buffer);

    if (isErr(result)) {
      return err(result.error);
    }

    // Cache the parsed file
    shapesFileCache.set(shapesFilename, result.value);
    return ok(result.value);
  } catch (error) {
    return err(
      new Error(
        `Failed to load shapes file '${shapesFilename}': ${
          error instanceof Error ? error.message : String(error)
        }`
      )
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
  frameIndex = 0
): Promise<Result<HTMLCanvasElement>> {
  const cacheKey = getFrameCacheKey(shapesFilename, shapeIndex, frameIndex);

  // Check cache first
  if (frameCanvasCache.has(cacheKey)) {
    return ok(frameCanvasCache.get(cacheKey)!);
  }

  try {
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

    // Render frame to canvas at original size
    const originalCanvasResult = shapeFrameToCanvas(frame, shapesFile.colorTable);
    if (isErr(originalCanvasResult)) {
      return err(originalCanvasResult.error);
    }
    const originalCanvas = originalCanvasResult.value;

    // Scale down to display size (12x12 pixels) for the level editor
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = ITEM_DISPLAY_SIZE;
    scaledCanvas.height = ITEM_DISPLAY_SIZE;

    const ctx = scaledCanvas.getContext('2d');
    if (!ctx) {
      return err(new Error('Failed to get canvas context for scaling'));
    }

    // Use nearest-neighbor scaling to preserve pixel art appearance
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(originalCanvas, 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE);

    // Cache the rendered canvas
    frameCanvasCache.set(cacheKey, scaledCanvas);
    return ok(scaledCanvas);
  } catch (error) {
    return err(
      new Error(
        `Failed to load shape frame: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }
}

/**
 * Load an item's image (first frame) for display in the level editor
 * Returns Ok(canvas) if successful, Ok(null) if item has no sprite, or Err if loading failed
 */
export async function loadItemImage(
  itemType: number,
  currentScene?: string
): Promise<Result<HTMLCanvasElement | null>> {
  try {
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
  } catch (error) {
    return err(
      new Error(
        `Failed to load item ${itemType} image: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }
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
