import { FilterMode, type ItemFilterState } from "@/data/items/itemFilterAtoms";
import type { GlobalsInterface } from "@/data/globals/globals";
import {
  getFilterableItemKindLabel,
  getFilterableItemLabel,
  toFilterableItemKey,
  type FilterableItemKey,
  type FilterableItemKeyParts,
} from "@/data/items/itemFilterKeys";

export interface FilterableItemType extends FilterableItemKeyParts {
  readonly key: FilterableItemKey;
  readonly kindLabel: string;
  readonly label: string;
  readonly id: number;
  readonly name: string;
}

function toFilterableItemType(
  kind: FilterableItemKeyParts["kind"],
  id: number,
  name: string,
): FilterableItemType {
  const parts: FilterableItemKeyParts = { kind, type: id };
  return {
    ...parts,
    key: toFilterableItemKey(parts),
    kindLabel: getFilterableItemKindLabel(kind),
    label: getFilterableItemLabel(parts, name),
    id,
    name,
  };
}

export function toSortedItemTypes(
  globals: GlobalsInterface,
): FilterableItemType[] {
  const standardItems = Object.entries(globals.ITEM_TYPES).map(([id, name]) =>
    toFilterableItemType("item", Number(id), name),
  );
  const splineItems = Object.entries(globals.SPLINE_ITEM_TYPES ?? {}).map(
    ([id, name]) => toFilterableItemType("splineItem", Number(id), name),
  );

  return [...standardItems, ...splineItems].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return left.name.localeCompare(right.name);
  });
}

export function filterItemTypesBySearch(
  allItemTypes: readonly FilterableItemType[],
  search: string,
): FilterableItemType[] {
  if (!search.trim()) {
    return [...allItemTypes];
  }

  const query = search.toLowerCase();
  return allItemTypes.filter((itemType) => {
    return (
      itemType.name.toLowerCase().includes(query) ||
      itemType.kindLabel.toLowerCase().includes(query) ||
      String(itemType.id).includes(query)
    );
  });
}

export function isFilterTypeVisible(
  filter: ItemFilterState,
  itemType: FilterableItemKeyParts,
): boolean {
  if (filter.mode === FilterMode.SHOW_ALL) {
    return true;
  }

  const key = toFilterableItemKey(itemType);
  if (filter.mode === FilterMode.HIDE_SELECTED) {
    return !filter.itemTypes[key];
  }
  return Boolean(filter.itemTypes[key]);
}

function withoutFilterableItemKey(
  itemTypes: ItemFilterState["itemTypes"],
  keyToRemove: FilterableItemKey,
): ItemFilterState["itemTypes"] {
  return Object.fromEntries(
    Object.entries(itemTypes).filter(([key]) => key !== keyToRemove),
  );
}

export function toggleHiddenItemType(
  filter: ItemFilterState,
  itemType: FilterableItemKeyParts,
): ItemFilterState {
  const currentlyVisible = isFilterTypeVisible(filter, itemType);
  const key = toFilterableItemKey(itemType);

  if (currentlyVisible) {
    return {
      ...filter,
      mode: FilterMode.HIDE_SELECTED,
      itemTypes: { ...filter.itemTypes, [key]: true },
    };
  }

  const nextItemTypes = withoutFilterableItemKey(filter.itemTypes, key);
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
  const allHidden = Object.fromEntries(
    allItemTypes.map((itemType) => [itemType.key, true]),
  );

  return {
    ...filter,
    mode: FilterMode.HIDE_SELECTED,
    itemTypes: allHidden,
  };
}
