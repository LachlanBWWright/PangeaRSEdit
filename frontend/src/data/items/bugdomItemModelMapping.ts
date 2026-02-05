/**
 * Bugdom Item Type to 3D Model Mapping
 *
 * NOTE: This file is NOT CURRENTLY USED because Bugdom 1 uses 3DMF model format,
 * not BG3D. The mappings here are placeholders for when a 3DMF parser is implemented.
 *
 * Model files available (3DMF format):
 * - /models/Lawn_Models1.3dmf, Lawn_Models2.3dmf
 * - /models/Pond_Models.3dmf
 * - /models/Forest_Models.3dmf
 * - /models/BeeHive_Models.3dmf
 * - /models/Night_Models.3dmf
 * - /models/AntHill_Models.3dmf
 * - /models/Global_Models1.3dmf, Global_Models2.3dmf
 * - /skeletons/*.3dmf - Character skeletons
 */

/**
 * Describes how to load and render a 3D model for a Bugdom item type
 * (Currently unused - 3DMF format not supported)
 */
export interface BugdomItemModelMapping {
  /** 3DMF filename (e.g., "Lawn_Models1.3dmf") */
  modelFile: string;

  /** Subdirectory in /games/bugdom1/ */
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
