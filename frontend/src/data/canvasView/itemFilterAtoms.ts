import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/**
 * Item filter categories that group related item types together
 */
export enum ItemFilterCategory {
  ENEMIES = "enemies",
  POWERUPS = "powerups",
  SCENERY = "scenery",
  TRIGGERS = "triggers",
  START_END = "start_end",
  PLATFORMS = "platforms",
  HAZARDS = "hazards",
  CHECKPOINTS = "checkpoints",
  CUSTOM = "custom",
}

/**
 * Filter state for each category
 */
export interface ItemFilterState {
  [ItemFilterCategory.ENEMIES]: boolean;
  [ItemFilterCategory.POWERUPS]: boolean;
  [ItemFilterCategory.SCENERY]: boolean;
  [ItemFilterCategory.TRIGGERS]: boolean;
  [ItemFilterCategory.START_END]: boolean;
  [ItemFilterCategory.PLATFORMS]: boolean;
  [ItemFilterCategory.HAZARDS]: boolean;
  [ItemFilterCategory.CHECKPOINTS]: boolean;
  [ItemFilterCategory.CUSTOM]: boolean;
}

// Default: all categories visible
const defaultFilterState: ItemFilterState = {
  [ItemFilterCategory.ENEMIES]: true,
  [ItemFilterCategory.POWERUPS]: true,
  [ItemFilterCategory.SCENERY]: true,
  [ItemFilterCategory.TRIGGERS]: true,
  [ItemFilterCategory.START_END]: true,
  [ItemFilterCategory.PLATFORMS]: true,
  [ItemFilterCategory.HAZARDS]: true,
  [ItemFilterCategory.CHECKPOINTS]: true,
  [ItemFilterCategory.CUSTOM]: true,
};

/**
 * Persisted filter state - survives page reloads
 */
export const ItemFilterStateAtom = atomWithStorage<ItemFilterState>(
  "pangea-item-filters",
  defaultFilterState,
);

/**
 * Set of specific item types to hide (individual overrides)
 */
export const HiddenItemTypesAtom = atomWithStorage<number[]>(
  "pangea-hidden-item-types",
  [],
);

/**
 * Quick toggle: check if all items are shown
 */
export const ShowAllItemsAtom = atom(
  (get) => {
    const filters = get(ItemFilterStateAtom);
    return Object.values(filters).every((v) => v === true);
  },
  (_get, set) => {
    set(ItemFilterStateAtom, defaultFilterState);
  },
);

/**
 * Quick toggle: hide all items
 */
export const HideAllItemsAtom = atom(
  (get) => {
    const filters = get(ItemFilterStateAtom);
    return Object.values(filters).every((v) => v === false);
  },
  (_get, set) => {
    const allHidden: ItemFilterState = {
      [ItemFilterCategory.ENEMIES]: false,
      [ItemFilterCategory.POWERUPS]: false,
      [ItemFilterCategory.SCENERY]: false,
      [ItemFilterCategory.TRIGGERS]: false,
      [ItemFilterCategory.START_END]: false,
      [ItemFilterCategory.PLATFORMS]: false,
      [ItemFilterCategory.HAZARDS]: false,
      [ItemFilterCategory.CHECKPOINTS]: false,
      [ItemFilterCategory.CUSTOM]: false,
    };
    set(ItemFilterStateAtom, allHidden);
  },
);

/**
 * Category display labels
 */
export const CATEGORY_LABELS: Record<ItemFilterCategory, string> = {
  [ItemFilterCategory.ENEMIES]: "👾 Enemies",
  [ItemFilterCategory.POWERUPS]: "⭐ Powerups",
  [ItemFilterCategory.SCENERY]: "🌳 Scenery",
  [ItemFilterCategory.TRIGGERS]: "🚪 Triggers",
  [ItemFilterCategory.START_END]: "🏁 Start/End",
  [ItemFilterCategory.PLATFORMS]: "📦 Platforms",
  [ItemFilterCategory.HAZARDS]: "⚠️ Hazards",
  [ItemFilterCategory.CHECKPOINTS]: "🚩 Checkpoints",
  [ItemFilterCategory.CUSTOM]: "⚙️ Custom",
};
