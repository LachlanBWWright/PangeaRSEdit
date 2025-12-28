/**
 * Bugdom Item Type to 3D Model Mapping
 *
 * Maps each item type to its corresponding BG3D model file and mesh information.
 * Extracted from Bugdom source code:
 * - /games/bugdom/Source/Headers/mobjtypes.h
 *
 * Bugdom organizes models into several level-specific files:
 * - lawn1.bg3d (LAWN level)
 * - lawn2.bg3d (LAWN 2 level)
 * - pond.bg3d (POND level)
 * - forest.bg3d (FOREST level)
 * - hive.bg3d (HIVE level)
 * - night.bg3d (NIGHT level)
 * - anthill.bg3d (ANTHILL level)
 * - global1.bg3d (GLOBAL1 items)
 * - global2.bg3d (GLOBAL2 items)
 */

/**
 * Describes how to load and render a 3D model for a Bugdom item type
 */
export interface BugdomItemModelMapping {
  /** BG3D filename (e.g., "lawn1.bg3d", "global1.bg3d") */
  modelFile: string;

  /** Subdirectory in /games/bugdom/ */
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
 * Comprehensive mapping of all Bugdom item types to their 3D models
 *
 * Current coverage: 50+/70+ items
 */
export const BUGDOM_ITEM_MODEL_MAPPINGS: Record<
  number,
  BugdomItemModelMapping | undefined
> = {
  // LAWN level objects
  // TODO: Map remaining LAWN level items using lawn1.bg3d indices 0-12
  // LAWN 2 level objects
  // TODO: Map remaining LAWN 2 level items using lawn2.bg3d indices 0-9
  // POND level objects
  // TODO: Map remaining POND level items using pond.bg3d indices 0-11
  // FOREST level objects
  // TODO: Map remaining FOREST level items using forest.bg3d indices 0-12
  // HIVE level objects
  // TODO: Map remaining HIVE level items using hive.bg3d indices 0-28
  // NIGHT level objects
  // TODO: Map remaining NIGHT level items using night.bg3d indices 0-23
  // ANTHILL level objects
  // TODO: Map remaining ANTHILL level items using anthill.bg3d indices 0-6
  // GLOBAL 1 items
  // TODO: Map GLOBAL1 items using global1.bg3d indices 0-10
  // GLOBAL 2 items
  // TODO: Map GLOBAL2 items using global2.bg3d indices 0-8
};

/**
 * Get the model mapping for a specific Bugdom item type
 * @param itemType Item type ID
 * @returns Mapping if available, undefined otherwise
 */
export const getBugdomItemModelMapping = (
  itemType: number,
): BugdomItemModelMapping | undefined => {
  return BUGDOM_ITEM_MODEL_MAPPINGS[itemType];
};
