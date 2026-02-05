/**
 * Nanosaur Item Type to 3D Model Mapping
 *
 * NOTE: This file is NOT CURRENTLY USED because Nanosaur 1 uses 3DMF model format,
 * not BG3D. The mappings here are placeholders for when a 3DMF parser is implemented.
 *
 * Model files available (3DMF format):
 * - /models/Level1_Models.3dmf
 * - /models/Global_Models.3dmf
 * - /skeletons/*.3dmf - Character skeletons
 */

/**
 * Describes how to load and render a 3D model for a Nanosaur item type
 * (Currently unused - 3DMF format not supported)
 */
export interface NanosaurItemModelMapping {
  /** 3DMF filename (e.g., "Level1_Models.3dmf", "Global_Models.3dmf") */
  modelFile: string;

  /** Subdirectory in /games/nanosaur1/ */
  modelPath: "models" | "skeletons";

  /** Model index within the 3DMF file (0-indexed) */
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
 * Placeholder mapping - not used until 3DMF parser is implemented
 * 
 * Note: Nanosaur 1 has ~50+ items but all use 3DMF format which is not supported.
 */
export const NANOSAUR_ITEM_MODEL_MAPPINGS: Record<
  number,
  NanosaurItemModelMapping | undefined
> = {
  // Empty - 3DMF format not supported
};

/**
 * Get the model mapping for a specific Nanosaur item type
 * @param itemType Item type ID
 * @returns Mapping if available, undefined otherwise (always undefined for 3DMF games)
 */
export const getNanosaurItemModelMapping = (
  itemType: number,
): NanosaurItemModelMapping | undefined => {
  return NANOSAUR_ITEM_MODEL_MAPPINGS[itemType];
};
