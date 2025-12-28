/**
 * Nanosaur 2 Item Type to 3D Model Mapping
 *
 * Maps each item type to its corresponding BG3D model file and mesh information.
 * Extracted from Nanosaur 2 source code:
 * - /games/nanosaur2/Source/Headers/mobjtypes.h
 */

/**
 * Describes how to load and render a 3D model for a Nanosaur 2 item type
 */
export interface Nanosaur2ItemModelMapping {
  /** BG3D filename */
  modelFile: string;

  /** Subdirectory in /games/nanosaur2/ */
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
 * Comprehensive mapping of all Nanosaur 2 item types to their 3D models
 *
 * Reference: /games/nanosaur2/Source/Headers/mobjtypes.h
 * Current coverage: 0+/100+ items
 */
export const NANOSAUR2_ITEM_MODEL_MAPPINGS: Record<
  number,
  Nanosaur2ItemModelMapping | undefined
> = {
  // TODO: Extract enum structure from nanosaur2/mobjtypes.h
  // TODO: Map all Nanosaur 2 item types to their model indices
};

/**
 * Get the model mapping for a specific Nanosaur 2 item type
 * @param itemType Item type ID
 * @returns Mapping if available, undefined otherwise
 */
export const getNanosaur2ItemModelMapping = (
  itemType: number,
): Nanosaur2ItemModelMapping | undefined => {
  return NANOSAUR2_ITEM_MODEL_MAPPINGS[itemType];
};
