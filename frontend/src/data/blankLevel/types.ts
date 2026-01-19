import type { LevelData } from "@/python/structSpecs/LevelTypes";
import { Game } from "@/data/globals/globals";

/**
 * Options for creating a blank level
 */
export interface BlankLevelOptions {
  /** Width in tiles (must be divisible by TILES_PER_SUPERTILE for 3D games) */
  mapWidth: number;
  /** Height in tiles (must be divisible by TILES_PER_SUPERTILE for 3D games) */
  mapHeight: number;
  /** Default terrain height (default: 0) */
  defaultHeight?: number;
  /** Default tile attribute flags */
  defaultTileFlags?: number;
  /** Level name (for display) */
  levelName?: string;
}

/**
 * Result of creating a blank level
 */
export interface BlankLevelResult {
  success: boolean;
  levelData?: LevelData;
  error?: string;
  warnings?: string[];
}

/**
 * Per-game configuration for blank level creation
 */
export interface GameBlankLevelConfig {
  game: Game;
  tilesPerSupertile: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  defaultTerrainHeight: number;
  createBlankLevel: (options: BlankLevelOptions) => BlankLevelResult;
}
