import type { BlankLevelOptions } from "./types";

/**
 * Create height data array (YCrd)
 * Note: YCrd is (mapWidth + 1) × (mapHeight + 1) for vertex heights
 */
export function createHeightArray(
  mapWidth: number,
  mapHeight: number,
  defaultHeight: number = 0,
): number[] {
  const size = (mapWidth + 1) * (mapHeight + 1);
  return new Array(size).fill(defaultHeight);
}

/**
 * Create attribute array (Atrb)
 * Size: mapWidth × mapHeight
 */
export function createAttributeArray(
  mapWidth: number,
  mapHeight: number,
  defaultFlags: number = 0,
  defaultP0: number = 0,
  defaultP1: number = 0,
): Array<{ flags: number; p0: number; p1: number }> {
  const size = mapWidth * mapHeight;
  return new Array(size).fill(null).map(() => ({
    flags: defaultFlags,
    p0: defaultP0,
    p1: defaultP1,
  }));
}

/**
 * Create supertile grid (STgd)
 * Size: (mapWidth / tilesPerSupertile) × (mapHeight / tilesPerSupertile)
 */
export function createSupertileGrid(
  mapWidth: number,
  mapHeight: number,
  tilesPerSupertile: number,
  emptyValue: number = -1,
): Array<{ superTileId: number }> {
  const gridWidth = Math.floor(mapWidth / tilesPerSupertile);
  const gridHeight = Math.floor(mapHeight / tilesPerSupertile);
  const size = gridWidth * gridHeight;

  return new Array(size).fill(null).map(() => ({
    superTileId: emptyValue,
  }));
}

/**
 * Create layer array for tile-based games (Layr)
 */
export function createLayerArray(
  mapWidth: number,
  mapHeight: number,
  defaultTile: number = 0,
): number[] {
  const size = mapWidth * mapHeight;
  return new Array(size).fill(defaultTile);
}

/**
 * Validate blank level options
 */
export function validateBlankLevelOptions(
  options: BlankLevelOptions,
  tilesPerSupertile: number,
  minWidth: number,
  maxWidth: number,
  minHeight: number,
  maxHeight: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (options.mapWidth < minWidth) {
    errors.push(`Width must be at least ${minWidth} tiles`);
  }
  if (options.mapWidth > maxWidth) {
    errors.push(`Width cannot exceed ${maxWidth} tiles`);
  }
  if (options.mapHeight < minHeight) {
    errors.push(`Height must be at least ${minHeight} tiles`);
  }
  if (options.mapHeight > maxHeight) {
    errors.push(`Height cannot exceed ${maxHeight} tiles`);
  }
  if (tilesPerSupertile > 1 && options.mapWidth % tilesPerSupertile !== 0) {
    errors.push(`Width must be divisible by ${tilesPerSupertile}`);
  }
  if (tilesPerSupertile > 1 && options.mapHeight % tilesPerSupertile !== 0) {
    errors.push(`Height must be divisible by ${tilesPerSupertile}`);
  }

  return { valid: errors.length === 0, errors };
}
