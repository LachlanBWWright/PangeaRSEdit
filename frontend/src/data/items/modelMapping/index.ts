/**
 * Unified dispatcher for getting item model mappings across all games.
 * Routes to game-specific mapping files based on the current game type.
 */

import { Game } from "@/data/globals/globals";
import type { ItemModelMapping } from "./types";
import { getItemModelMapping as getOttoModelMapping } from "../ottoItemModelMapping";
import { getBugdomItemModelMapping } from "../bugdomItemModelMapping";
import { getBugdom2ItemModelMapping } from "../bugdom2ItemModelMapping";
import { getNanosaurItemModelMapping } from "../nanosaurItemModelMapping";
import { getNanosaur2ItemModelMapping } from "../nanosaur2ItemModelMapping";
import { getCromagItemModelMapping } from "../cromagItemModelMapping";
import { getBillyFrontierItemModelMapping } from "../billyFrontierItemModelMapping";

/**
 * Convert game-specific mapping to unified ItemModelMapping
 */
function toItemModelMapping(
  mapping:
    | {
        modelFile: string;
        modelPath: string;
        modelIndex: number;
        requiresSkeleton?: boolean;
        skeletonFile?: string;
        scale?: number;
        rotationY?: number;
      }
    | undefined,
): ItemModelMapping | undefined {
  if (!mapping) return undefined;
  return {
    modelFile: mapping.modelFile,
    modelPath: mapping.modelPath,
    modelIndex: mapping.modelIndex,
    requiresSkeleton: mapping.requiresSkeleton,
    skeletonFile: mapping.skeletonFile,
    scale: mapping.scale,
    rotationY: mapping.rotationY,
  };
}

/**
 * Get the model mapping for a specific item type in the given game
 */
export function getItemModelMappingForGame(
  game: Game,
  itemType: number,
): ItemModelMapping | undefined {
  switch (game) {
    case Game.OTTO_MATIC:
      return getOttoModelMapping(itemType);

    case Game.BUGDOM:
      return toItemModelMapping(getBugdomItemModelMapping(itemType));

    case Game.BUGDOM_2:
      return toItemModelMapping(getBugdom2ItemModelMapping(itemType));

    case Game.NANOSAUR:
      return toItemModelMapping(getNanosaurItemModelMapping(itemType));

    case Game.NANOSAUR_2:
      return toItemModelMapping(getNanosaur2ItemModelMapping(itemType));

    case Game.CRO_MAG:
      return toItemModelMapping(getCromagItemModelMapping(itemType));

    case Game.BILLY_FRONTIER:
      return toItemModelMapping(getBillyFrontierItemModelMapping(itemType));

    case Game.MIGHTY_MIKE:
      // Mighty Mike is 2D, no 3D models
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Get the base path for model files for a given game
 */
export function getGameModelBasePath(game: Game): string {
  switch (game) {
    case Game.OTTO_MATIC:
      return "/games/ottomatic";
    case Game.BUGDOM:
      return "/games/bugdom";
    case Game.BUGDOM_2:
      return "/games/bugdom2";
    case Game.NANOSAUR:
      return "/games/nanosaur";
    case Game.NANOSAUR_2:
      return "/games/nanosaur2";
    case Game.CRO_MAG:
      return "/games/cromagrally";
    case Game.BILLY_FRONTIER:
      return "/games/billyfrontier";
    default:
      return "/games/unknown";
  }
}

/**
 * Check if a game supports 3D item models
 */
export function gameSupports3DModels(game: Game): boolean {
  // Mighty Mike is 2D-only
  return game !== Game.MIGHTY_MIKE;
}
