import { atom } from "jotai";
import { ItemCategory } from "./itemCategories";

/**
 * Filter mode determines how filters are applied
 */
export enum FilterMode {
  SHOW_ALL = "show_all",          // No filtering
  SHOW_SELECTED = "show_selected", // Only show checked items
  HIDE_SELECTED = "hide_selected", // Show everything except checked
}

/**
 * Filter state for item visibility
 */
export interface ItemFilterState {
  mode: FilterMode;

  // Category-level filters
  categories: Record<ItemCategory, boolean>;

  // Individual item type filters (overrides category)
  itemTypes: Record<number, boolean | undefined>;  // undefined = use category

  // Search/highlight filter (doesn't hide, just highlights)
  searchQuery: string;
  highlightedTypes: number[];
}

/**
 * Default filter state (show everything)
 */
export const DEFAULT_FILTER_STATE: ItemFilterState = {
  mode: FilterMode.SHOW_ALL,
  categories: {
    enemy: true,
    powerup: true,
    environmental: true,
    trigger: true,
    player: true,
    unknown: true,
  },
  itemTypes: {},
  searchQuery: "",
  highlightedTypes: [],
};

/**
 * Main filter state atom
 */
export const ItemFilterState = atom<ItemFilterState>(DEFAULT_FILTER_STATE);

/**
 * Filter presets
 */
export interface FilterPreset {
  name: string;
  description: string;
  state: Partial<ItemFilterState>;
}

export const FilterPresets: FilterPreset[] = [
  {
    name: "Enemies Only",
    description: "Show only enemy items",
    state: {
      mode: FilterMode.SHOW_SELECTED,
      categories: {
        enemy: true,
        powerup: false,
        environmental: false,
        trigger: false,
        player: false,
        unknown: false,
      },
    },
  },
  {
    name: "Powerups Only",
    description: "Show only powerup items",
    state: {
      mode: FilterMode.SHOW_SELECTED,
      categories: {
        enemy: false,
        powerup: true,
        environmental: false,
        trigger: false,
        player: false,
        unknown: false,
      },
    },
  },
  {
    name: "Triggers & Spawns",
    description: "Show triggers, checkpoints, and player spawns",
    state: {
      mode: FilterMode.SHOW_SELECTED,
      categories: {
        enemy: false,
        powerup: false,
        environmental: false,
        trigger: true,
        player: true,
        unknown: false,
      },
    },
  },
  {
    name: "Hide Decorations",
    description: "Hide environmental decorations",
    state: {
      mode: FilterMode.HIDE_SELECTED,
      categories: {
        enemy: false,
        powerup: false,
        environmental: true,
        trigger: false,
        player: false,
        unknown: false,
      },
    },
  },
];

/**
 * Saved custom filters atom
 */
export const SavedFilters = atom<FilterPreset[]>([]);
