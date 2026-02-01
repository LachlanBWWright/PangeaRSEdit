/**
 * Tile Game Structures
 * 
 * Configuration for tile-based games (Bugdom 1, Nanosaur 1).
 * These games use individual 32x32 pixel tiles composed into supertiles.
 */

import { Game } from "@/data/globals/globals";

/**
 * Configuration for tile-based games
 */
export interface TileGameConfig {
  game: Game;
  tileSize: number;
  tilesPerSupertile: number;
  maxTiles: number;
  tileDataFormat: "16bit" | "24bit";
  hasFlipMasks: boolean;
}

/**
 * Tile game configurations - null for non-tile-based games
 */
export const TILE_GAME_CONFIGS: Record<Game, TileGameConfig | null> = {
  [Game.BUGDOM]: {
    game: Game.BUGDOM,
    tileSize: 32,
    tilesPerSupertile: 5,
    maxTiles: 1024,
    tileDataFormat: "16bit",
    hasFlipMasks: true,
  },
  [Game.NANOSAUR]: {
    game: Game.NANOSAUR,
    tileSize: 32,
    tilesPerSupertile: 5,
    maxTiles: 1024,
    tileDataFormat: "16bit",
    hasFlipMasks: true,
  },
  // Non-tile-based games use pre-composed supertiles
  [Game.OTTO_MATIC]: null,
  [Game.BUGDOM_2]: null,
  [Game.NANOSAUR_2]: null,
  [Game.CRO_MAG]: null,
  [Game.BILLY_FRONTIER]: null,
  [Game.MIGHTY_MIKE]: null,
};

/**
 * Tile number mask (lower 12 bits)
 */
export const TILENUM_MASK = 0b0000111111111111;

/**
 * Flip/rotate masks for tile transformation
 */
export const TILE_FLIPX_MASK = 0b0001000000000000;
export const TILE_FLIPY_MASK = 0b0010000000000000;
export const TILE_FLIPXY_MASK = 0b0100000000000000;
export const TILE_ROTATE_MASK = 0b1000000000000000;

/**
 * Check if a game uses individual tiles
 */
export function isTileBasedGame(game: Game): boolean {
  return TILE_GAME_CONFIGS[game] !== null;
}

/**
 * Get tile game configuration or null
 */
export function getTileGameConfig(game: Game): TileGameConfig | null {
  return TILE_GAME_CONFIGS[game];
}

/**
 * Extract tile number from attribute bits
 */
export function extractTileNumber(bits: number): number {
  return bits & TILENUM_MASK;
}

/**
 * Check if tile should be flipped horizontally
 */
export function isTileFlippedX(bits: number): boolean {
  return (bits & TILE_FLIPX_MASK) !== 0;
}

/**
 * Check if tile should be flipped vertically
 */
export function isTileFlippedY(bits: number): boolean {
  return (bits & TILE_FLIPY_MASK) !== 0;
}

/**
 * Check if tile should be flipped diagonally
 */
export function isTileFlippedXY(bits: number): boolean {
  return (bits & TILE_FLIPXY_MASK) !== 0;
}

/**
 * Check if tile should be rotated
 */
export function isTileRotated(bits: number): boolean {
  return (bits & TILE_ROTATE_MASK) !== 0;
}

/**
 * Combine tile number with transformation flags
 */
export function createTileBits(
  tileNumber: number,
  flipX: boolean = false,
  flipY: boolean = false,
  flipXY: boolean = false,
  rotate: boolean = false,
): number {
  let bits = tileNumber & TILENUM_MASK;
  if (flipX) bits |= TILE_FLIPX_MASK;
  if (flipY) bits |= TILE_FLIPY_MASK;
  if (flipXY) bits |= TILE_FLIPXY_MASK;
  if (rotate) bits |= TILE_ROTATE_MASK;
  return bits;
}
