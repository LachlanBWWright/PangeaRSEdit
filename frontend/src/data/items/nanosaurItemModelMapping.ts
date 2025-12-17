/**
 * Nanosaur Item Type to 3D Model Mapping
 *
 * Maps each item type to its corresponding BG3D model file and mesh information.
 * Extracted from Nanosaur source code:
 * - /games/nanosaur/src/Headers/mobjtypes.h
 *
 * Nanosaur organizes models into two primary groups:
 * - MODEL_GROUP_LEVEL0 (index 0): level0.bg3d for level-specific objects
 * - MODEL_GROUP_GLOBAL (index 2): global.bg3d for universal items
 */

import { ItemType } from "./nanosaurItemType";

/**
 * Describes how to load and render a 3D model for a Nanosaur item type
 */
export interface NanosaurItemModelMapping {
  /** BG3D filename (e.g., "level0.bg3d", "global.bg3d") */
  modelFile: string;

  /** Subdirectory in /games/nanosaur/ */
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
 * Comprehensive mapping of all Nanosaur item types to their 3D models
 *
 * Enum structure from mobjtypes.h:
 * - LEVEL0_MObjType (0-28): Level 0 objects in level0.bg3d
 * - GLOBAL_MObjType (0-19): Global items in global.bg3d
 *
 * Current coverage: 0+/50+ items
 */
export const NANOSAUR_ITEM_MODEL_MAPPINGS: Record<
  number,
  NanosaurItemModelMapping | undefined
> = {
  // LEVEL 0 objects (level0.bg3d, indices 0-28)
  // LEVEL0_MObjType enum includes:
  // 0: BonusBox
  // 1: LavaPatch
  // 2: WaterPatch
  // 3-7: Various Eggs
  // 8-9: Boulders
  // 10: Mushroom
  // 11: Bush
  // 12-14: Crystals
  // 15: Nest
  // 16-21: Trees
  // 22: GasVent
  // 23: StepStone
  // 24: Pod
  // 25: Spore
  // 26: Fireball
  // TODO: Map LEVEL0 items using level0.bg3d

  // GLOBAL items (global.bg3d, indices 0-19)
  // GLOBAL_MObjType enum includes:
  // 0: JetFlame
  // 1: Shadow
  // 2: Dust
  // 3: Smoke
  // 4: DinoSpit
  // 5: SonicScream
  // 6: Blaster
  // 7: HeatSeek
  // 8: HeatSeekEcho
  // 9: Explosion
  // 10: TimePortalRing
  // 11: HeatSeekPOW
  // 12: LaserPOW
  // 13: TriBlast
  // 14: TriBlastPOW
  // 15: HealthPOW
  // 16: ShieldPOW
  // 17: NukePOW
  // 18: Sonic
  // 19: Shield
  // 20: Nuke
  // TODO: Map GLOBAL items using global.bg3d
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
