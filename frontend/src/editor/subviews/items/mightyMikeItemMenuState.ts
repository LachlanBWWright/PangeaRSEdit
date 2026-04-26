import type { ItemData } from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import { getItemTypes } from "@/data/items/getItemTypes";

export function getMightyMikeItemValues(globals: GlobalsInterface): number[] {
  const result = getItemTypes(globals);
  if (!result.isOk()) return [];
  return result.value
    .map((key) => Number.parseInt(key, 10))
    .filter((key) => !Number.isNaN(key));
}

export function getSelectedMightyMikeItem(
  itemData: ItemData,
  selectedItem: number | undefined,
) {
  if (selectedItem === undefined) {
    return null;
  }
  return itemData.Itms?.[1000]?.obj?.[selectedItem] ?? null;
}

export function updateSelectedMightyMikeItemType(
  itemData: ItemData,
  selectedItem: number | undefined,
  itemType: number,
): void {
  if (selectedItem === undefined) {
    return;
  }
  const item = itemData.Itms[1000]?.obj?.[selectedItem];
  if (item) {
    item.type = itemType;
  }
}

export function updateSelectedMightyMikeItemPosition(
  itemData: ItemData,
  selectedItem: number | undefined,
  axis: "x" | "z",
  value: number,
): void {
  if (selectedItem === undefined) {
    return;
  }
  const item = itemData.Itms[1000]?.obj?.[selectedItem];
  if (item) {
    item[axis] = value;
  }
}

export function updateSelectedMightyMikeItemParam(
  itemData: ItemData,
  selectedItem: number | undefined,
  paramKey: "p0" | "p1" | "p2" | "p3",
  value: number,
): void {
  if (selectedItem === undefined) {
    return;
  }
  const item = itemData.Itms[1000]?.obj?.[selectedItem];
  if (item) {
    item[paramKey] = value;
  }
}

export function deleteSelectedMightyMikeItem(
  itemData: ItemData,
  selectedItem: number | undefined,
): void {
  if (selectedItem === undefined) {
    return;
  }
  itemData.Itms[1000].obj.splice(selectedItem, 1);
}
