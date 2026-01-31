/**
 * Item Filter Exports
 * 
 * Convenient re-exports for item filtering functionality.
 */

// Categories
export {
  ItemCategory,
  categorizeItem,
  getCategoryDisplayName,
  getCategoryColor,
  getAllCategories,
} from "./itemCategories";

// Filter state atoms
export {
  FilterMode,
  itemFilterStateAtom,
  savedFiltersAtom,
  isFilterActiveAtom,
  FILTER_PRESETS,
  DEFAULT_FILTER_STATE,
  type ItemFilterState,
  type FilterPreset,
} from "./itemFilterAtoms";

// Filter utilities
export {
  isItemVisible,
  itemMatchesSearch,
  getVisibleItemTypes,
  countItemsByCategory,
  createDefaultFilter,
  applyFilterPreset,
} from "./itemFilterUtils";
