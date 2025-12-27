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
 */
export function extractSafeItemTypes(levelData: LevelData): SafeItemTypesResult {
  const itemTypes = new Set<number>();
  const splineItemTypes = new Set<number>();

  // Extract regular item types
  if (levelData.Itms?.[1000]?.obj) {
    const items = Object.values(levelData.Itms[1000].obj);
    items.forEach((item) => {
      if (item && typeof item.type === "number") {
        itemTypes.add(item.type);
      }
    });
  }

  // Extract spline item types
  if (levelData.Spln?.[1000]?.obj) {
    const splines = Object.values(levelData.Spln[1000].obj);
    splines.forEach((spline) => {
      // Check if spline has items
      if (spline?.items) {
        const splineItems = Object.values(spline.items);
        splineItems.forEach((splineItem) => {
          if (splineItem && typeof splineItem.type === "number") {
            splineItemTypes.add(splineItem.type);
          }
        });
      }
    });
  }

  return { itemTypes, splineItemTypes };
}
