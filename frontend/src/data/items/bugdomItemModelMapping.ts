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

import type { UniversalItemModelMapping } from "./itemModelTypes";
import { ROTATION_4_WAY } from "./standardParamTypes";
import { ItemType } from "./bugdomItemType";

/**
 * Comprehensive mapping of all Bugdom item types to their 3D models
 *
 * Model indices correspond to MObjType enum positions within the respective 3DMF file groups.
 */
export const BUGDOM_ITEM_MODEL_MAPPINGS: Record<
  number,
  UniversalItemModelMapping | undefined
> = {
  // Enemy skeletons
  [ItemType.LadyBugBonus]: { modelFile: "LadyBug.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "LadyBug.skeleton.rsrc" },
  [ItemType.Enemy_BoxerFly]: { modelFile: "BoxerFly.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "BoxerFly.skeleton.rsrc" },
  [ItemType.SlugEnemy]: { modelFile: "Slug.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Slug.skeleton.rsrc" },
  [ItemType.Enemy_Ant]: { modelFile: "Ant.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Ant.skeleton.rsrc" },
  [ItemType.Enemy_FireAnt]: { modelFile: "WingedFireAnt.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "WingedFireAnt.skeleton.rsrc" },
  [ItemType.WaterBug]: { modelFile: "WaterBug.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "WaterBug.skeleton.rsrc" },
  [ItemType.DragonFly]: { modelFile: "DragonFly.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "DragonFly.skeleton.rsrc" },
  [ItemType.Enemy_PondFish]: { modelFile: "PondFish.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "PondFish.skeleton.rsrc" },
  [ItemType.Enemy_Mosquito]: { modelFile: "Mosquito.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Mosquito.skeleton.rsrc" },
  [ItemType.Foot]: { modelFile: "Foot.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Foot.skeleton.rsrc" },
  [ItemType.Enemy_Spider]: { modelFile: "Spider.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Spider.skeleton.rsrc" },
  [ItemType.Enemy_Caterpiller]: { modelFile: "Caterpillar.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Caterpillar.skeleton.rsrc" },
  [ItemType.FireFly]: { modelFile: "FireFly.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "FireFly.skeleton.rsrc" },
  [ItemType.RootSwing]: { modelFile: "RootSwing.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "RootSwing.skeleton.rsrc" },
  [ItemType.Enemy_Larva]: { modelFile: "Larva.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Larva.skeleton.rsrc" },
  [ItemType.Enemy_FlyingBee]: { modelFile: "FlyingBee.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "FlyingBee.skeleton.rsrc" },
  [ItemType.Enemy_WorkerBee]: { modelFile: "WorkerBee.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "WorkerBee.skeleton.rsrc" },
  [ItemType.Enemy_QueenBee]: { modelFile: "QueenBee.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "QueenBee.skeleton.rsrc" },
  [ItemType.Enemy_Roach]: { modelFile: "Roach.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Roach.skeleton.rsrc" },
  [ItemType.Enemy_Skippy]: { modelFile: "Skippy.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Skippy.skeleton.rsrc" },
  [ItemType.Enemy_KingAnt]: { modelFile: "AntKing.3dmf", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "AntKing.skeleton.rsrc" },

  // Lawn level static models (Lawn_Models1.3dmf - group 0: LAWN1 items)
  [ItemType.LawnDoor]: { modelFile: "Lawn_Models1.3dmf", modelPath: "models", modelIndex: 1 }, // LAWN1_MObjType_Door_Green = 1
  [ItemType.Faucet]: { modelFile: "Lawn_Models1.3dmf", modelPath: "models", modelIndex: 11 }, // LAWN1_MObjType_WaterFaucet = 11

  // Lawn level vegetation (Lawn_Models2.3dmf - group 4: LAWN2 items; indices = LAWN2_MObjType values)
  [ItemType.Grass]: { modelFile: "Lawn_Models2.3dmf", modelPath: "models", modelIndex: 0 }, // LAWN2_MObjType_Grass = 0
  [ItemType.Weed]: { modelFile: "Lawn_Models2.3dmf", modelPath: "models", modelIndex: 2 }, // LAWN2_MObjType_Weed = 2
  [ItemType.Cosmo]: { modelFile: "Lawn_Models2.3dmf", modelPath: "models", modelIndex: 3 }, // LAWN2_MObjType_Cosmo = 3
  [ItemType.Poppy]: { modelFile: "Lawn_Models2.3dmf", modelPath: "models", modelIndex: 4 }, // LAWN2_MObjType_Poppy = 4
  [ItemType.SunFlower]: { modelFile: "Lawn_Models2.3dmf", modelPath: "models", modelIndex: 5 }, // LAWN2_MObjType_Sunflower = 5
  [ItemType.Clover]: { modelFile: "Lawn_Models2.3dmf", modelPath: "models", modelIndex: 6 }, // LAWN2_MObjType_Clover = 6
  [ItemType.Rock]: { modelFile: "Lawn_Models2.3dmf", modelPath: "models", modelIndex: 8 }, // LAWN2_MObjType_Rock1 = 8

  // Pond level models (Pond_Models.3dmf; indices = POND_MObjType values)
  [ItemType.CatTail]: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 0 }, // POND_MObjType_CatTail = 0
  [ItemType.DuckWeed]: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 1 }, // POND_MObjType_DuckWeed = 1
  [ItemType.LilyFlower]: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 2 }, // POND_MObjType_LilyFlower = 2
  [ItemType.LilyPad]: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 3 }, // POND_MObjType_LilyPad = 3
  [ItemType.PondGrass]: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 4 }, // POND_MObjType_PondGrass = 4
  [ItemType.Reed]: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 7 }, // POND_MObjType_Reed = 7
  [ItemType.Dock]: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 10 }, // POND_MObjType_Dock = 10
  [ItemType.Tree]: { modelFile: "Pond_Models.3dmf", modelPath: "models", modelIndex: 0 }, // flight level tree (uses pond models)

  // Forest level models (Forest_Models.3dmf; indices = FOREST_MObjType values)
  [ItemType.ExitLog]: { modelFile: "Forest_Models.3dmf", modelPath: "models", modelIndex: 1, rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY } }, // FOREST_MObjType_Tree = 1... actually exit log model
  [ItemType.Thorn]: { modelFile: "Forest_Models.3dmf", modelPath: "models", modelIndex: 8 }, // FOREST_MObjType_Thorn1 = 8
  [ItemType.RockLedge]: { modelFile: "Forest_Models.3dmf", modelPath: "models", modelIndex: 10 }, // FOREST_MObjType_FlatRock = 10
  [ItemType.Stump]: { modelFile: "Forest_Models.3dmf", modelPath: "models", modelIndex: 6 }, // FOREST_MObjType_Stump = 6
  [ItemType.WoodPost]: { modelFile: "Forest_Models.3dmf", modelPath: "models", modelIndex: 12 }, // FOREST_MObjType_WoodPost = 12

  // BeeHive level models (BeeHive_Models.3dmf; indices = HIVE_MObjType values)
  [ItemType.HoneycombPlatform]: { modelFile: "BeeHive_Models.3dmf", modelPath: "models", modelIndex: 0 }, // HIVE_MObjType_BrickPlatform = 0
  [ItemType.Firecracker]: { modelFile: "BeeHive_Models.3dmf", modelPath: "models", modelIndex: 3 }, // HIVE_MObjType_Firecracker = 3
  [ItemType.Detonator]: { modelFile: "BeeHive_Models.3dmf", modelPath: "models", modelIndex: 4 }, // HIVE_MObjType_DetonatorGreen = 4
  [ItemType.HiveDoor]: { modelFile: "BeeHive_Models.3dmf", modelPath: "models", modelIndex: 10 }, // HIVE_MObjType_HiveDoor_Green = 10
  [ItemType.HoneyTube]: { modelFile: "BeeHive_Models.3dmf", modelPath: "models", modelIndex: 21 }, // HIVE_MObjType_BentTube = 21
  [ItemType.FloorSpike]: { modelFile: "BeeHive_Models.3dmf", modelPath: "models", modelIndex: 25 }, // HIVE_MObjType_FloorSpike = 25

  // Night level models (Night_Models.3dmf; indices = NIGHT_MObjType values)
  [ItemType.RollingBoulder]: { modelFile: "Night_Models.3dmf", modelPath: "models", modelIndex: 7 }, // NIGHT_MObjType_CherryBomb = 7
  [ItemType.Checkpoint]: { modelFile: "Night_Models.3dmf", modelPath: "models", modelIndex: 13 }, // NIGHT_MObjType_Door_Green = 13

  // AntHill level models (AntHill_Models.3dmf; indices = ANTHILL_MObjType values)
  [ItemType.WaterValve]: { modelFile: "AntHill_Models.3dmf", modelPath: "models", modelIndex: 0 }, // ANTHILL_MObjType_WaterValveBox = 0
  [ItemType.BentAntPipe]: { modelFile: "AntHill_Models.3dmf", modelPath: "models", modelIndex: 3 }, // ANTHILL_MObjType_BentPipe = 3
  [ItemType.HorizAntPipe]: { modelFile: "AntHill_Models.3dmf", modelPath: "models", modelIndex: 4 }, // ANTHILL_MObjType_HorizPipe = 4
  [ItemType.KingWaterPipe]: { modelFile: "AntHill_Models.3dmf", modelPath: "models", modelIndex: 5 }, // ANTHILL_MObjType_KingPipe = 5

  // Global models (Global_Models1.3dmf; indices = GLOBAL1_MObjType values)
  [ItemType.Nut]: { modelFile: "Global_Models1.3dmf", modelPath: "models", modelIndex: 2 }, // GLOBAL1_MObjType_Nut = 2
  [ItemType.WallEnd]: { modelFile: "Global_Models1.3dmf", modelPath: "models", modelIndex: 4 }, // GLOBAL1_MObjType_WallEnd = 4
};

/**
 * Get the model mapping for a specific Bugdom item type
 */
export const getBugdomItemModelMapping = (
  itemType: number,
): UniversalItemModelMapping | undefined => {
  return BUGDOM_ITEM_MODEL_MAPPINGS[itemType];
};
