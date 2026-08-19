/**
 * extractSafeItemTypes.ts
 * Utility to extract all item and spline item types present in a loaded level.
 * These represent "safe" types that won't crash the game.
 */

import type { LevelData } from "@/python/structSpecs/LevelTypes";
import { z } from "zod";

const typedItemSchema = z.object({
  type: z.number().int(),
});

const typedItemBucketSchema = z.object({
  obj: z.array(typedItemSchema),
});

export interface SafeItemTypesResult {
  itemTypes: Set<number>;
  splineItemTypes: Set<number>;
}

function addTypesFromBucket(target: Set<number>, bucket: unknown): void {
  const parsedBucket = typedItemBucketSchema.safeParse(bucket);
  if (!parsedBucket.success) {
    return;
  }

  for (const item of parsedBucket.data.obj) {
    target.add(item.type);
  }
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

  addTypesFromBucket(itemTypes, levelData.Itms?.[1000]);

  for (const splineBucket of Object.values(levelData.SpIt ?? {})) {
    addTypesFromBucket(splineItemTypes, splineBucket);
  }

  return { itemTypes, splineItemTypes };
}
