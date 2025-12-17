/**
 * Billy Frontier Item Type to 3D Model Mapping
 *
 * Maps each item type to its corresponding BG3D model file and mesh information.
 * Extracted from Billy Frontier source code:
 * - /games/billyfrontier/Source/Headers/mobjtypes.h
 */

import { ItemType } from "./billyFrontierItemType";

/**
 * Describes how to load and render a 3D model for a Billy Frontier item type
 */
export interface BillyFrontierItemModelMapping {
  /** BG3D filename */
  modelFile: string;

  /** Subdirectory in /games/billyfrontier/ */
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
 * Comprehensive mapping of all Billy Frontier item types to their 3D models
 *
 * Reference: /games/billyfrontier/Source/Headers/mobjtypes.h
 * Current coverage: 0+/100+ items
 */
export const BILLY_FRONTIER_ITEM_MODEL_MAPPINGS: Record<
  number,
  BillyFrontierItemModelMapping | undefined
> = {
  // TODO: Extract enum structure from billyfrontier/mobjtypes.h
  // TODO: Map all Billy Frontier item types to their model indices
};

/**
 * Get the model mapping for a specific Billy Frontier item type
 * @param itemType Item type ID
 * @returns Mapping if available, undefined otherwise
 */
export const getBillyFrontierItemModelMapping = (
  itemType: number,
): BillyFrontierItemModelMapping | undefined => {
  return BILLY_FRONTIER_ITEM_MODEL_MAPPINGS[itemType];
};
