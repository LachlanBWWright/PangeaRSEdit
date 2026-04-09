/**
 * Nanosaur 2 Item Model Mapper
 *
 * Maps Nanosaur 2 item types to their corresponding 3D models.
 *
 * Model files (from GAME_MODEL_REGISTRIES):
 * - global.bg3d  - Global items used across all levels (MODEL_GROUP_GLOBAL)
 * - forest.bg3d  - Level 1: Forest
 * - desert.bg3d  - Level 2: Desert
 * - swamp.bg3d   - Level 3: Swamp
 *
 * Model indices correspond to the LEVEL*_ObjType_* and GLOBAL_ObjType_* enums in mobjtypes.h.
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { ItemType } from "../nanosaur2ItemType";
import { ROTATION_8_WAY } from "../standardParamTypes";

/**
 * Level-specific model file names for Nanosaur 2
 */
export const NANOSAUR2_LEVEL_MODEL_FILES: Record<number, string> = {
  0: "forest.bg3d",  // Forest
  1: "desert.bg3d",  // Desert
  2: "swamp.bg3d",   // Swamp
};

/**
 * Base mappings for Nanosaur 2 items.
 * Model indices correspond exactly to the ObjType enum values in mobjtypes.h.
 */
const NANOSAUR2_BASE_MAPPINGS: Record<number, UniversalItemModelMapping> = {

  // ---- GLOBAL (global.bg3d) ----
  // GLOBAL_ObjType_RedEgg = 2, GreenEgg = 3, BlueEgg = 4, YellowEgg = 5, PurpleEgg = 6
  [ItemType.Egg]: {
    modelFile: "global.bg3d", modelPath: "models", modelIndex: 2,
    variants: { 0: { modelIndex: 2 }, 1: { modelIndex: 3 }, 2: { modelIndex: 4 }, 3: { modelIndex: 5 }, 4: { modelIndex: 6 } },
  },

  // GLOBAL_ObjType_EntryWormhole = 20
  [ItemType.EggWormhole]: { modelFile: "global.bg3d", modelPath: "models", modelIndex: 20 },

  // GLOBAL_ObjType_POWFrame = 9 (+ HealthPOWMembrane/FuelPOWMembrane/ShieldPOWMembrane/FreeLifePOWMembrane)
  [ItemType.WeaponPOW]: { modelFile: "global.bg3d", modelPath: "models", modelIndex: 9, groupSize: 2 },
  [ItemType.HealthPOW]: { modelFile: "global.bg3d", modelPath: "models", modelIndex: 9, groupSize: 3 }, // POWFrame + HealthPOWFrame + HealthPOWMembrane
  [ItemType.FuelPOW]: { modelFile: "global.bg3d", modelPath: "models", modelIndex: 9 }, // POWFrame + FuelPOWMembrane (index 12)
  [ItemType.ShieldPOW]: { modelFile: "global.bg3d", modelPath: "models", modelIndex: 9 }, // POWFrame + ShieldPOWMembrane (index 13)
  [ItemType.FreeLifePOW]: { modelFile: "global.bg3d", modelPath: "models", modelIndex: 9 }, // POWFrame + FreeLifePOWMembrane (index 14)

  // GLOBAL_ObjType_Electrode_Pole = 23, TopBottom = 24, Middle = 25
  [ItemType.Electrode]: { modelFile: "global.bg3d", modelPath: "models", modelIndex: 23, groupSize: 3 },

  // GLOBAL_ObjType_ForestDoor_Door = 26, KeyHolder = 27
  [ItemType.ForestDoor]: {
    modelFile: "global.bg3d", modelPath: "models", modelIndex: 26, groupSize: 2,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
  },

  // GLOBAL_ObjType_ForestDoor_Key = 28, Ring = 29
  [ItemType.ForestDoorKey]: {
    modelFile: "global.bg3d", modelPath: "models", modelIndex: 28, groupSize: 2,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
  },

  // GLOBAL_ObjType_LaserOrb = 30
  [ItemType.LaserOrb]: { modelFile: "global.bg3d", modelPath: "models", modelIndex: 30 },


  // ---- LEVEL 1: FOREST (forest.bg3d) ----
  // LEVEL1_ObjType_Tree_Birch_HighRed = 2 ... Tree_Birch_Flat = 8
  [ItemType.BirchTree]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 2,
    variants: { 0: { modelIndex: 2 }, 1: { modelIndex: 3 }, 2: { modelIndex: 4 }, 3: { modelIndex: 5 }, 4: { modelIndex: 6 }, 5: { modelIndex: 7 }, 6: { modelIndex: 8 } },
  },

  // LEVEL1_ObjType_Tree_Pine_HighDead = 9 ... Tree_Pine_Flat = 15
  [ItemType.PineTree]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 9,
    variants: { 0: { modelIndex: 9 }, 1: { modelIndex: 10 }, 2: { modelIndex: 11 }, 3: { modelIndex: 12 }, 4: { modelIndex: 13 }, 5: { modelIndex: 14 }, 6: { modelIndex: 15 } },
  },

  // LEVEL1_ObjType_SmallTree = 16
  [ItemType.SmallTree]: { modelFile: "forest.bg3d", modelPath: "models", modelIndex: 16 },

  // LEVEL1_ObjType_FallenTree = 17
  [ItemType.FallenTree]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 17,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
  },

  // LEVEL1_ObjType_TreeStump = 18
  [ItemType.TreeStump]: { modelFile: "forest.bg3d", modelPath: "models", modelIndex: 18 },

  // LEVEL1_ObjType_BentPine1_Trunk = 19, BentPine2_Trunk = 20, Leaves = 21, 22
  [ItemType.BentPineTree]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 19, groupSize: 2,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
  },

  // LEVEL1_ObjType_Grass = 23, GrassPatch = 24
  [ItemType.Grass]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 23,
    variants: { 0: { modelIndex: 23 }, 1: { modelIndex: 24 } },
  },

  // LEVEL1_ObjType_LowFern = 25, HighFern = 26
  [ItemType.Fern]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 25,
    variants: { 0: { modelIndex: 25 }, 1: { modelIndex: 26 } },
  },

  // LEVEL1_ObjType_LowBerryBush = 27, HighBerryBush = 28
  [ItemType.BerryBush]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 27,
    variants: { 0: { modelIndex: 27 }, 1: { modelIndex: 28 } },
  },

  // LEVEL1_ObjType_SmallCattail = 29, LargeCattail = 30
  [ItemType.CatTail]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 29,
    variants: { 0: { modelIndex: 29 }, 1: { modelIndex: 30 } },
  },

  // LEVEL1_ObjType_Rock1 = 31, Rock2 = 32, Rock3 = 33, Rock4 = 34, TallRock1 = 35, TallRock2 = 36
  [ItemType.Rock]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 31,
    variants: { 0: { modelIndex: 31 }, 1: { modelIndex: 32 }, 2: { modelIndex: 33 }, 3: { modelIndex: 34 }, 4: { modelIndex: 35 }, 5: { modelIndex: 36 } },
  },

  // LEVEL1_ObjType_RiverRock1 = 37, RiverRock2 = 38
  [ItemType.RiverRock]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 37,
    variants: { 0: { modelIndex: 37 }, 1: { modelIndex: 38 } },
  },

  // LEVEL1_ObjType_GasMound1 = 39, GasMound2 = 40, GasMound3 = 41
  [ItemType.GasMound]: {
    modelFile: "forest.bg3d", modelPath: "models", modelIndex: 39,
    variants: { 0: { modelIndex: 39 }, 1: { modelIndex: 40 }, 2: { modelIndex: 41 } },
  },

  // LEVEL1_ObjType_AirMine_Base = 43, Chain = 44, Mine = 45
  [ItemType.AirMine]: { modelFile: "forest.bg3d", modelPath: "models", modelIndex: 43, groupSize: 3 },

  // LEVEL1_ObjType_TowerTurret_Base = 46, Turret = 47, Wheel = 48, Gun = 49
  [ItemType.TowerTurret]: { modelFile: "forest.bg3d", modelPath: "models", modelIndex: 46, groupSize: 4 },


  // ---- LEVEL 2: DESERT (desert.bg3d) ----
  // LEVEL2_ObjType_DustDevilTop = 4
  [ItemType.DustDevil]: { modelFile: "desert.bg3d", modelPath: "models", modelIndex: 4 },

  // LEVEL2_ObjType_Tree1 = 5 ... Tree5 = 9; Canopies = 10-14
  [ItemType.DesertTree]: {
    modelFile: "desert.bg3d", modelPath: "models", modelIndex: 5,
    variants: { 0: { modelIndex: 5 }, 1: { modelIndex: 6 }, 2: { modelIndex: 7 }, 3: { modelIndex: 8 }, 4: { modelIndex: 9 } },
  },

  // LEVEL2_ObjType_BurntTree1 = 15, BurntTree2 = 16
  [ItemType.BurntDesertTree]: {
    modelFile: "desert.bg3d", modelPath: "models", modelIndex: 15,
    variants: { 0: { modelIndex: 15 }, 1: { modelIndex: 16 } },
  },

  // LEVEL2_ObjType_PalmTree1 = 17, PalmTree2 = 18, PalmTree3 = 19; Canopies = 20-22
  [ItemType.PalmTree]: {
    modelFile: "desert.bg3d", modelPath: "models", modelIndex: 17,
    variants: { 0: { modelIndex: 17 }, 1: { modelIndex: 18 }, 2: { modelIndex: 19 } },
  },

  // LEVEL2_ObjType_Bush1 = 23, Bush2 = 24, Bush3 = 25, BushBurnt = 26
  [ItemType.DesertBush]: {
    modelFile: "desert.bg3d", modelPath: "models", modelIndex: 23,
    variants: { 0: { modelIndex: 23 }, 1: { modelIndex: 24 }, 2: { modelIndex: 25 }, 3: { modelIndex: 26 } },
  },

  // LEVEL2_ObjType_PalmBush1 = 27, PalmBush2 = 28, PalmBush3 = 29
  [ItemType.PalmBush]: {
    modelFile: "desert.bg3d", modelPath: "models", modelIndex: 27,
    variants: { 0: { modelIndex: 27 }, 1: { modelIndex: 28 }, 2: { modelIndex: 29 } },
  },

  // LEVEL2_ObjType_Cactus_Low = 30, Cactus_Small = 31, Cactus_Medium = 32
  [ItemType.Cactus]: {
    modelFile: "desert.bg3d", modelPath: "models", modelIndex: 30,
    variants: { 0: { modelIndex: 30 }, 1: { modelIndex: 31 }, 2: { modelIndex: 32 } },
  },

  // LEVEL2_ObjType_Crystal1 = 33, Crystal2 = 34, Crystal3 = 35; Bases = 36-38
  [ItemType.Crystal]: {
    modelFile: "desert.bg3d", modelPath: "models", modelIndex: 33, groupSize: 2, // crystal + base
    variants: { 0: { modelIndex: 33 }, 1: { modelIndex: 34 }, 2: { modelIndex: 35 } },
  },


  // ---- LEVEL 3: SWAMP (swamp.bg3d) ----
  // LEVEL3_ObjType_HydraTree_Small = 2, Medium = 3, Large = 4
  [ItemType.HydraTree]: {
    modelFile: "swamp.bg3d", modelPath: "models", modelIndex: 2,
    variants: { 0: { modelIndex: 2 }, 1: { modelIndex: 3 }, 2: { modelIndex: 4 } },
  },

  // LEVEL3_ObjType_OddTree_Small = 5, Medium1 = 6, Medium2 = 7, Large = 8
  [ItemType.OddTree]: {
    modelFile: "swamp.bg3d", modelPath: "models", modelIndex: 5,
    variants: { 0: { modelIndex: 5 }, 1: { modelIndex: 6 }, 2: { modelIndex: 7 }, 3: { modelIndex: 8 } },
  },

  // LEVEL3_ObjType_GeckoPlant_Small = 9, Medium = 10, Large = 11
  [ItemType.GeckoPlant]: {
    modelFile: "swamp.bg3d", modelPath: "models", modelIndex: 9,
    variants: { 0: { modelIndex: 9 }, 1: { modelIndex: 10 }, 2: { modelIndex: 11 } },
  },

  // LEVEL3_ObjType_SproutPlant = 12
  [ItemType.SproutPlant]: { modelFile: "swamp.bg3d", modelPath: "models", modelIndex: 12 },

  // LEVEL3_ObjType_PurpleIvy_Small = 16, Medium = 17, Large = 18, PatchMedium = 19, PatchLarge = 20
  [ItemType.Ivy]: {
    modelFile: "swamp.bg3d", modelPath: "models", modelIndex: 16,
    variants: { 0: { modelIndex: 16 }, 1: { modelIndex: 17 }, 2: { modelIndex: 18 }, 3: { modelIndex: 19 }, 4: { modelIndex: 20 } },
  },

  // LEVEL3_ObjType_Asteroid1 = 27, Asteroid2 = 28
  [ItemType.Asteroid]: {
    modelFile: "swamp.bg3d", modelPath: "models", modelIndex: 27,
    variants: { 0: { modelIndex: 27 }, 1: { modelIndex: 28 } },
  },

  // LEVEL3_ObjType_FallenTree1 = 37, FallenTree2 = 38
  [ItemType.SwampFallenTree]: {
    modelFile: "swamp.bg3d", modelPath: "models", modelIndex: 37,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
    variants: { 0: { modelIndex: 37 }, 1: { modelIndex: 38 } },
  },

  // LEVEL3_ObjType_Stump1 = 39, Stump2 = 40, Stump3 = 41, Stump4 = 42
  [ItemType.SwampStump]: {
    modelFile: "swamp.bg3d", modelPath: "models", modelIndex: 39,
    variants: { 0: { modelIndex: 39 }, 1: { modelIndex: 40 }, 2: { modelIndex: 41 }, 3: { modelIndex: 42 } },
  },


  // ---- SKELETON ENEMIES ----
  [ItemType.Enemy_Raptor]: {
    modelFile: "raptor.bg3d", modelPath: "skeletons", modelIndex: 0,
    requiresSkeleton: true, skeletonFile: "raptor.skeleton.rsrc",
  },

  [ItemType.Enemy_Brach]: {
    modelFile: "brach.bg3d", modelPath: "skeletons", modelIndex: 0,
    requiresSkeleton: true, skeletonFile: "brach.skeleton.rsrc",
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
  },

  [ItemType.RamphorEnemy]: {
    modelFile: "ramphor.bg3d", modelPath: "skeletons", modelIndex: 0,
    requiresSkeleton: true, skeletonFile: "ramphor.skeleton.rsrc",
  },
};

/**
 * Nanosaur 2 Item Mapper Implementation
 */
export class Nanosaur2ItemMapper implements GameItemModelMapper {
  readonly game = Game.NANOSAUR_2;
  
  /**
   * Get model mapping for a Nanosaur 2 item type
   */
  getMapping(
    itemType: number,
    _levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const base = NANOSAUR2_BASE_MAPPINGS[itemType];
    if (!base) return undefined;

    // Handle variants based on p0
    if (base.variants && params) {
      const variant = base.variants[params.p0];
      if (variant) {
        return {
          ...base,
          modelFile: variant.modelFile ?? base.modelFile,
          modelIndex: variant.modelIndex,
        };
      }
    }

    // For level-specific models, we could adjust the modelFile based on _levelNum
    // For now, use the base mapping directly
    return base;
  }

  /**
   * Get all mapped item types
   */
  getMappedTypes(): number[] {
    return Object.keys(NANOSAUR2_BASE_MAPPINGS)
      .map(Number)
      .filter((k) => !isNaN(k));
  }

  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean {
    return NANOSAUR2_BASE_MAPPINGS[itemType] !== undefined;
  }

  /**
   * Get total number of mapped items
   */
  getMappingCount(): number {
    return this.getMappedTypes().length;
  }
}

/**
 * Singleton instance
 */
export const nanosaur2ItemMapper = new Nanosaur2ItemMapper();
