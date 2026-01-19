import { Game } from "@/data/globals/globals";
import type {
  GameBlankLevelConfig,
  BlankLevelOptions,
  BlankLevelResult,
} from "./types";
import { ottoMaticBlankLevelConfig } from "./games/ottoMatic";
import { bugdomBlankLevelConfig } from "./games/bugdom";
import { billyFrontierBlankLevelConfig } from "./games/billyFrontier";

/**
 * Registry of blank level configurations for all supported games
 */
const BLANK_LEVEL_CONFIGS: Partial<Record<Game, GameBlankLevelConfig>> = {
  [Game.OTTO_MATIC]: ottoMaticBlankLevelConfig,
  [Game.BUGDOM]: bugdomBlankLevelConfig,
  [Game.BILLY_FRONTIER]: billyFrontierBlankLevelConfig,
  // TODO: Add configs for other games
};

/**
 * Get blank level configuration for a game
 */
export function getBlankLevelConfig(
  game: Game,
): GameBlankLevelConfig | undefined {
  return BLANK_LEVEL_CONFIGS[game];
}

/**
 * Create a blank level for the specified game
 */
export function createBlankLevel(
  game: Game,
  options: BlankLevelOptions,
): BlankLevelResult {
  const config = getBlankLevelConfig(game);
  if (!config) {
    return {
      success: false,
      error: `Blank level creation not supported for ${game}`,
    };
  }
  return config.createBlankLevel(options);
}

/**
 * Create a blank level with default options
 */
export function createDefaultBlankLevel(game: Game): BlankLevelResult {
  const config = getBlankLevelConfig(game);
  if (!config) {
    return {
      success: false,
      error: `Blank level creation not supported for ${game}`,
    };
  }
  return config.createBlankLevel({
    mapWidth: config.defaultWidth,
    mapHeight: config.defaultHeight,
    defaultHeight: config.defaultTerrainHeight,
  });
}

/**
 * Check if blank level creation is supported for a game
 */
export function isBlankLevelSupported(game: Game): boolean {
  return BLANK_LEVEL_CONFIGS[game] !== undefined;
}
