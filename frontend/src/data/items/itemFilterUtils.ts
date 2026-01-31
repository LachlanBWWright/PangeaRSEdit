/**
 * Item Filter Utility Functions
 * 
 * Functions for determining item visibility based on filter state.
 */

import { ItemFilterState, FilterMode } from "./itemFilterAtoms";
import { ItemCategory, categorizeItem } from "./itemCategories";

/**
 * Get the item type name for display/search purposes.
 * This should be provided by the game's item type mapping.
 */
type GetItemTypeName = (itemType: number) => string | undefined;

/**
 * Check if an item should be visible based on current filter state.
 * 
 * @param itemType - The numeric item type ID
 * @param filter - Current filter state
 * @param getTypeName - Function to get the display name for an item type
 * @returns true if the item should be visible
 */
export function isItemVisible(
  itemType: number,
  filter: ItemFilterState,
  getTypeName: GetItemTypeName,
): boolean {
  // Show all mode bypasses filtering
  if (filter.mode === FilterMode.SHOW_ALL) {
    return true;
  }

  // Check for specific item type override first
  const typeOverride = filter.itemTypes[itemType];
  if (typeOverride !== undefined) {
    return filter.mode === FilterMode.SHOW_SELECTED
      ? typeOverride
      : !typeOverride;
  }

  // Fall back to category-based filtering
  const typeName = getTypeName(itemType);
  if (!typeName) {
    // Unknown type - use the UNKNOWN category setting
    const categoryEnabled = filter.categories[ItemCategory.UNKNOWN];
    return filter.mode === FilterMode.SHOW_SELECTED
      ? categoryEnabled
      : !categoryEnabled;
  }

  const category = categorizeItem(typeName);
  const categoryEnabled = filter.categories[category];

  return filter.mode === FilterMode.SHOW_SELECTED
    ? categoryEnabled
    : !categoryEnabled;
}

/**
 * Check if an item matches the current search query for highlighting.
 * 
 * @param itemType - The numeric item type ID
 * @param filter - Current filter state
 * @param getTypeName - Function to get the display name for an item type
 * @returns true if the item matches the search query, false if no match or no active search
 */
export function itemMatchesSearch(
  itemType: number,
  filter: ItemFilterState,
  getTypeName: GetItemTypeName,
): boolean {
  if (!filter.searchQuery) {
    return false; // No active search - no items should be highlighted
  }

  const typeName = getTypeName(itemType);
  if (!typeName) {
    return false;
  }

  const lowerQuery = filter.searchQuery.toLowerCase();
  return typeName.toLowerCase().includes(lowerQuery);
}

/**
 * Get a list of visible item type IDs based on filter state.
 * 
 * @param allTypeIds - Array of all item type IDs in the level
 * @param filter - Current filter state
 * @param getTypeName - Function to get the display name for an item type
 * @returns Array of item type IDs that should be visible
 */
export function getVisibleItemTypes(
  allTypeIds: number[],
  filter: ItemFilterState,
  getTypeName: GetItemTypeName,
): number[] {
  if (filter.mode === FilterMode.SHOW_ALL) {
    return allTypeIds;
  }

  return allTypeIds.filter((typeId) =>
    isItemVisible(typeId, filter, getTypeName)
  );
}

/**
 * Count items by category.
 * 
 * @param items - Array of items with a type property
 * @param getTypeName - Function to get the display name for an item type
 * @returns Record of category to count
 */
export function countItemsByCategory(
  items: { type: number }[],
  getTypeName: GetItemTypeName,
): Record<ItemCategory, number> {
  const counts: Record<ItemCategory, number> = {
    [ItemCategory.ENEMY]: 0,
    [ItemCategory.POWERUP]: 0,
    [ItemCategory.ENVIRONMENTAL]: 0,
    [ItemCategory.TRIGGER]: 0,
    [ItemCategory.PLAYER]: 0,
    [ItemCategory.UNKNOWN]: 0,
  };

  for (const item of items) {
    const typeName = getTypeName(item.type);
    const category = typeName
      ? categorizeItem(typeName)
      : ItemCategory.UNKNOWN;
    counts[category]++;
  }

  return counts;
}

/**
 * Reset filter to default state (show all).
 */
export function createDefaultFilter(): ItemFilterState {
  return {
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
}

/**
 * Apply a preset to the current filter state.
 * Merges preset values with current state.
 */
export function applyFilterPreset(
  currentFilter: ItemFilterState,
  presetState: Partial<ItemFilterState>,
): ItemFilterState {
  return {
    ...currentFilter,
    ...presetState,
    categories: {
      ...currentFilter.categories,
      ...(presetState.categories ?? {}),
    },
    itemTypes: {
      ...currentFilter.itemTypes,
      ...(presetState.itemTypes ?? {}),
    },
  };
}
