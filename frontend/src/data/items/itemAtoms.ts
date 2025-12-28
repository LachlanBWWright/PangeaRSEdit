import { atom } from "jotai";

export const SelectedItem = atom<number | undefined>(undefined);
export const ClickToAddItem = atom<number | undefined>(undefined);

/**
 * Stores the "safe" item types found in the originally loaded level.
 * These are item types that were present when the level was loaded,
 * indicating they won't crash the game when placed.
 */
export const SafeItemTypes = atom<Set<number>>(new Set<number>());

/**
 * Controls whether the item type dropdown is filtered to only show safe types.
 * When true, only items from SafeItemTypes are shown.
 * When false, all available item types for the game are shown.
 */
export const FilterToSafeItems = atom<boolean>(true);

/**
 * Same concept for spline items
 */
export const SafeSplineItemTypes = atom<Set<number>>(new Set<number>());
export const FilterToSafeSplineItems = atom<boolean>(true);

