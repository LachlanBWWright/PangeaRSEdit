/**
 * extractSafeItemTypes.ts
 * Utility to extract all item and spline item types present in a loaded level.
 * These represent "safe" types that won't crash the game.
 */

import { LevelData } from "@/python/structSpecs/LevelTypes";

function hasNumericType(value: unknown): value is { type: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "number"
  );
}

function addItemTypeFromEntry(itemTypes: Set<number>, item: unknown): void {
  if (!hasNumericType(item)) return;
  itemTypes.add(item.type);
}

function addSplineItemTypeFromEntry(
  splineItemTypes: Set<number>,
  splineItem: unknown,
): void {
  if (!hasNumericType(splineItem)) return;
  splineItemTypes.add(splineItem.type);
}

export interface SafeItemTypesResult {
  itemTypes: Set<number>;
  splineItemTypes: Set<number>;
}

/**
 * Extracts all unique item type values from the level data.
 * These are considered "safe" because they were present in the original level.
 * Accepts either full LevelData or a partial object with just Itms and Spln.
 */
export function extractSafeItemTypes(
  levelData: Partial<Pick<LevelData, "Itms" | "Spln" | "SpIt">>,
): SafeItemTypesResult {
  const itemTypes = new Set<number>();
  const splineItemTypes = new Set<number>();

  const itemsObj = levelData.Itms?.[1000]?.obj;
  if (Array.isArray(itemsObj)) {
    itemsObj.forEach((item) => addItemTypeFromEntry(itemTypes, item));
  }

  const splineItems = levelData.SpIt?.[1000]?.obj;
  if (Array.isArray(splineItems)) {
    splineItems.forEach((item) =>
      addSplineItemTypeFromEntry(splineItemTypes, item),
    );
  }

  return { itemTypes, splineItemTypes };
}
