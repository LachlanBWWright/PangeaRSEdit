/**
 * Croma Rally Item Type to 3D Model Mapping
 *
 * Maps each item type to its corresponding BG3D model file and mesh information.
 * Extracted from Croma Rally source code:
 * - /games/cromagrally/Source/Headers/mobjtypes.h
 */

import { ItemType } from "./croMagItemType";

/**
 * Describes how to load and render a 3D model for a Croma Rally item type
 */
export interface CromagItemModelMapping {
  /** BG3D filename */
  modelFile: string;

  /** Subdirectory in /games/cromagrally/ */
  modelPath: "models" | "skeletons";

  /** Model index within the BG3D file (0-indexed, maps to Subgroup_N) */
  modelIndex: number;

  /** True if model requires skeleton data for rigging */
  requiresSkeleton?: boolean;

  /** Skeleton .rsrc filename if applicable */
  skeletonFile?: string;

  /** Scale multiplier for the model (default: 1.0) */
  scale?: number;

  /** Y-axis rotation offset in radians (default: 0) */
  rotationY?: number;
}

/**
 * Comprehensive mapping of all Croma Rally item types to their 3D models
 *
 * Reference: /games/cromagrally/Source/Headers/mobjtypes.h
 * Current coverage: 0+/100+ items
 */
export const CROMA_ITEM_MODEL_MAPPINGS: Record<
  number,
  CromagItemModelMapping | undefined
> = {
  // TODO: Extract enum structure from cromagrally/mobjtypes.h
  // TODO: Map all Croma Rally item types to their model indices
};

/**
 * Get the model mapping for a specific Croma Rally item type
 * @param itemType Item type ID
 * @returns Mapping if available, undefined otherwise
 */
export const getCromagItemModelMapping = (
  itemType: number,
): CromagItemModelMapping | undefined => {
  return CROMA_ITEM_MODEL_MAPPINGS[itemType];
};
