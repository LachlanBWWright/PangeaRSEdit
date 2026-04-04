import { atom } from "jotai";

/**
 * Game-specific data atoms
 * Stores non-serializable data like DOM elements that shouldn't go through Immer
 */

/**
 * Current scene for Mighty Mike levels
 * Used to determine which .shapes files to load for item sprites
 * Possible values: "jurassic", "candy", "clown", "fairy", "bargain"
 */
export const CurrentScene = atom<string | undefined>(undefined);
export const MIGHTY_MIKE_SCENES = [
  "jurassic",
  "candy",
  "fairy",
  "clown",
  "bargain",
] as const;

/**
 * Toggle for visualizing collision masks on Mighty Mike tiles
 * When true, tiles with collision masking enabled will show a visual overlay
 */
export const ShowMightyMikeCollisionOverlay = atom<boolean>(false);

/**
 * When true, clicking/dragging over tiles in the map toggles their hasCollisionMask value.
 * This allows painting collision on/off across multiple tiles quickly.
 */
export const CollisionBrushMode = atom<boolean>(false);
