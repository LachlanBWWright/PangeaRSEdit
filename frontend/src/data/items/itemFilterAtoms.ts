/**
 * Item Filter State Atoms
 *
 * Jotai atoms for managing item visibility filters in the map view.
 * Supports filtering by category, specific item types, and search queries.
 */

import { atom } from "jotai";
import { ItemCategory } from "./itemCategories";
import type { FilterableItemKey } from "./itemFilterKeys";

function makeCategories(
  ...shown: ItemCategory[]
): Record<ItemCategory, boolean> {
  return {
    [ItemCategory.ENEMY]: shown.includes(ItemCategory.ENEMY),
    [ItemCategory.POWERUP]: shown.includes(ItemCategory.POWERUP),
    [ItemCategory.ENVIRONMENTAL]: shown.includes(ItemCategory.ENVIRONMENTAL),
    [ItemCategory.TRIGGER]: shown.includes(ItemCategory.TRIGGER),
    [ItemCategory.PLAYER]: shown.includes(ItemCategory.PLAYER),
    [ItemCategory.UNKNOWN]: shown.includes(ItemCategory.UNKNOWN),
  };
}

/**
 * Filter mode determines how filters are applied
 */
export enum FilterMode {
  /** Show all items regardless of filter settings */
  SHOW_ALL = "show_all",
  /** Only show items that match filter criteria */
  SHOW_SELECTED = "show_selected",
  /** Show everything except items that match filter criteria */
  HIDE_SELECTED = "hide_selected",
}

/**
 * Filter state for item visibility
 */
export interface ItemFilterState {
  /** Current filter mode */
  mode: FilterMode;

  /** Category-level filters (true = category is included) */
  categories: Record<ItemCategory, boolean>;

  /** Individual item type overrides (undefined = use category setting) */
  itemTypes: Record<FilterableItemKey, boolean | undefined>;

  /** Search query for highlighting/filtering */
  searchQuery: string;

  /** List of highlighted item type IDs (from search) */
  highlightedTypes: FilterableItemKey[];
}

/**
 * Default filter state (show everything)
 */
export const DEFAULT_FILTER_STATE: ItemFilterState = {
  mode: FilterMode.SHOW_ALL,
  categories: {
    [ItemCategory.ENEMY]: true,
    [ItemCategory.POWERUP]: true,
    [ItemCategory.ENVIRONMENTAL]: true,
    [ItemCategory.TRIGGER]: true,
    [ItemCategory.PLAYER]: true,
    [ItemCategory.UNKNOWN]: true,
  },
  itemTypes: {},
  searchQuery: "",
  highlightedTypes: [],
};

/**
 * Main filter state atom
 */
export const itemFilterStateAtom = atom<ItemFilterState>(DEFAULT_FILTER_STATE);

/**
 * Filter preset definition
 */
export interface FilterPreset {
  name: string;
  description: string;
  state: Partial<ItemFilterState>;
}

/**
 * Built-in filter presets
 */
export const FILTER_PRESETS: FilterPreset[] = [
  {
    name: "Show All",
    description: "Show all items",
    state: {
      mode: FilterMode.SHOW_ALL,
    },
  },
  {
    name: "Enemies Only",
    description: "Show only enemy items",
    state: {
      mode: FilterMode.SHOW_SELECTED,
      categories: makeCategories(ItemCategory.ENEMY),
    },
  },
  {
    name: "Powerups Only",
    description: "Show only powerup items",
    state: {
      mode: FilterMode.SHOW_SELECTED,
      categories: makeCategories(ItemCategory.POWERUP),
    },
  },
  {
    name: "Triggers & Spawns",
    description: "Show triggers, checkpoints, and player spawns",
    state: {
      mode: FilterMode.SHOW_SELECTED,
      categories: makeCategories(ItemCategory.TRIGGER, ItemCategory.PLAYER),
    },
  },
  {
    name: "Hide Decorations",
    description: "Hide environmental decorations",
    state: {
      mode: FilterMode.HIDE_SELECTED,
      categories: makeCategories(ItemCategory.ENVIRONMENTAL),
    },
  },
];

/**
 * Atom for saved custom filter presets
 */
export const savedFiltersAtom = atom<FilterPreset[]>([]);

/**
 * Derived atom to check if filters are currently active
 */
export const isFilterActiveAtom = atom((get) => {
  const filter = get(itemFilterStateAtom);
  return filter.mode !== FilterMode.SHOW_ALL;
});
