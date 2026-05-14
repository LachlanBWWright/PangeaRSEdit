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
import { ROTATION_4_WAY, ROTATION_8_WAY } from "../standardParamTypes";

/**
 * Level-specific model file names for Nanosaur 2
 */
export const NANOSAUR2_LEVEL_MODEL_FILES: Record<number, string> = {
  0: "forest.bg3d", // Forest
  1: "desert.bg3d", // Desert
  2: "swamp.bg3d", // Swamp
};

/**
 * Base mappings for Nanosaur 2 items.
 * Model indices correspond exactly to the ObjType enum values in mobjtypes.h.
 */
const NANOSAUR2_BASE_MAPPINGS: Record<number, UniversalItemModelMapping> = {
  // ---- GLOBAL (global.bg3d) ----
  // GLOBAL_ObjType_RedEgg = 2, GreenEgg = 3, BlueEgg = 4, YellowEgg = 5, PurpleEgg = 6
  [ItemType.Egg]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 2,
    variants: {
      0: { modelIndex: 2 },
      1: { modelIndex: 3 },
      2: { modelIndex: 4 },
      3: { modelIndex: 5 },
      4: { modelIndex: 6 },
    },
  },

  // GLOBAL_ObjType_EntryWormhole = 20
  [ItemType.EggWormhole]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 20,
  },

  // GLOBAL_ObjType_POWFrame = 9 (+ HealthPOWMembrane/FuelPOWMembrane/ShieldPOWMembrane/FreeLifePOWMembrane)
  [ItemType.WeaponPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 9,
    groupSize: 2,
  },
  [ItemType.HealthPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 9,
    groupSize: 3,
  }, // POWFrame + HealthPOWFrame + HealthPOWMembrane
  [ItemType.FuelPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 9,
  }, // POWFrame + FuelPOWMembrane (index 12)
  [ItemType.ShieldPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 9,
  }, // POWFrame + ShieldPOWMembrane (index 13)
  [ItemType.FreeLifePOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 9,
  }, // POWFrame + FreeLifePOWMembrane (index 14)

  // GLOBAL_ObjType_Electrode_Pole = 23, TopBottom = 24, Middle = 25
  [ItemType.Electrode]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 23,
    groupSize: 3,
  },

  // GLOBAL_ObjType_ForestDoor_Door = 26, KeyHolder = 27
  [ItemType.ForestDoor]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 26,
    groupSize: 2,
    // parm[1] * (PI/2) sets rotation (0-3, 90° per step) - Source/Items/ForestDoor.c:61
    rotationParam: { paramIndex: 1, rotationType: ROTATION_4_WAY },
  },

  // GLOBAL_ObjType_ForestDoor_Key = 28, Ring = 29
  [ItemType.ForestDoorKey]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 28,
    groupSize: 2,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
  },

  // GLOBAL_ObjType_LaserOrb = 30
  [ItemType.LaserOrb]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 30,
  },

  // ---- LEVEL 1: FOREST (forest.bg3d) ----
  // LEVEL1_ObjType_Tree_Birch_HighRed = 2 ... Tree_Birch_Flat = 8
  // Source/Items/Trees.c AddBirchTree: type = LEVEL1_ObjType_Tree_Birch_HighRed + parm[0]; scale = 1.2
  [ItemType.BirchTree]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 1.2,
    variants: {
      0: { modelIndex: 2 },
      1: { modelIndex: 3 },
      2: { modelIndex: 4 },
      3: { modelIndex: 5 },
      4: { modelIndex: 6 },
      5: { modelIndex: 7 },
      6: { modelIndex: 8 },
    },
  },

  // LEVEL1_ObjType_Tree_Pine_HighDead = 9 ... Tree_Pine_Flat = 15
  // Source/Items/Trees.c AddPineTree: type = LEVEL1_ObjType_Tree_Pine_HighDead + parm[0]; scale = 1.2
  [ItemType.PineTree]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 9,
    scale: 1.2,
    variants: {
      0: { modelIndex: 9 },
      1: { modelIndex: 10 },
      2: { modelIndex: 11 },
      3: { modelIndex: 12 },
      4: { modelIndex: 13 },
      5: { modelIndex: 14 },
      6: { modelIndex: 15 },
    },
  },

  // LEVEL1_ObjType_SmallTree = 16
  // Source/Items/Trees.c AddSmallTree: scale = 1.0
  [ItemType.SmallTree]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 16,
    scale: 1.0,
  },

  // LEVEL1_ObjType_FallenTree = 17
  // Source/Items/Trees.c AddFallenTree: scale = 1.7
  [ItemType.FallenTree]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 17,
    scale: 1.7,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
  },

  // LEVEL1_ObjType_TreeStump = 18
  // Source/Items/Trees.c AddTreeStump: scale = 1.3
  [ItemType.TreeStump]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 18,
    scale: 1.3,
  },

  // LEVEL1_ObjType_BentPine1_Trunk = 19, BentPine2_Trunk = 20, Leaves = 21, 22
  // Source/Items/Trees.c AddBentPineTree: type = BentPine1_Trunk + parm[0]; scale = 1.2
  [ItemType.BentPineTree]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 19,
    groupSize: 2,
    scale: 1.2,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
  },

  // LEVEL1_ObjType_Grass = 23, GrassPatch = 24
  // LEVEL2_ObjType_Grass = 45, GrassPatch = 46
  // LEVEL3_ObjType_Grass_Single = 13, Grass_Small = 14, Grass_Patch = 15
  // Source/Items/Bushes.c AddGrass: type = LevelBase + parm[0]; scale = 2.0
  [ItemType.Grass]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 23,
    scale: 2.0,
    variants: { 0: { modelIndex: 23 }, 1: { modelIndex: 24 } },
  },

  // LEVEL1_ObjType_LowFern = 25, HighFern = 26
  // Source/Items/Bushes.c AddFern: type = LowFern + parm[0]; scale = 1.4
  [ItemType.Fern]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 25,
    scale: 1.4,
    variants: { 0: { modelIndex: 25 }, 1: { modelIndex: 26 } },
  },

  // LEVEL1_ObjType_LowBerryBush = 27, HighBerryBush = 28
  // Source/Items/Bushes.c AddBerryBush: type = LowBerryBush + parm[0]; scale = 2.0
  [ItemType.BerryBush]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 27,
    scale: 2.0,
    variants: { 0: { modelIndex: 27 }, 1: { modelIndex: 28 } },
  },

  // LEVEL1_ObjType_SmallCattail = 29, LargeCattail = 30
  // Source/Items/Bushes.c AddCatTail: type = SmallCattail + parm[0]; scale = 1.4
  [ItemType.CatTail]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 29,
    scale: 1.4,
    variants: { 0: { modelIndex: 29 }, 1: { modelIndex: 30 } },
  },

  // LEVEL1_ObjType_Rock1 = 31, Rock2 = 32, Rock3 = 33, Rock4 = 34, TallRock1 = 35, TallRock2 = 36
  // LEVEL2_ObjType_Rock_Small1 = 39 ... Rock_Large3 = 44
  // Source/Items/Items.c AddRock: type = LevelBase + parm[0]; scale = 2.0
  [ItemType.Rock]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 31,
    scale: 2.0,
    variants: {
      0: { modelIndex: 31 },
      1: { modelIndex: 32 },
      2: { modelIndex: 33 },
      3: { modelIndex: 34 },
      4: { modelIndex: 35 },
      5: { modelIndex: 36 },
    },
  },

  // LEVEL1_ObjType_RiverRock1 = 37, RiverRock2 = 38
  // Source/Items/Items.c AddRiverRock: type = RiverRock1 + parm[0]; scale = 2.0
  [ItemType.RiverRock]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 37,
    scale: 2.0,
    variants: { 0: { modelIndex: 37 }, 1: { modelIndex: 38 } },
  },

  // LEVEL1_ObjType_GasMound1 = 39, GasMound2 = 40, GasMound3 = 41
  // Source/Items/Items.c AddGasMound: type = GasMound1 + parm[0]; scale = 3.0
  [ItemType.GasMound]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 39,
    scale: 3.0,
    variants: {
      0: { modelIndex: 39 },
      1: { modelIndex: 40 },
      2: { modelIndex: 41 },
    },
  },

  // LEVEL1_ObjType_AirMine_Base = 43, Chain = 44, Mine = 45
  // LEVEL2_ObjType_AirMine_Base = 2,  Chain = 3,  Mine = 4
  // LEVEL3_ObjType_AirMine_Base = 29, Chain = 30, Mine = 31
  // See Source/Items/Mines.c: scale = AIRMINE_SCALE (1.2f), level-dependent ObjType base
  [ItemType.AirMine]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 43,
    groupSize: 3,
    scale: 1.2,
  },

  // LEVEL1_ObjType_TowerTurret_Base = 46, Turret = 47, Wheel = 48, Gun = 49
  // LEVEL2_ObjType_TowerTurret_Base = 48, Turret = 49, Wheel = 50, Gun = 51
  // LEVEL3_ObjType_TowerTurret_Base = 33, Turret = 34, Wheel = 35, Gun = 36
  [ItemType.TowerTurret]: {
    modelFile: "forest.bg3d",
    modelPath: "models",
    modelIndex: 46,
    groupSize: 4,
    scale: 2.5,
  },

  // ---- LEVEL 2: DESERT (desert.bg3d) ----
  // DustDevil has no BG3D model - it is a particle/procedural effect (Source/Items/DustDevil.c)

  // LEVEL2_ObjType_Tree1 = 5 ... Tree5 = 9; Canopies = 10-14
  // Source/Items/Trees.c: scale = 1.2 + RandomFloat() * .3f
  [ItemType.DesertTree]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 1.2,
    variants: {
      0: { modelIndex: 5 },
      1: { modelIndex: 6 },
      2: { modelIndex: 7 },
      3: { modelIndex: 8 },
      4: { modelIndex: 9 },
    },
  },

  // LEVEL2_ObjType_BurntTree1 = 15, BurntTree2 = 16
  // Source/Items/Trees.c: scale = 1.2f + RandomFloat() * .3f
  [ItemType.BurntDesertTree]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 15,
    scale: 1.2,
    variants: { 0: { modelIndex: 15 }, 1: { modelIndex: 16 } },
  },

  // LEVEL2_ObjType_PalmTree1 = 17, PalmTree2 = 18, PalmTree3 = 19; Canopies = 20-22
  // Source/Items/Trees.c: scale = 1.2 + RandomFloat() * .3f
  [ItemType.PalmTree]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 17,
    scale: 1.2,
    variants: {
      0: { modelIndex: 17 },
      1: { modelIndex: 18 },
      2: { modelIndex: 19 },
    },
  },

  // LEVEL2_ObjType_Bush1 = 23, Bush2 = 24, Bush3 = 25, BushBurnt = 26
  // Source/Items/Bushes.c AddDesertBush: scale = 2.0
  [ItemType.DesertBush]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 23,
    scale: 2.0,
    variants: {
      0: { modelIndex: 23 },
      1: { modelIndex: 24 },
      2: { modelIndex: 25 },
      3: { modelIndex: 26 },
    },
  },

  // LEVEL2_ObjType_PalmBush1 = 27, PalmBush2 = 28, PalmBush3 = 29
  // Source/Items/Bushes.c AddPalmBush: scale = 2.0f
  [ItemType.PalmBush]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 27,
    scale: 2.0,
    variants: {
      0: { modelIndex: 27 },
      1: { modelIndex: 28 },
      2: { modelIndex: 29 },
    },
  },

  // LEVEL2_ObjType_Cactus_Low = 30, Cactus_Small = 31, Cactus_Medium = 32
  // Source/Items/Bushes.c AddCactus: scale = 2.0
  [ItemType.Cactus]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 30,
    scale: 2.0,
    variants: {
      0: { modelIndex: 30 },
      1: { modelIndex: 31 },
      2: { modelIndex: 32 },
    },
  },

  // LEVEL2_ObjType_Crystal1 = 33, Crystal2 = 34, Crystal3 = 35; Bases = 36-38
  [ItemType.Crystal]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 33,
    groupSize: 2, // crystal + base
    variants: {
      0: { modelIndex: 33 },
      1: { modelIndex: 34 },
      2: { modelIndex: 35 },
    },
  },

  // ---- LEVEL 3: SWAMP (swamp.bg3d) ----
  // LEVEL3_ObjType_HydraTree_Small = 2, Medium = 3, Large = 4
  // Source/Items/Trees.c AddHydraTree: scale = 1.5f + RandomFloat() * .5f
  [ItemType.HydraTree]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 1.5,
    variants: {
      0: { modelIndex: 2 },
      1: { modelIndex: 3 },
      2: { modelIndex: 4 },
    },
  },

  // LEVEL3_ObjType_OddTree_Small = 5, Medium1 = 6, Medium2 = 7, Large = 8
  // Source/Items/Trees.c AddOddTree: scale = 1.3f + RandomFloat() * .3f
  [ItemType.OddTree]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 1.3,
    variants: {
      0: { modelIndex: 5 },
      1: { modelIndex: 6 },
      2: { modelIndex: 7 },
      3: { modelIndex: 8 },
    },
  },

  // LEVEL3_ObjType_GeckoPlant_Small = 9, Medium = 10, Large = 11
  // Source/Items/Bushes.c AddGeckoPlant: scale = 2.0f
  [ItemType.GeckoPlant]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 9,
    scale: 2.0,
    variants: {
      0: { modelIndex: 9 },
      1: { modelIndex: 10 },
      2: { modelIndex: 11 },
    },
  },

  // LEVEL3_ObjType_SproutPlant = 12
  // Source/Items/Bushes.c AddSproutPlant: scale = 2.5f
  [ItemType.SproutPlant]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 12,
    scale: 2.5,
  },

  // LEVEL3_ObjType_PurpleIvy_Small = 16 ... PatchLarge = 20
  // LEVEL3_ObjType_RedIvy_Small    = 21 ... PatchLarge = 25
  // Source/Items/Bushes.c AddIvy: type = (parm[1]==0) ? (Purple+parm[0]) : (Red+parm[0]); scale = 2.0f
  [ItemType.Ivy]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 16,
    scale: 2.0,
    variants: {
      0: { modelIndex: 16 },
      1: { modelIndex: 17 },
      2: { modelIndex: 18 },
      3: { modelIndex: 19 },
      4: { modelIndex: 20 },
    },
  },

  // LEVEL3_ObjType_Asteroid_Cracked = 26, Asteroid1 = 27, Asteroid2 = 28
  // Source/Items/Items.c AddAsteroid: type = LEVEL3_ObjType_Asteroid_Cracked + parm[0]; scale = 4.0
  [ItemType.Asteroid]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 26,
    scale: 4.0,
    variants: {
      0: { modelIndex: 26 },
      1: { modelIndex: 27 },
      2: { modelIndex: 28 },
    },
  },

  // LEVEL3_ObjType_FallenTree1 = 37, FallenTree2 = 38
  // Source/Items/Trees.c AddSwampFallenTree: scale = 1.2 + RandomFloat2() * .2f
  [ItemType.SwampFallenTree]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 37,
    scale: 1.2,
    // parm[1]: 0=random, 1-8 = (value-1)*PI2/8; offset by -PI/4 to correct for 1-indexed formula
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation",
        divisions: 8,
        multiplier: "PI2/8",
        offset: -Math.PI / 4,
        description:
          "Rotation (0=random, 1-8 = specific 45° steps; 0° when value=1)",
      },
    },
    variants: { 0: { modelIndex: 37 }, 1: { modelIndex: 38 } },
  },

  // LEVEL3_ObjType_Stump1 = 39, Stump2 = 40, Stump3 = 41, Stump4 = 42
  // Source/Items/Trees.c AddSwampStump: scale = 1.3
  [ItemType.SwampStump]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 39,
    scale: 1.3,
    variants: {
      0: { modelIndex: 39 },
      1: { modelIndex: 40 },
      2: { modelIndex: 41 },
      3: { modelIndex: 42 },
    },
  },

  // ---- SKELETON ENEMIES ----
  [ItemType.Enemy_Raptor]: {
    modelFile: "raptor.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "raptor.skeleton.rsrc",
  },

  [ItemType.Enemy_Brach]: {
    modelFile: "brach.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "brach.skeleton.rsrc",
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
  },

};

/**
 * Per-level model overrides for items whose ObjType indices differ across level BG3D files.
 * Source: Source/Items/Mines.c, Items.c, Bushes.c (switch on gLevelNum for AirMine, Rock, Grass)
 *
 * Level 0 = Forest (forest.bg3d)
 * Level 1 = Desert (desert.bg3d)
 * Level 2 = Swamp  (swamp.bg3d)
 */
const NANOSAUR2_LEVEL_SPECIFIC_MAPPINGS: Record<
  number,
  Record<number, UniversalItemModelMapping>
> = {
  0: {
    // Forest: LEVEL1_ObjType_AirMine_Base = 43, Chain = 44, Mine = 45 (Mines.c: scale = 1.2)
    [ItemType.AirMine]: {
      modelFile: "forest.bg3d",
      modelPath: "models",
      modelIndex: 43,
      groupSize: 3,
      scale: 1.2,
    },
    // Forest: LEVEL1_ObjType_TowerTurret_Base = 46, Turret = 47, Wheel = 48, Gun = 49
    [ItemType.TowerTurret]: {
      modelFile: "forest.bg3d",
      modelPath: "models",
      modelIndex: 46,
      groupSize: 4,
      scale: 2.5,
    },
    // Forest: LEVEL1_ObjType_Rock1 = 31 ... TallRock2 = 36 (Items.c: scale = 2.0)
    [ItemType.Rock]: {
      modelFile: "forest.bg3d",
      modelPath: "models",
      modelIndex: 31,
      scale: 2.0,
      variants: {
        0: { modelIndex: 31 },
        1: { modelIndex: 32 },
        2: { modelIndex: 33 },
        3: { modelIndex: 34 },
        4: { modelIndex: 35 },
        5: { modelIndex: 36 },
      },
    },
    // Forest: LEVEL1_ObjType_Grass = 23, GrassPatch = 24 (Bushes.c: scale = 2.0)
    [ItemType.Grass]: {
      modelFile: "forest.bg3d",
      modelPath: "models",
      modelIndex: 23,
      scale: 2.0,
      variants: { 0: { modelIndex: 23 }, 1: { modelIndex: 24 } },
    },
  },
  1: {
    // Desert: LEVEL2_ObjType_AirMine_Base = 2, Chain = 3, Mine = 4 (Mines.c: scale = 1.2)
    [ItemType.AirMine]: {
      modelFile: "desert.bg3d",
      modelPath: "models",
      modelIndex: 2,
      groupSize: 3,
      scale: 1.2,
    },
    // Desert: LEVEL2_ObjType_TowerTurret_Base = 48, Turret = 49, Wheel = 50, Gun = 51
    [ItemType.TowerTurret]: {
      modelFile: "desert.bg3d",
      modelPath: "models",
      modelIndex: 48,
      groupSize: 4,
      scale: 2.5,
    },
    // Desert: LEVEL2_ObjType_Rock_Small1 = 39 ... Rock_Large3 = 44 (Items.c: scale = 2.0)
    [ItemType.Rock]: {
      modelFile: "desert.bg3d",
      modelPath: "models",
      modelIndex: 39,
      scale: 2.0,
      variants: {
        0: { modelIndex: 39 },
        1: { modelIndex: 40 },
        2: { modelIndex: 41 },
        3: { modelIndex: 42 },
        4: { modelIndex: 43 },
        5: { modelIndex: 44 },
      },
    },
    // Desert: LEVEL2_ObjType_Grass = 45, GrassPatch = 46 (Bushes.c: scale = 2.0)
    [ItemType.Grass]: {
      modelFile: "desert.bg3d",
      modelPath: "models",
      modelIndex: 45,
      scale: 2.0,
      variants: { 0: { modelIndex: 45 }, 1: { modelIndex: 46 } },
    },
  },
  2: {
    // Swamp: LEVEL3_ObjType_AirMine_Base = 29, Chain = 30, Mine = 31 (Mines.c: scale = 1.2)
    [ItemType.AirMine]: {
      modelFile: "swamp.bg3d",
      modelPath: "models",
      modelIndex: 29,
      groupSize: 3,
      scale: 1.2,
    },
    // Swamp: LEVEL3_ObjType_TowerTurret_Base = 33, Turret = 34, Wheel = 35, Gun = 36
    [ItemType.TowerTurret]: {
      modelFile: "swamp.bg3d",
      modelPath: "models",
      modelIndex: 33,
      groupSize: 4,
      scale: 2.5,
    },
    // Swamp: LEVEL3_ObjType_Grass_Single = 13, Grass_Small = 14, Grass_Patch = 15 (Bushes.c: scale = 2.0)
    [ItemType.Grass]: {
      modelFile: "swamp.bg3d",
      modelPath: "models",
      modelIndex: 13,
      scale: 2.0,
      variants: {
        0: { modelIndex: 13 },
        1: { modelIndex: 14 },
        2: { modelIndex: 15 },
      },
    },
  },
};

/** Set of item types that have different model indices per level. */
const NANOSAUR2_LEVEL_DEPENDENT_TYPES = new Set<number>([
  ItemType.AirMine,
  ItemType.TowerTurret,
  ItemType.Rock,
  ItemType.Grass,
]);

/**
 * Nanosaur 2 Item Mapper Implementation
 */
export class Nanosaur2ItemMapper implements GameItemModelMapper {
  readonly game = Game.NANOSAUR_2;

  private resolveVariant(
    base: UniversalItemModelMapping,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
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
   * Get model mapping for a Nanosaur 2 item type.
   * Level-dependent items (AirMine, TowerTurret, Rock, Grass) use level-specific model files
   * and ObjType indices. Falls back to forest (level 0) when levelNum is not provided.
   */
  getMapping(
    itemType: number,
    levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    // Ivy uses parm[1] (color) to switch between PurpleIvy (0) and RedIvy (1) families
    if (itemType === ItemType.Ivy && params) {
      const isRed = params.p1 !== 0;
      // LEVEL3_ObjType_PurpleIvy_Small = 16 ... PatchLarge = 20
      // LEVEL3_ObjType_RedIvy_Small    = 21 ... PatchLarge = 25
      const base = isRed ? 21 : 16;
      const variantIndex = Math.min(params.p0, 4);
      return {
        modelFile: "swamp.bg3d",
        modelPath: "models",
        modelIndex: base + variantIndex,
        scale: 2.0,
      };
    }

    // Check level-specific overrides first (level 0 = forest default if levelNum is undefined)
    const effectiveLevelNum = levelNum ?? 0;
    if (NANOSAUR2_LEVEL_DEPENDENT_TYPES.has(itemType)) {
      const levelOverrides =
        NANOSAUR2_LEVEL_SPECIFIC_MAPPINGS[effectiveLevelNum];
      const override = levelOverrides?.[itemType];
      if (override) return this.resolveVariant(override, params);
    }

    const base = NANOSAUR2_BASE_MAPPINGS[itemType];
    if (!base) return undefined;

    return this.resolveVariant(base, params);
  }

  /**
   * Returns true for item types that use different model files/indices per level.
   */
  isLevelDependent(itemType: number): boolean {
    return NANOSAUR2_LEVEL_DEPENDENT_TYPES.has(itemType);
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
    return (
      NANOSAUR2_BASE_MAPPINGS[itemType] !== undefined ||
      NANOSAUR2_LEVEL_DEPENDENT_TYPES.has(itemType)
    );
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
