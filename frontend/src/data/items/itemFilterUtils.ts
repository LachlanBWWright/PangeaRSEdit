import { ItemFilterState, FilterMode } from "./itemFilterAtoms";
import { categorizeItem } from "./itemCategories";
import { TerrainItem } from "../../python/structSpecs/LevelTypes";
import { Game } from "../globals/globals";

/**
 * Check if an item should be visible based on current filter state
 */
export function isItemVisible(
  item: TerrainItem,
  filter: ItemFilterState,
  game: Game,
): boolean {
  if (filter.mode === FilterMode.SHOW_ALL) {
    return true;
  }

  // Check for specific item type override
  const typeOverride = filter.itemTypes[item.type];
  if (typeOverride !== undefined) {
    return filter.mode === FilterMode.SHOW_SELECTED
      ? typeOverride
      : !typeOverride;
  }

  // Fall back to category
  const category = categorizeItem(game, item.type);
  const categoryVisible = filter.categories[category];

  return filter.mode === FilterMode.SHOW_SELECTED
    ? categoryVisible
    : !categoryVisible;
}

/**
 * Filter items array based on current filter state
 */
export function filterItems<T extends TerrainItem>(
  items: T[],
  filter: ItemFilterState,
  game: Game,
): T[] {
  if (filter.mode === FilterMode.SHOW_ALL) {
    return items;
  }
  return items.filter(item => isItemVisible(item, filter, game));
}

/**
 * Check if an item is highlighted by search
 */
export function isItemHighlighted(
  item: TerrainItem,
  filter: ItemFilterState,
): boolean {
  return filter.highlightedTypes.includes(item.type);
}

/**
 * Get items matching search query
 */
export function searchItems<T extends TerrainItem>(
  items: T[],
  query: string,
  itemTypeNames: Record<number, string>,
): T[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  return items.filter(item => {
    const typeName = itemTypeNames[item.type] ?? `Type ${item.type}`;
    return typeName.toLowerCase().includes(lowerQuery);
  });
}
