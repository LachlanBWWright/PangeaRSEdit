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
import { nanosaur1ItemMapper, Nanosaur1ItemMapper } from "./nanosaur1ItemMapper";
import { nanosaur2ItemMapper, Nanosaur2ItemMapper } from "./nanosaur2ItemMapper";
import { croMagItemMapper, CroMagItemMapper } from "./croMagItemMapper";
import { billyFrontierItemMapper, BillyFrontierItemMapper } from "./billyFrontierItemMapper";

/**
 * Registry of all game mappers
 */
const MAPPER_REGISTRY: Partial<Record<Game, GameItemModelMapper>> = {
  [Game.OTTO_MATIC]: ottoItemMapper,
  [Game.BUGDOM]: bugdomItemMapper,
  [Game.BUGDOM_2]: bugdom2ItemMapper,
  [Game.NANOSAUR]: nanosaur1ItemMapper,
  [Game.NANOSAUR_2]: nanosaur2ItemMapper,
  [Game.CRO_MAG]: croMagItemMapper,
  [Game.BILLY_FRONTIER]: billyFrontierItemMapper,
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

/**
 * Get total mapped item count across all games
 */
export function getTotalMappedItems(): number {
  return Object.values(getAllMappingCounts()).reduce((sum, count) => sum + count, 0);
}

/**
 * Get summary of mapper coverage
 */
export function getMapperCoverageSummary(): {
  gamesWithMappers: number;
  totalMappedItems: number;
  gameDetails: { game: string; itemCount: number }[];
} {
  const counts = getAllMappingCounts();
  const gameDetails = Object.entries(counts)
    .map(([game, itemCount]) => ({ game, itemCount }))
    .sort((a, b) => b.itemCount - a.itemCount);
  
  return {
    gamesWithMappers: Object.keys(counts).length,
    totalMappedItems: Object.values(counts).reduce((sum, c) => sum + c, 0),
    gameDetails,
  };
}

/**
 * Generate a text report of mapper coverage
 */
export function getMapperCoverageReport(): string {
  const summary = getMapperCoverageSummary();
  const lines = [
    `Item Model Mapper Coverage Report`,
    `=================================`,
    `Games with mappers: ${summary.gamesWithMappers}`,
    `Total mapped items: ${summary.totalMappedItems}`,
    ``,
    `By Game:`,
    ...summary.gameDetails.map(g => `  - ${g.game}: ${g.itemCount} items`),
  ];
  return lines.join('\n');
}

// Re-export mapper classes for direct use if needed
export { 
  OttoItemMapper, 
  BugdomItemMapper, 
  Bugdom2ItemMapper, 
  Nanosaur1ItemMapper,
  Nanosaur2ItemMapper, 
  CroMagItemMapper,
  BillyFrontierItemMapper,
};
