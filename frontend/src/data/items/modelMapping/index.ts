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
import { getCroMagItemModelMapping } from "../cromagItemModelMapping";
import { getBillyFrontierItemModelMapping } from "../billyFrontierItemModelMapping";

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
      return getBugdomItemModelMapping(itemType) as
        | ItemModelMapping
        | undefined;

    case Game.BUGDOM_2:
      return getBugdom2ItemModelMapping(itemType) as
        | ItemModelMapping
        | undefined;

    case Game.NANOSAUR:
      return getNanosaurItemModelMapping(itemType) as
        | ItemModelMapping
        | undefined;

    case Game.NANOSAUR_2:
      return getNanosaur2ItemModelMapping(itemType) as
        | ItemModelMapping
        | undefined;

    case Game.CRO_MAG:
      return getCroMagItemModelMapping(itemType) as
        | ItemModelMapping
        | undefined;

    case Game.BILLY_FRONTIER:
      return getBillyFrontierItemModelMapping(itemType) as
        | ItemModelMapping
        | undefined;

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
