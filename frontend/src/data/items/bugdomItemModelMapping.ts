/**
 * Bugdom Item Type to 3D Model Mapping
 *
 * Bugdom 1 uses 3DMF model format which is supported by the worker (auto-detected by magic number).
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

import type { RotationParam } from "./standardParamTypes";
import { ROTATION_4_WAY } from "./standardParamTypes";

/**
 * Describes how to load and render a 3D model for a Bugdom item type
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

  /** Which item param controls Y-axis rotation */
  rotationParam?: {
    paramIndex: 0 | 1 | 2 | 3;
    rotationType: RotationParam;
  };
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
  // Enemy skeletons
  1: { modelFile: "LadyBug.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "LadyBug.skeleton.rsrc" }, // LadyBug Bonus
  3: { modelFile: "BoxerFly.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "BoxerFly.skeleton.rsrc" }, // ENEMY: BOXERFLY
  8: { modelFile: "Slug.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Slug.skeleton.rsrc" }, // Slug enemy
  9: { modelFile: "Ant.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Ant.skeleton.rsrc" }, // Ant
  15: { modelFile: "WingedFireAnt.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "WingedFireAnt.skeleton.rsrc" }, // FireAnt
  16: { modelFile: "WaterBug.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "WaterBug.skeleton.rsrc" }, // WaterBug
  18: { modelFile: "DragonFly.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "DragonFly.skeleton.rsrc" }, // Dragonfly
  25: { modelFile: "PondFish.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "PondFish.skeleton.rsrc" }, // Pond Fish Enemy
  31: { modelFile: "Mosquito.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Mosquito.skeleton.rsrc" }, // Mosquito Enemy
  35: { modelFile: "Foot.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Foot.skeleton.rsrc" }, // Foot
  36: { modelFile: "Spider.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Spider.skeleton.rsrc" }, // ENEMY: SPIDER
  37: { modelFile: "Caterpillar.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Caterpillar.skeleton.rsrc" }, // ENEMY: CATERPILLER
  38: { modelFile: "FireFly.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "FireFly.skeleton.rsrc" }, // Firefly
  40: { modelFile: "RootSwing.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "RootSwing.skeleton.rsrc" }, // Root swing
  46: { modelFile: "Larva.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Larva.skeleton.rsrc" }, // ENEMY: LARVA
  47: { modelFile: "FlyingBee.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "FlyingBee.skeleton.rsrc" }, // ENEMY: FLYING BEE
  48: { modelFile: "WorkerBee.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "WorkerBee.skeleton.rsrc" }, // ENEMY: WORKER BEE
  49: { modelFile: "QueenBee.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "QueenBee.skeleton.rsrc" }, // ENEMY: QUEEN BEE
  53: { modelFile: "Roach.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Roach.skeleton.rsrc" }, // ENEMY: ROACH
  54: { modelFile: "Skippy.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Skippy.skeleton.rsrc" }, // ENEMY: SKIPPY (player character)
  59: { modelFile: "AntKing.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "AntKing.skeleton.rsrc" }, // ENEMY: KING ANT

  // Level models - note: these need model indices from actual file examination
  // For now, map to first model (index 0) as placeholder
  2: { modelFile: "Global_Models1.3dmf", modelPath: "models", modelIndex: 0 }, // Nut
  4: { modelFile: "Lawn_Models1.3dmf", modelPath: "models", modelIndex: 0 }, // Rock
  5: { modelFile: "Lawn_Models1.3dmf", modelPath: "models", modelIndex: 1 }, // Clover
  6: { modelFile: "Lawn_Models1.3dmf", modelPath: "models", modelIndex: 2 }, // Grass
  7: { modelFile: "Lawn_Models1.3dmf", modelPath: "models", modelIndex: 3 }, // Weed
  10: { modelFile: "Lawn_Models1.3dmf", modelPath: "models", modelIndex: 4 }, // Sunflower
  11: { modelFile: "Lawn_Models1.3dmf", modelPath: "models", modelIndex: 5 }, // Cosmo
  12: { modelFile: "Lawn_Models1.3dmf", modelPath: "models", modelIndex: 6 }, // Poppy
  17: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 0 }, // Tree (flight level)
  19: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 1 }, // Cat Tail
  20: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 2 }, // Duck Weed
  21: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 3 }, // Lily Flower
  22: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 4 }, // Lily Pad
  23: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 5 }, // Pond Grass
  24: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 6 }, // Reed
  26: { modelFile: "BeeHive_Models.3dmf", modelPath: "models", modelIndex: 0 }, // Honeycomb platform
  28: { modelFile: "Night_Models.3dmf", modelPath: "models", modelIndex: 0 }, // Firecracker
  32: { modelFile: "Global_Models1.3dmf", modelPath: "models", modelIndex: 1 }, // Checkpoint
  39: { modelFile: "Forest_Models.3dmf", modelPath: "models", modelIndex: 0, rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY } }, // Exit Log
  41: { modelFile: "Forest_Models.3dmf", modelPath: "models", modelIndex: 1 }, // Thorn Bush
  50: { modelFile: "Forest_Models.3dmf", modelPath: "models", modelIndex: 2 }, // Rock Ledge
  51: { modelFile: "Forest_Models.3dmf", modelPath: "models", modelIndex: 3 }, // Stump
  52: { modelFile: "Night_Models.3dmf", modelPath: "models", modelIndex: 1 }, // Rolling Boulder
  57: { modelFile: "AntHill_Models.3dmf", modelPath: "models", modelIndex: 0 }, // Bent Ant Pipe
  58: { modelFile: "AntHill_Models.3dmf", modelPath: "models", modelIndex: 1 }, // Horiz Ant Pipe
  61: { modelFile: "AntHill_Models.3dmf", modelPath: "models", modelIndex: 2 }, // Wooden Post
  62: { modelFile: "AntHill_Models.3dmf", modelPath: "models", modelIndex: 3 }, // Floor Spike
  63: { modelFile: "AntHill_Models.3dmf", modelPath: "models", modelIndex: 4 }, // King Water Pipe
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
