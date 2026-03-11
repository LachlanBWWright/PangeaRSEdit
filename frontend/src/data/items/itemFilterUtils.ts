/**
 * Item Filter Utility Functions
 * 
 * Functions for determining item visibility based on filter state.
 */

import { ItemFilterState, FilterMode } from "./itemFilterAtoms";
import { ItemCategory } from "./itemCategories";

/**
 * Get the item type name for display/search purposes.
 */
type GetItemTypeName = (itemType: number) => string | undefined;

/**
 * Check if an item should be visible based on current filter state.
 * 
 * In HIDE_SELECTED mode, items with `itemTypes[id] === true` are hidden.
 * In SHOW_SELECTED mode, only items with `itemTypes[id] === true` are shown.
 * In SHOW_ALL mode, all items are visible.
 */
export function isItemVisible(
  itemType: number,
  filter: ItemFilterState,
): boolean {
  if (filter.mode === FilterMode.SHOW_ALL) return true;

  const typeOverride = filter.itemTypes[itemType];
  if (typeOverride !== undefined) {
    return filter.mode === FilterMode.SHOW_SELECTED ? typeOverride : !typeOverride;
  }

  // No explicit override — in SHOW_SELECTED mode items default to hidden;
  // in HIDE_SELECTED mode they default to visible.
  return filter.mode !== FilterMode.SHOW_SELECTED;
}

/**
 * Check if an item matches the current search query for highlighting.
 */
export function itemMatchesSearch(
  itemType: number,
  filter: ItemFilterState,
  getTypeName: GetItemTypeName,
): boolean {
  if (!filter.searchQuery) return false;
  const typeName = getTypeName(itemType);
  if (!typeName) return false;
  return typeName.toLowerCase().includes(filter.searchQuery.toLowerCase());
}

/**
 * Get a list of visible item type IDs based on filter state.
 */
export function getVisibleItemTypes(
  allTypeIds: number[],
  filter: ItemFilterState,
): number[] {
  if (filter.mode === FilterMode.SHOW_ALL) return allTypeIds;
  return allTypeIds.filter((typeId) => isItemVisible(typeId, filter));
}

/**
 * Count items by category (kept for backwards compatibility).
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
    const name = getTypeName(item.type) ?? "";
    const category = categorizeItemSimple(name);
    counts[category]++;
  }
  return counts;
}

function categorizeItemSimple(name: string): ItemCategory {
  if (/enemy|alien|monster|boss|walker|attacker/i.test(name)) return ItemCategory.ENEMY;
  if (/powerup|pow_|health|ammo|weapon|pickup|bonus|token|coin|gem|clover|acorn/i.test(name)) return ItemCategory.POWERUP;
  if (/trigger|zone|checkpoint|gate|door|switch|teleport|portal|warp/i.test(name)) return ItemCategory.TRIGGER;
  if (/startcoords|exitrocket|exit|spawn|start|playerstart|camera/i.test(name)) return ItemCategory.PLAYER;
  if (/plant|tree|rock|bush|flower|grass|fence|barrel|crate|decoration|scenery|building|structure|prop|water|bridge|platform/i.test(name)) return ItemCategory.ENVIRONMENTAL;
  return ItemCategory.UNKNOWN;
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
