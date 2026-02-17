/**
 * Level Requirements
 * 
 * Defines the minimum requirements for a valid level file for each game.
 * Used when creating blank levels or validating level data.
 */

import { Game } from "@/data/globals/globals";

/**
 * Configuration for level requirements per game
 */
export interface LevelRequirements {
  game: Game;

  // Dimensions
  minMapWidth: number;
  maxMapWidth: number;
  minMapHeight: number;
  maxMapHeight: number;

  // Required data sections
  requiresHeader: boolean;
  requiresYCrd: boolean;
  requiresAtrb: boolean;
  requiresLayr: boolean;
  requiresItCo: boolean;
  requiresSTgd: boolean;
  requiresXlat: boolean;
  requiresTimg: boolean;

  // Optional data sections
  supportsFences: boolean;
  supportsSplines: boolean;
  supportsWater: boolean;
  supportsRoof: boolean;
  supportsCheckpoints: boolean;

  // Constraints
  tilesPerSupertile: number;
  supertileTextureSize: number;
  defaultTerrainHeight: number;
}

/**
 * Level requirements for each supported game
 */
export const LEVEL_REQUIREMENTS: Record<Game, LevelRequirements> = {
  [Game.OTTO_MATIC]: {
    game: Game.OTTO_MATIC,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: true,
    supportsRoof: false,
    supportsCheckpoints: true,
    tilesPerSupertile: 8,
    supertileTextureSize: 128,
    defaultTerrainHeight: 0,
  },

  [Game.BUGDOM]: {
    game: Game.BUGDOM,
    minMapWidth: 16,
    maxMapWidth: 256,
    minMapHeight: 16,
    maxMapHeight: 256,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: false,
    requiresXlat: true,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: false,
    supportsRoof: true,
    supportsCheckpoints: false,
    tilesPerSupertile: 5,
    supertileTextureSize: 160,
    defaultTerrainHeight: 0,
  },

  [Game.BUGDOM_2]: {
    game: Game.BUGDOM_2,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: true,
    supportsRoof: false,
    supportsCheckpoints: true,
    tilesPerSupertile: 8,
    supertileTextureSize: 128,
    defaultTerrainHeight: 0,
  },

  [Game.NANOSAUR]: {
    game: Game.NANOSAUR,
    minMapWidth: 16,
    maxMapWidth: 256,
    minMapHeight: 16,
    maxMapHeight: 256,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: false,
    requiresXlat: true,
    requiresTimg: true,
    supportsFences: false,
    supportsSplines: false,
    supportsWater: false,
    supportsRoof: false,
    supportsCheckpoints: false,
    tilesPerSupertile: 5,
    supertileTextureSize: 160,
    defaultTerrainHeight: 0,
  },

  [Game.NANOSAUR_2]: {
    game: Game.NANOSAUR_2,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: true,
    supportsRoof: false,
    supportsCheckpoints: true,
    tilesPerSupertile: 8,
    supertileTextureSize: 256,
    defaultTerrainHeight: 0,
  },

  [Game.CRO_MAG]: {
    game: Game.CRO_MAG,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: false,
    supportsRoof: false,
    supportsCheckpoints: true,
    tilesPerSupertile: 8,
    supertileTextureSize: 128,
    defaultTerrainHeight: 0,
  },

  [Game.BILLY_FRONTIER]: {
    game: Game.BILLY_FRONTIER,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: true,
    supportsRoof: false,
    supportsCheckpoints: false,
    tilesPerSupertile: 8,
    supertileTextureSize: 256,
    defaultTerrainHeight: 0,
  },

  [Game.MIGHTY_MIKE]: {
    game: Game.MIGHTY_MIKE,
    minMapWidth: 32,
    maxMapWidth: 256,
    minMapHeight: 32,
    maxMapHeight: 256,
    requiresHeader: true,
    requiresYCrd: false,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: false,
    requiresSTgd: false,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: false,
    supportsSplines: false,
    supportsWater: false,
    supportsRoof: false,
    supportsCheckpoints: false,
    tilesPerSupertile: 1,
    supertileTextureSize: 32,
    defaultTerrainHeight: 0,
  },
};

/**
 * Get level requirements for a specific game
 */
export function getLevelRequirements(game: Game): LevelRequirements {
  return LEVEL_REQUIREMENTS[game];
}

/**
 * Validate level dimensions against requirements
 */
export function validateDimensions(
  game: Game,
  width: number,
  height: number,
): { valid: boolean; message?: string } {
  const req = LEVEL_REQUIREMENTS[game];

  if (width < req.minMapWidth || width > req.maxMapWidth) {
    return {
      valid: false,
      message: `Width must be between ${req.minMapWidth} and ${req.maxMapWidth}`,
    };
  }

  if (height < req.minMapHeight || height > req.maxMapHeight) {
    return {
      valid: false,
      message: `Height must be between ${req.minMapHeight} and ${req.maxMapHeight}`,
    };
  }

  // Dimensions must be divisible by tiles per supertile
  if (width % req.tilesPerSupertile !== 0) {
    return {
      valid: false,
      message: `Width must be divisible by ${req.tilesPerSupertile}`,
    };
  }

  if (height % req.tilesPerSupertile !== 0) {
    return {
      valid: false,
      message: `Height must be divisible by ${req.tilesPerSupertile}`,
    };
  }

  return { valid: true };
}

/**
 * Get suggested default dimensions for a game
 */
export function getDefaultDimensions(game: Game): { width: number; height: number } {
  const req = LEVEL_REQUIREMENTS[game];
  
  // Use a medium-sized default that's reasonable for editing
  const defaultSize = Math.min(64, req.maxMapWidth);
  
  // Round to nearest supertile size
  const roundedSize = Math.floor(defaultSize / req.tilesPerSupertile) * req.tilesPerSupertile;
  
  return {
    width: Math.max(roundedSize, req.minMapWidth),
    height: Math.max(roundedSize, req.minMapHeight),
  };
}
