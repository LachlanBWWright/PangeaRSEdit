import { atom } from "jotai";

/** Selected item type for the editor. */
export const SelectedItem = atom<number | undefined>(undefined);
/** Item type that should be inserted by the next click. */
export const ClickToAddItem = atom<number | undefined>(undefined);

/**
 * Stores the "safe" item types found in the originally loaded level.
 * These are item types that were present when the level was loaded,
 * indicating they won't crash the game when placed.
 */
/** Item types that were present in the loaded level and are considered safe. */
export const SafeItemTypes = atom<Set<number>>(new Set<number>());

/**
 * Controls whether the item type dropdown is filtered to only show safe types.
 * When true, only items from SafeItemTypes are shown.
 * When false, all available item types for the game are shown.
 */
/** Toggles whether the item picker is filtered to safe item types only. */
export const FilterToSafeItems = atom<boolean>(true);

/**
 * Same concept for spline items
 */
/** Spline item types that were present in the loaded level and are considered safe. */
export const SafeSplineItemTypes = atom<Set<number>>(new Set<number>());
/** Toggles whether the spline picker is filtered to safe spline items only. */
export const FilterToSafeSplineItems = atom<boolean>(true);
