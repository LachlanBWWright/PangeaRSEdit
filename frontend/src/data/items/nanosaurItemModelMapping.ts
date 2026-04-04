/**
 * Nanosaur Item Type to 3D Model Mapping
 *
 * Nanosaur 1 uses 3DMF model format which is supported by the worker (auto-detected by magic number).
 *
 * Model files available (3DMF format):
 * - /models/Level1_Models.3dmf
 * - /models/Global_Models.3dmf
 * - /skeletons/*.3dmf - Character skeletons
 */

import type { RotationParam } from "./standardParamTypes";

/**
 * Describes how to load and render a 3D model for a Nanosaur item type
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

  /** Which item param controls Y-axis rotation */
  rotationParam?: {
    paramIndex: 0 | 1 | 2 | 3;
    rotationType: RotationParam;
  };
}

/**
 * Nanosaur item model mappings
 */
export const NANOSAUR_ITEM_MODEL_MAPPINGS: Record<
  number,
  NanosaurItemModelMapping | undefined
> = {
  // Enemy skeletons
  2: { modelFile: "Tricer.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Tricer.skeleton.rsrc" }, // Triceratops enemy
  3: { modelFile: "Rex.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Rex.skeleton.rsrc" }, // Rex enemy
  7: { modelFile: "Ptera.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Ptera.skeleton.rsrc" }, // Pteranodon enemy
  8: { modelFile: "Stego.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Stego.skeleton.rsrc" }, // Stegosaurus enemy
  16: { modelFile: "Diloph.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Diloph.skeleton.rsrc" }, // Spitter enemy (Dilophosaurus)
  
  // Level models
  1: { modelFile: "Global_Models.3dmf", modelPath: "models", modelIndex: 0 }, // PowerUp
  5: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 0 }, // Egg
  6: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 1 }, // Gas vent
  9: { modelFile: "Global_Models.3dmf", modelPath: "models", modelIndex: 1 }, // Time portal
  10: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 2 }, // Tree
  11: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 3 }, // Boulder
  12: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 4 }, // Mushroom
  13: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 5 }, // Bush
  15: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 6 }, // Crystal
  17: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 7 }, // Step stone
  18: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 8 }, // Rolling boulder
  19: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 9 }, // Spore pod
};

/**
 * Get the model mapping for a specific Nanosaur item type
 * @param itemType Item type ID
 * @returns Mapping if available, undefined otherwise
 */
export const getNanosaurItemModelMapping = (
  itemType: number,
): NanosaurItemModelMapping | undefined => {
  return NANOSAUR_ITEM_MODEL_MAPPINGS[itemType];
};
