/**
 * Billy Frontier Item Model Mapper
 *
 * Maps Billy Frontier item types to their corresponding 3D models.
 *
 * Model files (from GAME_MODEL_REGISTRIES):
 * - global.bg3d   - Global items (MODEL_GROUP_GLOBAL)
 * - town.bg3d     - Town level-specific items (MODEL_GROUP_LEVELSPECIFIC)
 * - swamp.bg3d    - Swamp level-specific items (MODEL_GROUP_LEVELSPECIFIC)
 * - buildings.bg3d - Building models (MODEL_GROUP_BUILDINGS)
 *
 * Model indices correspond to GLOBAL_ObjType_*, TOWN_ObjType_*, SWAMP_ObjType_*,
 * and BUILDING_ObjType_* enum values in mobjtypes.h.
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { ItemType } from "../billyFrontierItemType";
import { ROTATION_4_WAY, ROTATION_8_WAY } from "../standardParamTypes";

/**
 * Scene-specific model files for Billy Frontier
 */
export const BILLY_SCENE_MODEL_FILES: Record<string, string> = {
  town: "town.bg3d",
  swamp: "swamp.bg3d",
  buildings: "buildings.bg3d",
  global: "global.bg3d",
};

/**
 * Base mappings for Billy Frontier items.
 * Model indices correspond exactly to the ObjType enum values in mobjtypes.h.
 */
const BILLY_BASE_MAPPINGS: Record<number, UniversalItemModelMapping> = {
  // ---- GLOBAL (global.bg3d) ----
  // GLOBAL_ObjType_Barrel = 10, BarrelTNT = 11, FrogBarrel = 12
  [ItemType.Barrel]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 10,
    variants: {
      0: { modelIndex: 10 },
      1: { modelIndex: 11 },
      2: { modelIndex: 12 },
    },
  },

  // GLOBAL_ObjType_Crate = 13, CrateStack = 14, MetalCrate = 15, MetalCrateStack = 16
  [ItemType.WoodCrate]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 13,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
    variants: {
      0: { modelIndex: 13 },
      1: { modelIndex: 14 },
      2: { modelIndex: 15 },
      3: { modelIndex: 16 },
    },
  },

  // GLOBAL_ObjType_HayBale = 17, HayBaleStack = 18
  [ItemType.HayBale]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 17,
    variants: { 0: { modelIndex: 17 }, 1: { modelIndex: 18 } },
  },

  // GLOBAL_ObjType_Tumbleweed = 29
  [ItemType.Tumbleweed]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 29,
  },

  // GLOBAL_ObjType_AmmoBoxPOW = 30
  [ItemType.Boost]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 30,
  },

  // GLOBAL_ObjType_PesoPOW = 31
  [ItemType.Peso]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 31,
  },

  // GLOBAL_ObjType_FreeLifePOW = 32
  [ItemType.FreeLifePOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 32,
  },

  // GLOBAL_ObjType_WoodPost = 34
  [ItemType.Post]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 34,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
  },

  // ---- TOWN (town.bg3d) ----
  // TOWN_ObjType_Headstone1 = 1, Headstone2 = 2, ..., Headstone5 = 5
  [ItemType.HeadStone]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 1,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
    variants: {
      0: { modelIndex: 1 },
      1: { modelIndex: 2 },
      2: { modelIndex: 3 },
      3: { modelIndex: 4 },
      4: { modelIndex: 5 },
    },
  },

  // TOWN_ObjType_Cactus = 6 (+ DeadTree = 7, DeadTreeOnSide = 8 when in town; SWAMP_ObjType_MushroomTree = 7 when in swamp)
  [ItemType.Plant]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 6,
    variants: {
      0: { modelIndex: 6 },
      1: { modelIndex: 7 },
      2: { modelIndex: 8 },
    },
  },

  // TOWN_ObjType_RockWall = 9
  [ItemType.DuelRockWall]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 9,
  },

  // TOWN_ObjType_Coffin = 10, CoffinStack = 11
  [ItemType.Coffin]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 10,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
    variants: { 0: { modelIndex: 10 }, 1: { modelIndex: 11 } },
  },

  // TOWN_ObjType_TallRock1 = 12, TallRock2 = 13, ShortRock1 = 14, ShortRock2 = 15
  [ItemType.Rock]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 12,
    variants: {
      0: { modelIndex: 12 },
      1: { modelIndex: 13 },
      2: { modelIndex: 14 },
      3: { modelIndex: 15 },
    },
  },

  // TOWN_ObjType_Alley = 16
  [ItemType.ShootoutAlley]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 16,
  },

  // TOWN_ObjType_Table = 17
  [ItemType.Table]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 17,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
  },

  // TOWN_ObjType_Chair = 18
  [ItemType.Chair]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 18,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
  },

  // TOWN_ObjType_DeadTree = 7, DeadTreeOnSide = 8
  [ItemType.DeadTree]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 7,
    variants: { 0: { modelIndex: 7 }, 1: { modelIndex: 8 } },
  },

  // ---- BUILDINGS (buildings.bg3d) ----
  // BUILDING_ObjType_Saloon = 0 ... Cantina = 7; burning variants = 8-15; SaloonInside = 16
  [ItemType.Building]: {
    modelFile: "buildings.bg3d",
    modelPath: "models",
    modelIndex: 0,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_4_WAY },
    variants: {
      0: { modelIndex: 0 },
      1: { modelIndex: 1 },
      2: { modelIndex: 2 },
      3: { modelIndex: 3 },
      4: { modelIndex: 4 },
      5: { modelIndex: 5 },
      6: { modelIndex: 6 },
      7: { modelIndex: 7 },
    },
  },

  // BUILDING_ObjType_SaloonInside = 16
  [ItemType.ShootoutSaloon]: {
    modelFile: "buildings.bg3d",
    modelPath: "models",
    modelIndex: 16,
  },

  // ---- SWAMP (swamp.bg3d) ----
  // SWAMP_ObjType_Cabin = 1
  [ItemType.SwampCabin]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 1,
  },

  // SWAMP_ObjType_Grave = 11
  [ItemType.TremorGrave]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 11,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
  },

  // SWAMP_ObjType_TeePee = 12
  [ItemType.TeePee]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 12,
  },

  // SWAMP_ObjType_SpearSkull = 13
  [ItemType.SpearSkull]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 13,
  },

  // SWAMP_ObjType_ElectricFence = 14
  [ItemType.ElectricFence]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 14,
  },

  // ---- SKELETONS ----
  [ItemType.Dueler]: {
    modelFile: "dueler.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "dueler.skeleton.rsrc",
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
  },

  [ItemType.FrogMan_Shootout]: {
    modelFile: "FrogMan.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "frogman.skeleton.rsrc",
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
  },

  [ItemType.Bandito_Shootout]: {
    modelFile: "Bandito.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "bandito.skeleton.rsrc",
    rotationParam: { paramIndex: 2, rotationType: ROTATION_8_WAY },
  },

  [ItemType.Shorty_Shootout]: {
    modelFile: "Shorty.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "shorty.skeleton.rsrc",
    rotationParam: { paramIndex: 2, rotationType: ROTATION_8_WAY },
  },

  [ItemType.SceneryKangaCow]: {
    modelFile: "KangaCow.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "kangacow.skeleton.rsrc",
  },

  [ItemType.StampedeKanga]: {
    modelFile: "stampedekanga.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "stampedekanga.skeleton.rsrc",
  },

  [ItemType.StampedeKangarex]: {
    modelFile: "KangaRex.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "kangarex.skeleton.rsrc",
  },

  [ItemType.Wallker]: {
    modelFile: "Walker.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "walker.skeleton.rsrc",
  },

  [ItemType.TremorAlien_Shootout]: {
    modelFile: "TremorAlien.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "tremoralien.skeleton.rsrc",
    rotationParam: { paramIndex: 2, rotationType: ROTATION_8_WAY },
  },
};

/**
 * Billy Frontier Item Mapper Implementation
 */
export class BillyFrontierItemMapper implements GameItemModelMapper {
  readonly game = Game.BILLY_FRONTIER;

  /**
   * Get model mapping for a Billy Frontier item type
   */
  getMapping(
    itemType: number,
    _levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const base = BILLY_BASE_MAPPINGS[itemType];
    if (!base) return undefined;

    // Handle variants based on p0
    if (base.variants && params) {
      const variant = base.variants[params.p0];
      if (variant)
        return {
          ...base,
          modelFile: variant.modelFile ?? base.modelFile,
          modelIndex: variant.modelIndex,
        };
    }

    return base;
  }

  /**
   * Get all mapped item types
   */
  getMappedTypes(): number[] {
    return Object.keys(BILLY_BASE_MAPPINGS)
      .map(Number)
      .filter((k) => !isNaN(k));
  }

  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean {
    return BILLY_BASE_MAPPINGS[itemType] !== undefined;
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
export const billyFrontierItemMapper = new BillyFrontierItemMapper();
