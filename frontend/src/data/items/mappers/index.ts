/**
 * Game Item Mapper Factory and Registry
 * 
 * Provides a unified way to get the appropriate model mapper for any game.
 */

import { Game } from "../../globals/globals";
import { type GameItemModelMapper } from "../itemModelTypes";
import { ottoItemMapper, OttoItemMapper } from "./ottoItemMapper";
import { bugdomItemMapper, BugdomItemMapper } from "./bugdomItemMapper";
import { bugdom2ItemMapper, Bugdom2ItemMapper } from "./bugdom2ItemMapper";

/**
 * Registry of all game mappers
 */
const MAPPER_REGISTRY: Partial<Record<Game, GameItemModelMapper>> = {
  [Game.OTTO_MATIC]: ottoItemMapper,
  [Game.BUGDOM]: bugdomItemMapper,
  [Game.BUGDOM_2]: bugdom2ItemMapper,
  // TODO: Add other mappers as they are implemented
  // [Game.NANOSAUR_2]: nanosaur2ItemMapper,
  // [Game.CRO_MAG_RALLY]: croMagItemMapper,
  // [Game.BILLY_FRONTIER]: billyFrontierItemMapper,
};

/**
 * Get the model mapper for a specific game
 */
export function getGameMapper(game: Game): GameItemModelMapper | undefined {
  return MAPPER_REGISTRY[game];
}

/**
 * Check if a game has a model mapper
 */
export function hasGameMapper(game: Game): boolean {
  return MAPPER_REGISTRY[game] !== undefined;
}

/**
 * Get all games with mappers
 */
export function getGamesWithMappers(): Game[] {
  return Object.keys(MAPPER_REGISTRY)
    .map(Number)
    .filter((g): g is Game => !isNaN(g) && MAPPER_REGISTRY[g as Game] !== undefined);
}

/**
 * Get mapping counts for all games
 */
export function getAllMappingCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const [gameKey, mapper] of Object.entries(MAPPER_REGISTRY)) {
    if (mapper) {
      const game = Number(gameKey);
      const gameName = Game[game] ?? `Game_${game}`;
      counts[gameName] = mapper.getMappingCount();
    }
  }
  
  return counts;
}

// Re-export mapper classes for direct use if needed
export { OttoItemMapper, BugdomItemMapper, Bugdom2ItemMapper };
