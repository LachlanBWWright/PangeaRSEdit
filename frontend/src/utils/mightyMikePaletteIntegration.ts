/**
 * Integration helpers for Mighty Mike Palette Manager
 *
 * This module provides utilities to integrate the dynamic palette system
 * with the level loading and tile rendering pipeline.
 *
 * All functions return Result types for explicit error handling.
 *
 * Usage example:
 * ```
 * // Load palette from TGA
 * const paletteResult = await loadScenePalette("jurassic");
 * if (isOk(paletteResult)) {
 *   gMightyMikePalette.loadPaletteFromRGBA(paletteResult.value);
 * } else {
 *   console.error("Failed to load palette:", paletteResult.error);
 * }
 *
 * // Set transparency colors for collision detection
 * gMightyMikePalette.setTransparencyColors(tileset.transparencyColors);
 *
 * // Render tiles with dynamic palette
 * const tileCanvasResult = renderTileWithDynamicPalette(tileData);
 * if (isOk(tileCanvasResult)) {
 *   const canvas = tileCanvasResult.value;
 * }
 *
 * // Fade colors for effects
 * gMightyMikePalette.makeBackUpPalette();
 * gMightyMikePalette.fadeColors(50); // 50% brightness
 * ```
 */

import { gMightyMikePalette } from "./mightyMikePalette";
import { ok, err, type Result } from "neverthrow";

/**
 * Load palette data into the global Mighty Mike palette manager
 * Call this after loading a scene's TGA palette file
 */
export function loadMightyMikePalette(paletteRGBA: Uint8Array): void {
  gMightyMikePalette.loadPaletteFromRGBA(paletteRGBA);
  console.log("[PALETTE] Palette loaded into global manager");
}

/**
 * Set the transparency colors for collision detection
 * These colors are marked as non-solid for the collision system
 * Call this after loading a tileset
 */
export function setMightyMikeTileTransparency(colorIndices: number[]): void {
  gMightyMikePalette.setTransparencyColors(colorIndices);
  console.log(
    `[PALETTE] Set ${colorIndices.length} transparency colors for collision`
  );
}

/**
 * Render a single tile with the current dynamic palette
 * This can be called at any time to get a canvas with the current palette applied
 *
 * To match C code behavior more closely, tiles should be re-rendered whenever
 * the palette changes (e.g., during fades, palette swaps, etc.)
 */
export function renderTileWithDynamicPalette(
  tileData: Uint8Array,
  tileSize = 32
): Result<HTMLCanvasElement, Error> {
  const canvas = document.createElement("canvas");
  canvas.width = tileSize;
  canvas.height = tileSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return err(new Error("Failed to get canvas 2D context"));
  }

  const imageData = ctx.createImageData(tileSize, tileSize);
  const paletteRGBA = gMightyMikePalette.getPaletteAsRGBA();
  const bytesPerTile = tileSize * tileSize;

  // Convert indexed color to RGBA using current palette
  for (let i = 0; i < bytesPerTile; i++) {
    const colorIndex = tileData[i] ?? 0;
    const pixelOffset = i * 4;

    imageData.data[pixelOffset] = paletteRGBA[colorIndex * 4] ?? 0;
    imageData.data[pixelOffset + 1] = paletteRGBA[colorIndex * 4 + 1] ?? 0;
    imageData.data[pixelOffset + 2] = paletteRGBA[colorIndex * 4 + 2] ?? 0;
    imageData.data[pixelOffset + 3] = paletteRGBA[colorIndex * 4 + 3] ?? 0;
  }

  ctx.putImageData(imageData, 0, 0);
  return ok(canvas);
}

/**
 * Re-render all tiles with the current palette
 * Use this after making palette changes (fade, brightness adjust, etc.)
 *
 * This matches the C code behavior where palette changes affect
 * all rendered tiles immediately on next display
 */
export function rerenderAllTilesWithCurrentPalette(
  tileDataBuffer: Uint8Array,
  numTiles: number,
  tileSize = 32
): Result<HTMLCanvasElement[], Error> {
  const canvases: HTMLCanvasElement[] = [];
  const bytesPerTile = tileSize * tileSize;

  for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {
    const tileDataOffset = tileIndex * bytesPerTile;
    const tileSlice = tileDataBuffer.slice(
      tileDataOffset,
      tileDataOffset + bytesPerTile
    );
    const canvasResult = renderTileWithDynamicPalette(tileSlice, tileSize);
    if (canvasResult.isErr()) {
      return err(new Error(`Failed to render tile ${tileIndex}: ${canvasResult.error.message}`));
    }
    canvases.push(canvasResult.value);
  }

  return ok(canvases);
}

/**
 * Fade in effect (matches FadeInGameCLUT in Palette.c)
 * Gradually increases brightness from 0 to 100%
 */
export async function fadeInPalette(
  durationMs = 500,
  updateCallback?: (brightness: number) => void
): Promise<void> {
  gMightyMikePalette.makeBackUpPalette();
  const startTime = Date.now();

  return new Promise((resolve) => {
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const brightness = Math.min(100, (elapsed / durationMs) * 100);

      gMightyMikePalette.fadeColors(brightness);
      if (updateCallback) {
        updateCallback(brightness);
      }

      if (brightness < 100) {
        requestAnimationFrame(animate);
      } else {
        gMightyMikePalette.restoreBackUpPalette();
        resolve();
      }
    };

    animate();
  });
}

/**
 * Fade out effect (matches FadeOutGameCLUT in Palette.c)
 * Gradually decreases brightness from 100% to 0
 */
export async function fadeOutPalette(
  durationMs = 500,
  updateCallback?: (brightness: number) => void
): Promise<void> {
  gMightyMikePalette.makeBackUpPalette();
  const startTime = Date.now();

  return new Promise((resolve) => {
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const brightness = Math.max(0, 100 - (elapsed / durationMs) * 100);

      gMightyMikePalette.fadeColors(brightness);
      if (updateCallback) {
        updateCallback(brightness);
      }

      if (brightness > 0) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    animate();
  });
}

/**
 * Check if a color is transparent for collision detection
 * Useful for game logic that needs to know collision properties
 */
export function isColorCollisionTransparent(colorIndex: number): boolean {
  return gMightyMikePalette.isColorTransparent(colorIndex);
}

/**
 * Get the color mask array for debugging/diagnostics
 * Returns array of 256 booleans indicating collision transparency
 */
export function getColorMaskArrayForDebug(): boolean[] {
  return gMightyMikePalette.getColorMaskArray();
}

/**
 * Reset palette to black (matches EraseCLUT in Palette.c)
 */
export function erasePalette(): void {
  gMightyMikePalette.eraseCLUT();
  console.log("[PALETTE] Palette erased to black");
}

/**
 * Get current palette as RGBA for rendering or diagnostics
 */
export function getCurrentPaletteRGBA(): Uint8Array {
  return gMightyMikePalette.getPaletteAsRGBA();
}
