/**
 * Unified Item Model Types
 * 
 * Provides a standardized interface for item model mappings across all games.
 * This allows the 3D editor to work with a consistent API regardless of
 * which game is being edited.
 */

import { Game } from "../globals/globals";
import type { StandardParamType } from "./standardParamTypes";

/**
 * A citation to a specific line or range of lines in a game's source code repository.
 * Used to document which game source code defines an item's model, scale, type, etc.
 */
export interface SourceCitation {
  /** The source file path relative to the game repository root (e.g. "src/Items/Items.c") */
  file: string;
  /** The starting line number in the source file */
  line: number;
  /** Optional ending line number for multi-line citations */
  endLine?: number;
  /** Brief description of what this citation demonstrates (e.g. "scale = 2.5", "model type enum") */
  description: string;
}

/**
 * Game repository info for constructing citation URLs
 */
export interface GameRepository {
  /** GitHub owner (e.g. "jorio") */
  owner: string;
  /** GitHub repo name (e.g. "ottomatic") */
  repo: string;
  /** Git commit SHA or branch for stable links */
  commitHash: string;
}

/**
 * Repository info for each supported game
 */
export const GAME_REPOSITORIES: Partial<Record<Game, GameRepository>> = {
  [Game.OTTO_MATIC]: { owner: "jorio", repo: "ottomatic", commitHash: "636056a92c1f276a5af5c3dc7df5c3cb952fd47a" },
  [Game.BUGDOM]: { owner: "jorio", repo: "bugdom", commitHash: "7d7ad9979a86a7a149a85611bb01b06a339f4805" },
  [Game.BUGDOM_2]: { owner: "jorio", repo: "bugdom2", commitHash: "a0e59762400447706c2a15e052837c1f9a7e8dae" },
  [Game.NANOSAUR]: { owner: "jorio", repo: "nanosaur", commitHash: "f6020d31d28768893afffa06a991290cc2999d66" },
  [Game.NANOSAUR_2]: { owner: "jorio", repo: "nanosaur2", commitHash: "1ab4f4c9aeac26c6959271279590721968ead799" },
  [Game.CRO_MAG]: { owner: "jorio", repo: "cromagrally", commitHash: "370fc175466d6ced3612afb7b171c958cb6b76e1" },
  [Game.BILLY_FRONTIER]: { owner: "jorio", repo: "billyfrontier", commitHash: "04c92dc9b8867e63d728a58df4300a6b47a363a9" },
};

/**
 * Construct a raw GitHub URL for a source citation
 */
export function getCitationRawUrl(game: Game, citation: SourceCitation): string {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) return "";
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.commitHash}/${citation.file}`;
}

/**
 * Construct a GitHub permalink URL for a source citation
 */
export function getCitationPermalink(game: Game, citation: SourceCitation): string {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) return "";
  const lineRef = citation.endLine 
    ? `#L${citation.line}-L${citation.endLine}` 
    : `#L${citation.line}`;
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${repo.commitHash}/${citation.file}${lineRef}`;
}

/**
 * Universal model mapping that works across all games
 */
export interface UniversalItemModelMapping {
  /** BG3D filename */
  modelFile: string;
  
  /** Path type - whether model is in models/ or skeletons/ directory */
  modelPath: "models" | "skeletons";
  
  /** Model index within the BG3D file (maps to Subgroup_N) */
  modelIndex: number;
  
  /** Number of consecutive subgroups to include (default: 1).
   *  Some items are composed of multiple consecutive subgroups. */
  groupSize?: number;
  
  /** Alternative models for variants (indexed by p0 value) */
  variants?: Record<number, {
    modelFile?: string;  // Optional different file
    modelIndex: number;  // Different subgroup
  }>;
  
  /** True if model requires skeleton data */
  requiresSkeleton?: boolean;
  
  /** Skeleton file */
  skeletonFile?: string;
  
  /** Uniform scale multiplier (default: 1.0) */
  scale?: number;
  
  /** Horizontal scale multiplier (X/Z axes, default: 1.0) */
  scaleXZ?: number;
  
  /** Vertical scale multiplier (Y axis, default: 1.0) */
  scaleY?: number;
  
  /** Rotation offset (radians) around Y axis */
  rotationY?: number;
  
  /** Position offset in world units [x, y, z] */
  positionOffset?: [number, number, number];
  
  /** Which parameter controls rotation */
  rotationParam?: {
    paramIndex: 0 | 1 | 2 | 3;
    rotationType: StandardParamType;
  };
  
  /** Which parameter controls scale */
  scaleParam?: {
    paramIndex: 0 | 1 | 2 | 3;
    multiplier: number;
    offset: number;
  };
  
  /** Level restriction (undefined = all levels, -1 = not available) */
  levelRestriction?: number;
  
  /** Source code citations for this mapping */
  citations?: SourceCitation[];
}

/**
 * Game-specific model mapper interface
 */
export interface GameItemModelMapper {
  /** The game this mapper is for */
  readonly game: Game;
  
  /**
   * Get model mapping for an item type
   * @param itemType Item type ID
   * @param levelNum Current level number (for level-specific models)
   * @param params Item parameters (for variant selection)
   */
  getMapping(
    itemType: number,
    levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined;
  
  /**
   * Get all mapped item types
   */
  getMappedTypes(): number[];
  
  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean;
  
  /**
   * Get the total number of item types with mappings
   */
  getMappingCount(): number;
  
  /**
   * Check if an item type requires a different model per level.
   * For level-dependent items, the model varies based on the current level number.
   */
  isLevelDependent?(itemType: number): boolean;
  
  /**
   * Check if an item type has param-dependent model selection.
   * For param-dependent items, the model varies based on item parameters.
   */
  isParamDependent?(itemType: number): boolean;
  
  /**
   * Get the param-dependent configuration for an item type.
   * Returns undefined if the item type is not param-dependent.
   */
  getParamDependentConfig?(itemType: number): {
    paramIndex: 0 | 1 | 2 | 3;
    paramType: {
      options: Record<number, string>;
      modelVariants?: Record<number, unknown>;
    };
  } | undefined;
  
  /**
   * Get param-dependent options for display.
   * Returns undefined if the item type is not param-dependent.
   */
  getParamDependentOptions?(itemType: number): {
    paramIndex: number;
    options: { value: number; label: string }[];
  } | undefined;
}

/**
 * Registry of model paths and files for each game
 */
export interface GameModelRegistry {
  game: Game;
  modelBasePath: string;
  skeletonBasePath: string;
  globalModels: string[];
  levelModels: Record<number, string[]>;  // levelNum -> model files
}

/**
 * Model registries for each supported game
 */
export const GAME_MODEL_REGISTRIES: Partial<Record<Game, GameModelRegistry>> = {
  [Game.OTTO_MATIC]: {
    game: Game.OTTO_MATIC,
    modelBasePath: "games/ottomatic/models",
    skeletonBasePath: "games/ottomatic/skeletons",
    globalModels: ["global.bg3d"],
    levelModels: {
      1: ["level1_farm.bg3d"],
      2: ["level2_slime.bg3d"],
      3: ["level3_blobboss.bg3d"],
      4: ["level4_apocalypse.bg3d"],
      5: ["level5_cloud.bg3d"],
      6: ["level6_jungle.bg3d"],
      7: ["level7_jungleboss.bg3d"],
      8: ["level8_fireice.bg3d"],
      9: ["level9_saucer.bg3d"],
      10: ["level10_brainboss.bg3d"],
    },
  },
  [Game.BUGDOM_2]: {
    game: Game.BUGDOM_2,
    modelBasePath: "games/bugdom2/models",
    skeletonBasePath: "games/bugdom2/skeletons",
    globalModels: ["global.bg3d", "foliage.bg3d"],
    levelModels: {
      0: ["garden.bg3d"],
      1: ["sidewalk.bg3d"],
      2: ["plumbing.bg3d"],
      3: ["playroom.bg3d"],
      4: ["closet.bg3d"],
      5: ["gutter.bg3d"],
      6: ["garbage.bg3d"],
      7: ["balsa.bg3d"],
      8: ["park.bg3d"],
      9: ["pond.bg3d"],
      10: ["backyard.bg3d"],
    },
  },
  [Game.BUGDOM]: {
    game: Game.BUGDOM,
    modelBasePath: "games/bugdom/models",
    skeletonBasePath: "games/bugdom/skeletons",
    globalModels: ["global1.bg3d", "global2.bg3d"],
    levelModels: {
      0: ["lawn1.bg3d"],
      1: ["lawn2.bg3d"],
      2: ["pond.bg3d"],
      3: ["forest.bg3d"],
      4: ["hive.bg3d"],
      5: ["night.bg3d"],
      6: ["anthill.bg3d"],
      7: ["antqueen.bg3d"],
      8: ["lawn3.bg3d"],
      9: ["forest2.bg3d"],
    },
  },
  [Game.NANOSAUR_2]: {
    game: Game.NANOSAUR_2,
    modelBasePath: "games/nanosaur2/models",
    skeletonBasePath: "games/nanosaur2/skeletons",
    globalModels: ["global.bg3d"],
    levelModels: {
      1: ["level1.bg3d"],
      2: ["level2.bg3d"],
      3: ["level3.bg3d"],
    },
  },
  [Game.CRO_MAG]: {
    game: Game.CRO_MAG,
    modelBasePath: "games/cromag/models",
    skeletonBasePath: "games/cromag/skeletons",
    globalModels: ["global.bg3d"],
    levelModels: {},  // Track-specific models
  },
  [Game.BILLY_FRONTIER]: {
    game: Game.BILLY_FRONTIER,
    modelBasePath: "games/billyfrontier/models",
    skeletonBasePath: "games/billyfrontier/skeletons",
    globalModels: ["global.bg3d"],
    levelModels: {
      0: ["town.bg3d"],
      1: ["swamp.bg3d"],
    },
  },
};

/**
 * Item category for placeholder rendering
 */
export type ItemCategory = 
  | "enemy" 
  | "powerup" 
  | "environmental" 
  | "trigger" 
  | "player" 
  | "decoration"
  | "unknown";

/**
 * Colors for each item category (used in placeholder cubes)
 */
export const ITEM_CATEGORY_COLORS: Record<ItemCategory, number> = {
  enemy: 0xff4444,        // Red
  powerup: 0x44ff44,      // Green
  environmental: 0x8888ff, // Blue
  trigger: 0xffff44,      // Yellow
  player: 0xff44ff,       // Magenta
  decoration: 0x88ffff,   // Cyan
  unknown: 0xaaaaaa,      // Gray
};

/**
 * Get the category color for an item
 */
export function getCategoryColor(category: ItemCategory): number {
  return ITEM_CATEGORY_COLORS[category];
}

/**
 * Get the model registry for a game
 */
export function getModelRegistry(game: Game): GameModelRegistry | undefined {
  return GAME_MODEL_REGISTRIES[game];
}

/**
 * Check if a game has 3D model support
 */
export function gameHasModelSupport(game: Game): boolean {
  return GAME_MODEL_REGISTRIES[game] !== undefined;
}

/**
 * Get all games with model support
 */
export function getGamesWithModelSupport(): Game[] {
  return Object.keys(GAME_MODEL_REGISTRIES)
    .map(Number)
    .filter((g): g is Game => !isNaN(g));
}

/**
 * Helper to construct full model path
 */
export function getFullModelPath(
  registry: GameModelRegistry,
  modelFile: string,
  pathType: "models" | "skeletons",
): string {
  const basePath = pathType === "models" 
    ? registry.modelBasePath 
    : registry.skeletonBasePath;
  return `${basePath}/${modelFile}`;
}
