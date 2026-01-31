/**
 * Tile Selection Atoms
 * 
 * Jotai atoms for managing tile selection state in the editor.
 */

import { atom } from "jotai";
import type { TileInfo } from "./tileDataExtractor";

/**
 * Currently selected tile in the palette
 */
export const selectedPaletteTileAtom = atom<TileInfo | null>(null);

/**
 * Tile painting modes
 */
export enum TilePaintMode {
  SELECT = "select",
  PAINT = "paint",
  EYEDROP = "eyedrop",
  FILL = "fill",
}

/**
 * Current tile painting mode
 */
export const tilePaintModeAtom = atom<TilePaintMode>(TilePaintMode.SELECT);

/**
 * Show tile grid overlay
 */
export const showTileGridAtom = atom<boolean>(true);

/**
 * Brush radius for painting (1 = single tile, 2+ = larger brush)
 */
export const tileBrushRadiusAtom = atom<number>(1);

/**
 * Selected tiles on map (for multi-selection operations)
 */
export const selectedMapTilesAtom = atom<Set<number>>(new Set<number>());

/**
 * Tile palette search query
 */
export const tilePaletteSearchAtom = atom<string>("");

/**
 * Tile palette sort order
 */
export type TileSortOrder = "index" | "usage";
export const tilePaletteSortAtom = atom<TileSortOrder>("index");

/**
 * Show only unused tiles in palette
 */
export const showUnusedTilesOnlyAtom = atom<boolean>(false);

/**
 * Derived atom for checking if a tile is selected
 */
export const isTileSelectedAtom = atom(
  (get) => (attributeIndex: number): boolean => {
    const selected = get(selectedPaletteTileAtom);
    return selected?.attributeIndex === attributeIndex;
  },
);

/**
 * Reset all tile selection state
 */
export const resetTileSelectionAtom = atom(
  null,
  (_get, set) => {
    set(selectedPaletteTileAtom, null);
    set(tilePaintModeAtom, TilePaintMode.SELECT);
    set(selectedMapTilesAtom, new Set<number>());
    set(tilePaletteSearchAtom, "");
  },
);
