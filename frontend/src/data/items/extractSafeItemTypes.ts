/**
 * extractSafeItemTypes.ts
 * Utility to extract all item and spline item types present in a loaded level.
 * These represent "safe" types that won't crash the game.
 */

import { LevelData } from "@/python/structSpecs/LevelTypes";

export interface SafeItemTypesResult {
  itemTypes: Set<number>;
  splineItemTypes: Set<number>;
}

/**
 * Extracts all unique item type values from the level data.
 * These are considered "safe" because they were present in the original level.
 * Accepts either full LevelData or a partial object with just Itms and Spln.
 */
export function extractSafeItemTypes(levelData: Partial<Pick<LevelData, 'Itms' | 'Spln'>>): SafeItemTypesResult {
  const itemTypes = new Set<number>();
  const splineItemTypes = new Set<number>();

  // Extract regular item types
  if (levelData.Itms?.[1000]?.obj) {
    const itemsObj = levelData.Itms[1000].obj;
    if (Array.isArray(itemsObj)) {
      itemsObj.forEach((item) => {
        if (item && typeof item.type === "number") {
          itemTypes.add(item.type);
        }
      });
    }
  }

  // Extract spline item types from SpIt field (if available)
  // Note: SpIt is part of SplineData but we're working with partial data
  // For now, we'll check if the levelData has SpIt at the same level
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const levelDataAny = levelData as any;
  if (levelDataAny.SpIt?.[1000]?.obj) {
    const splineItemsObj = levelDataAny.SpIt[1000].obj;
    if (Array.isArray(splineItemsObj)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      splineItemsObj.forEach((splineItem: any) => {
        if (splineItem && typeof splineItem.type === "number") {
          splineItemTypes.add(splineItem.type);
        }
      });
    }
  }

  return { itemTypes, splineItemTypes };
}
