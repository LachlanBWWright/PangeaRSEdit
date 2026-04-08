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

import type { UniversalItemModelMapping } from "./itemModelTypes";
import { ItemType } from "./nanosaurItemType";

/**
 * Nanosaur item model mappings
 */
export const NANOSAUR_ITEM_MODEL_MAPPINGS: Record<
  number,
  UniversalItemModelMapping | undefined
> = {
  // Enemy skeletons
  [ItemType.Enemy_Tricer]: { modelFile: "Tricer.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Tricer.skeleton.rsrc" },
  [ItemType.Enemy_Rex]: { modelFile: "Rex.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Rex.skeleton.rsrc" },
  [ItemType.Enemy_Ptera]: { modelFile: "Ptera.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Ptera.skeleton.rsrc" },
  [ItemType.Enemy_Stego]: { modelFile: "Stego.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Stego.skeleton.rsrc" },
  [ItemType.Enemy_Spitter]: { modelFile: "Diloph.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Diloph.skeleton.rsrc" },

  // Global models (Global_Models.3dmf)
  [ItemType.PowerUp]: { modelFile: "Global_Models.3dmf", modelPath: "models", modelIndex: 0 },
  [ItemType.TimePortal]: { modelFile: "Global_Models.3dmf", modelPath: "models", modelIndex: 1 },

  // Level-specific models (Level1_Models.3dmf)
  [ItemType.Egg]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 0 },
  [ItemType.GasVent]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 1 },
  [ItemType.Tree]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 2 },
  [ItemType.Boulder]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 3 },
  [ItemType.Mushroom]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 4 },
  [ItemType.Bush]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 5 },
  [ItemType.Crystal]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 6 },
  [ItemType.StepStone]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 7 },
  [ItemType.RollingBoulder]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 8 },
  [ItemType.SporePod]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 9 },
};
