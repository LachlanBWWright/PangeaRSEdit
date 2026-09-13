import { TerrainItemTypeParams } from "@/data/items/ottoItemType";
import { bugdomItemTypeParams } from "@/data/items/bugdomItemType";
import { bugdom2ItemTypeParams } from "@/data/items/bugdom2ItemType";
import { nanosaurItemTypeParams } from "@/data/items/nanosaurItemType";
import { nanosaur2ItemTypeParams } from "@/data/items/nanosaur2ItemType";
import { croMagItemTypeParams } from "@/data/items/croMagItemType";
import { billyFrontierItemTypeParams } from "@/data/items/billyFrontierItemType";
import type {
  FlagDescription,
  ParamDescription,
} from "@/data/items/itemParams";
import { getItemTypes } from "@/data/items/getItemTypes";
import { Game, type GlobalsInterface } from "@/data/globals/globals";
import type { ItemData } from "@/python/structSpecs/LevelTypes";

export function getAllItemValues(globals: GlobalsInterface): number[] {
  const result = getItemTypes(globals);
  return result.isOk()
    ? result.value
        .map((key) => Number.parseInt(key, 10))
        .filter((key) => !Number.isNaN(key))
    : [];
}

export function filterSafeItemValues(
  allItemValues: number[],
  filterToSafe: boolean,
  safeItemTypes: Set<number>,
): number[] {
  if (!filterToSafe || safeItemTypes.size === 0) {
    return allItemValues;
  }
  return allItemValues.filter((type) => safeItemTypes.has(type));
}

export function getSelectedItem(data: ItemData, index: number | undefined) {
  if (index === undefined) {
    return null;
  }
  return data.Itms?.[1000]?.obj?.[index] ?? null;
}

export function getSelectedItemParams(
  globals: GlobalsInterface,
  type: number | undefined,
) {
  if (type === undefined) {
    return undefined;
  }
  switch (globals.GAME_TYPE) {
    case Game.OTTO_MATIC:
      return TerrainItemTypeParams[type];
    case Game.BUGDOM:
      return bugdomItemTypeParams[type];
    case Game.BUGDOM_2:
      return bugdom2ItemTypeParams[type];
    case Game.NANOSAUR:
      return nanosaurItemTypeParams[type];
    case Game.NANOSAUR_2:
      return nanosaur2ItemTypeParams[type];
    case Game.CRO_MAG:
      return croMagItemTypeParams[type];
    case Game.BILLY_FRONTIER:
      return billyFrontierItemTypeParams[type];
    case Game.MIGHTY_MIKE:
      return undefined;
  }
}

export function updateSelectedItemType(
  data: ItemData,
  selectedItem: number | undefined,
  type: number,
): void {
  if (selectedItem === undefined) {
    return;
  }
  const item = data.Itms[1000]?.obj?.[selectedItem];
  if (item) {
    item.type = type;
  }
}

export function updateSelectedItemPosition(
  data: ItemData,
  selectedItem: number | undefined,
  axis: "x" | "z",
  value: number,
): void {
  if (selectedItem === undefined) {
    return;
  }
  const item = data.Itms[1000]?.obj?.[selectedItem];
  if (item) {
    item[axis] = value;
  }
}

export function updateSelectedItemParam(
  data: ItemData,
  selectedItem: number | undefined,
  paramKey: "p0" | "p1" | "p2" | "p3",
  value: number,
): void {
  if (selectedItem === undefined) {
    return;
  }
  const item = data.Itms[1000]?.obj?.[selectedItem];
  if (item) {
    item[paramKey] = value;
  }
}

export function updateSelectedItemBitFlag(
  data: ItemData,
  selectedItem: number | undefined,
  paramKey: "p0" | "p1" | "p2" | "p3",
  flag: FlagDescription,
  checked: boolean,
): void {
  if (selectedItem === undefined) {
    return;
  }
  const item = data.Itms[1000]?.obj?.[selectedItem];
  if (!item) {
    return;
  }
  const mask = 1 << flag.index;
  if (checked) {
    item[paramKey] |= mask;
  } else {
    item[paramKey] &= ~mask;
  }
}

export function deleteSelectedItem(
  data: ItemData,
  selectedItem: number | undefined,
): void {
  if (selectedItem === undefined) {
    return;
  }
  data.Itms[1000].obj.splice(selectedItem, 1);
}

export function getParamTooltip(param: ParamDescription): string {
  if (param === "Unknown" || param === "Unused") {
    return "";
  }
  if (typeof param === "string") {
    return param;
  }
  if (param.type === "Integer") {
    return `${param.description}\nExample: ${param.defaultCitation.code}`;
  }
  if (param.type === "TypeSelector") {
    return `${param.description}\n${Object.entries(param.options)
      .map(([value, label]) => `${value}: ${label}`)
      .join("\n")}`;
  }
  if (param.type === "Rotation") {
    return `${param.description}\nSteps: ${param.divisions}\nMultiplier: ${param.multiplier}`;
  }
  if (param.type === "Bit Flags" && Array.isArray(param.flags)) {
    return param.flags
      .map(
        (currentFlag) =>
          `${currentFlag.index}: ${currentFlag.description}` +
          (currentFlag.defaultCitation.code
            ? `\nExample: ${currentFlag.defaultCitation.code}`
            : ""),
      )
      .join("\n\n");
  }
  return "";
}
