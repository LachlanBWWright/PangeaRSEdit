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
  // Scales and yOffset from src/Enemies/Enemy_*.c: scale set after MakeEnemySkeleton; coord.y = terrainY (FOOT_OFFSET=0 → yOffset=-25)
  // Tricer: TRICER_SCALE=2.2, FOOT_OFFSET=0 (src/Enemies/Enemy_TriCer.c)
  [ItemType.Enemy_Tricer]: { modelFile: "Tricer.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Tricer.skeleton.rsrc", scale: 2.2, yOffset: -25 },
  // Rex: REX_SCALE=1.2, FOOT_OFFSET=0 (src/Enemies/Enemy_Rex.c)
  [ItemType.Enemy_Rex]: { modelFile: "Rex.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Rex.skeleton.rsrc", scale: 1.2, yOffset: -25 },
  // Ptera: PTERA_SCALE=1.0, coord.y += FLIGHT_HEIGHT(100) — hovers 100 above terrain (src/Enemies/Enemy_Ptera.c)
  [ItemType.Enemy_Ptera]: { modelFile: "Ptera.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Ptera.skeleton.rsrc", scale: 1.0, yOffset: 75 },
  // Stego: STEGO_SCALE=1.4, FOOT_OFFSET=-72*1.4=-100.8 → coord.y -= FOOT_OFFSET raises origin 100.8 above terrain (src/Enemies/Enemy_Stego.c)
  [ItemType.Enemy_Stego]: { modelFile: "Stego.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Stego.skeleton.rsrc", scale: 1.4, yOffset: 76 },
  // Spitter: SPITTER_SCALE=0.8, FOOT_OFFSET=0 (src/Enemies/Enemy_Spitter.c)
  [ItemType.Enemy_Spitter]: { modelFile: "Diloph.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Diloph.skeleton.rsrc", scale: 0.8, yOffset: -25 },

  // Global models (Global_Models.3dmf = MODEL_GROUP_GLOBAL)
  // Indices from GLOBAL_MObjType_* enum in mobjtypes.h
  [ItemType.PowerUp]: { modelFile: "Global_Models.3dmf", modelPath: "models", modelIndex: 11 }, // GLOBAL_MObjType_HeatSeekPOW = 11
  [ItemType.TimePortal]: { modelFile: "Global_Models.3dmf", modelPath: "models", modelIndex: 10 }, // GLOBAL_MObjType_TimePortalRing = 10

  // Level-specific models (Level1_Models.3dmf = MODEL_GROUP_LEVEL0)
  // Indices from LEVEL0_MObjType_* enum in mobjtypes.h
  [ItemType.Egg]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 3 }, // LEVEL0_MObjType_Egg1 = 3
  [ItemType.GasVent]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 22 }, // LEVEL0_MObjType_GasVent = 22
  [ItemType.Tree]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 16 }, // LEVEL0_MObjType_Tree1 = 16
  [ItemType.Boulder]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 8 }, // LEVEL0_MObjType_Boulder = 8
  [ItemType.Mushroom]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 10 }, // LEVEL0_MObjType_Mushroom = 10
  [ItemType.Bush]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 11 }, // LEVEL0_MObjType_Bush = 11
  [ItemType.Crystal]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 12 }, // LEVEL0_MObjType_Crystal1 = 12
  [ItemType.StepStone]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 23 }, // LEVEL0_MObjType_StepStone = 23
  [ItemType.RollingBoulder]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 9 }, // LEVEL0_MObjType_Boulder2 = 9
  [ItemType.SporePod]: { modelFile: "Level1_Models.3dmf", modelPath: "models", modelIndex: 24 }, // LEVEL0_MObjType_Pod = 24
};
