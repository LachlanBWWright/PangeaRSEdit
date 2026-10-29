/**
 * Utility for loading and caching Mighty Mike shape images
 * Handles fetching .shapes files from public folder and extracting frame images
 *
 * All functions return Result types for explicit error handling.
 */

import { fetchAsset } from "@/assets/fetchAsset";
import { AssetCache } from "@/assets/assetCache";
import { gameAssetUrl } from "@/assets/gameAssetUrls";
import { registerAssetCache, getAssetState } from "@/assets/assetState";
import { Game } from "@/data/globals/globals";
import {
  parseShapesFile,
  shapeFrameToCanvas,
  type ShapeAnimationCommand,
  type RGBColor,
  type ShapesFile,
} from "../parsers/mightyMikeShapesParser";
import {
  getItemShapesFile,
  getItemSpriteMapping,
} from "../data/items/mightyMikeItemSpriteMap";
import { err, ok, type Result } from "neverthrow";
import { gMightyMikePalette } from "./mightyMikePalette";

const SHAPES_BASE_PATH = `${import.meta.env.BASE_URL}data/mightymike/shapes`;

const ANIMOP_FRAME = 1;
const ANIMOP_END = 2;
const ANIMOP_LOOP = 3;
const ANIMOP_GOTO = 5;

// Cache for loaded .shapes files
const shapesFileCache = new Map<string, ShapesFile>();
const shapeLoads = new AssetCache<ShapesFile>(() => 1, 16, 16);

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
  frameCanvasCache.clear();
  return colors;
}

/**
 * Load a .shapes file from the public folder and cache it
 */
async function loadShapesFile(
  shapesFilename: string,
): Promise<Result<ShapesFile, string>> {
  // Check cache first
  const cached = shapesFileCache.get(shapesFilename);
  if (cached) {
    return ok(cached);
  }

  const url = gameAssetUrl(Game.MIGHTY_MIKE, `Shapes/${shapesFilename}`, `${SHAPES_BASE_PATH}/${shapesFilename}`);
  const result = await shapeLoads.get(url, () => fetchAsset(url).andThen((bytes) => parseShapesFile(bytes)
    .mapErr((message) => ({ code: "decode", url, message }))));
  if (result.isErr()) {
    return err(result.error.message);
  }

  if (shapesFileCache.size >= 16) shapesFileCache.clear();
  shapesFileCache.set(shapesFilename, result.value);
  return ok(result.value);
}

/**
 * Generate a unique cache key for a frame canvas
 */
function getFrameCacheKey(
  shapesFile: string,
  shapeIndex: number,
  frameIndex: number,
): string {
  return `${shapesFile}:${shapeIndex}:${frameIndex}`;
}

/**
 * Load and render a specific frame from a shape as a canvas.
 * Returns the sprite at its natural pixel size for the level editor, with frame offsets.
 */
export async function loadShapeFrame(
  shapesFilename: string,
  shapeIndex: number,
  frameIndex = 0,
): Promise<Result<ItemFrameImage, string>> {
  const cacheKey = getFrameCacheKey(shapesFilename, shapeIndex, frameIndex);
  getGamePaletteColors();
  const revision = getAssetState().revision;

  // Check cache first
  const cached = frameCanvasCache.get(cacheKey);
  if (cached) {
    return ok(cached);
  }

  const shapesFileResult = await loadShapesFile(shapesFilename);
  if (shapesFileResult.isErr()) {
    return err(shapesFileResult.error);
  }

  const shapesFile = shapesFileResult.value;

  if (shapeIndex < 0 || shapeIndex >= shapesFile.shapes.length) {
    return err(
      `Shape index ${shapeIndex} out of bounds (file has ${shapesFile.shapes.length} shapes)`,
    );
  }

  const shape = shapesFile.shapes[shapeIndex];
  if (!shape) {
    return err(`Shape ${shapeIndex} not found in shapes file`);
  }

  if (frameIndex < 0 || frameIndex >= shape.frames.length) {
    return err(
      `Frame index ${frameIndex} out of bounds (shape has ${shape.frames.length} frames)`,
    );
  }

  const frame = shape.frames[frameIndex];
  if (!frame) {
    return err(`Frame ${frameIndex} not found in shape ${shapeIndex}`);
  }

  // Render frame to canvas using the actual game palette (not the greyscale default)
  const paletteColors = getGamePaletteColors();
  const originalCanvasResult = shapeFrameToCanvas(frame, paletteColors);
  if (originalCanvasResult.isErr()) {
    return err(originalCanvasResult.error);
  }

  const frameImage: ItemFrameImage = {
    canvas: originalCanvasResult.value,
    offsetX: frame.header.offsetX,
    offsetY: frame.header.offsetY,
  };

  // Cache and return at natural pixel size
  if (revision !== getAssetState().revision) return err("Game assets changed while loading a sprite frame");
  if (frameCanvasCache.size >= 512) {
    const oldest = frameCanvasCache.keys().next().value;
    if (oldest) frameCanvasCache.delete(oldest);
  }
  frameCanvasCache.set(cacheKey, frameImage);
  return ok(frameImage);
}

function buildAnimationFrameCycle(commands: ShapeAnimationCommand[]): number[] {
  const frameCycle: number[] = [];
  const maxSteps = 128;
  let cursor = 0;

  for (let steps = 0; steps < maxSteps; steps++) {
    if (cursor < 0 || cursor >= commands.length) {
      break;
    }

    const command = commands[cursor];
    if (!command) {
      break;
    }

    if (command.opcode === ANIMOP_FRAME) {
      frameCycle.push(command.operand);
      cursor += 1;
      continue;
    }

    if (command.opcode === ANIMOP_GOTO) {
      cursor = command.operand;
      continue;
    }

    if (command.opcode === ANIMOP_LOOP || command.opcode === ANIMOP_END) {
      break;
    }

    cursor += 1;
  }

  return frameCycle;
}

export async function getShapeAnimationFrameCycle(
  shapesFilename: string,
  shapeIndex: number,
  animationIndex: number,
): Promise<Result<number[], string>> {
  const shapesFileResult = await loadShapesFile(shapesFilename);
  if (shapesFileResult.isErr()) {
    return err(shapesFileResult.error);
  }

  const shape = shapesFileResult.value.shapes[shapeIndex];
  if (!shape) {
    return err(`Shape index ${shapeIndex} out of bounds`);
  }

  const animation = shape.animations[animationIndex];
  if (!animation) {
    return err(`Animation index ${animationIndex} out of bounds`);
  }

  const frameCycle = buildAnimationFrameCycle(animation.commands);
  if (frameCycle.length === 0) {
    return err(`Animation ${animationIndex} has no frame commands`);
  }

  return ok(frameCycle);
}

/**
 * Load an item's image (first frame) for display in the level editor.
 * Returns Ok({canvas, offsetX, offsetY}) if successful, Ok(null) if item has no sprite, or Err if loading failed.
 */
export async function loadItemImage(
  itemType: number,
  currentScene?: string,
): Promise<Result<ItemFrameImage | null, string>> {
  const mapping = getItemSpriteMapping(itemType);
  if (!mapping) {
    return ok(null); // Item has no sprite
  }

  const shapesFilename = getItemShapesFile(itemType, currentScene);
  if (!shapesFilename) {
    return ok(null); // Could not determine which shapes file to use
  }

  // Load the first frame (frame 0) of the sprite
  const frameResult = await loadShapeFrame(
    shapesFilename,
    mapping.spriteType,
    0,
  );
  if (frameResult.isErr()) {
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
  currentScene?: string,
): Promise<Result<void, string>> {
  const promises = itemTypes.map((itemType) =>
    loadItemImage(itemType, currentScene),
  );

  const results = await Promise.all(promises);

  // Check if any failed
  const failures = results.filter((result) => result.isErr());
  if (failures.length > 0) {
    const errorMessages = failures.map((failure) => failure.error).join("; ");
    return err(
      `Failed to preload ${failures.length} item image(s): ${errorMessages}`,
    );
  }

  return ok(undefined);
}

/**
 * Clear all caches
 * Useful when switching between levels/scenes
 */
export function clearItemImageCache(): void {
  shapeLoads.clear();
  shapesFileCache.clear();
  frameCanvasCache.clear();
  cachedPaletteRGBA = null;
  cachedPaletteColors = null;
}

registerAssetCache(clearItemImageCache);

/**
 * Clear a specific shapes file from cache
 */
export function clearShapesFileCache(shapesFilename: string): void {
  shapeLoads.clear();
  shapesFileCache.delete(shapesFilename);

  // Also clear all frames from this file
  const keysToDelete: string[] = [];
  for (const key of frameCanvasCache.keys()) {
    if (key.startsWith(shapesFilename + ":")) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => frameCanvasCache.delete(key));
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
