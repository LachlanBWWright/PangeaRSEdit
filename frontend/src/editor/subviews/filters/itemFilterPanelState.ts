import { FilterMode, type ItemFilterState } from "@/data/items/itemFilterAtoms";
import type { GlobalsInterface } from "@/data/globals/globals";

export interface FilterableItemType {
  readonly id: number;
  readonly name: string;
}

export function toSortedItemTypes(
  globals: GlobalsInterface,
): FilterableItemType[] {
  return Object.entries(globals.ITEM_TYPES)
    .map(([id, name]) => ({ id: Number(id), name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function filterItemTypesBySearch(
  allItemTypes: readonly FilterableItemType[],
  search: string,
): FilterableItemType[] {
  if (!search.trim()) {
    return [...allItemTypes];
  }

  const query = search.toLowerCase();
  return allItemTypes.filter((itemType) =>
    itemType.name.toLowerCase().includes(query),
  );
}

export function isFilterTypeVisible(
  filter: ItemFilterState,
  id: number,
): boolean {
  if (filter.mode === FilterMode.SHOW_ALL) {
    return true;
  }
  if (filter.mode === FilterMode.HIDE_SELECTED) {
    return !filter.itemTypes[id];
  }
  return Boolean(filter.itemTypes[id]);
}

export function toggleHiddenItemType(
  filter: ItemFilterState,
  id: number,
): ItemFilterState {
  const currentlyVisible = isFilterTypeVisible(filter, id);
  if (currentlyVisible) {
    return {
      ...filter,
      mode: FilterMode.HIDE_SELECTED,
      itemTypes: { ...filter.itemTypes, [id]: true },
    };
  }

  const nextItemTypes = Object.fromEntries(
    Object.entries(filter.itemTypes).filter(([key]) => Number(key) !== id),
  ) as Record<number, boolean | undefined>;
  const hasHidden = Object.values(nextItemTypes).some(Boolean);

  return {
    ...filter,
    mode: hasHidden ? FilterMode.HIDE_SELECTED : FilterMode.SHOW_ALL,
    itemTypes: nextItemTypes,
  };
}

export function createHideAllFilterState(
  filter: ItemFilterState,
  allItemTypes: readonly FilterableItemType[],
): ItemFilterState {
  const allHidden: Record<number, boolean | undefined> = {};
  for (const itemType of allItemTypes) {
    allHidden[itemType.id] = true;
  }

  return {
    ...filter,
    mode: FilterMode.HIDE_SELECTED,
    itemTypes: allHidden,
  };
}
