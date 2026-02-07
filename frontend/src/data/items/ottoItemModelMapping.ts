/**
 * Otto Matic Item Type to 3D Model Mapping
 *
 * Maps each item type to its corresponding BG3D model file and mesh information.
 * Based on official Otto Matic source code and exhaustive analysis of model indices.
 *
 * Model indices derived from:
 * - /games/ottomatic/Source/Headers/mobjtypes.h (model enums)
 * - /games/ottomatic/Source/Items/*.c (AddItem* functions)
 * - /games/ottomatic/Source/Terrain/Terrain2.c (gTerrainItemAddRoutines)
 *
 * Key insight: BG3D files contain indexed subgroups corresponding to enum positions
 */

import { ItemType } from "./ottoItemType";
import type { SourceCitation } from "./itemModelTypes";

/**
 * Describes how to load and render a 3D model for an item type
 */
export interface ItemModelMapping {
  /** BG3D filename (e.g., "level1_farm.bg3d", "Otto.bg3d") */
  modelFile: string;

  /** Subdirectory in /games/ottomatic/ */
  modelPath: "models" | "skeletons";

  /** Model index within the BG3D file (0-indexed) */
  modelIndex: number;

  /** Number of consecutive subgroups to include (default: 1).
   *  Some items are composed of multiple consecutive subgroups in the BG3D file
   *  (e.g., Windmill base + propeller, TeleportBase + dish). */
  groupSize?: number;

  /** True if model requires skeleton data for rigging */
  requiresSkeleton?: boolean;

  /** Skeleton .rsrc filename */
  skeletonFile?: string;

  /** Uniform scale multiplier (default: 1.0) */
  scale?: number;

  /** Horizontal scale multiplier (X/Z axes, default: 1.0) */
  scaleXZ?: number;

  /** Vertical scale multiplier (Y axis, default: 1.0) */
  scaleY?: number;

  /** Y-axis rotation offset in radians (default: 0) */
  rotationY?: number;

  /** Position offset in world units [x, y, z] */
  positionOffset?: [number, number, number];

  /** Source code citations for this mapping */
  citations?: SourceCitation[];
}

/**
 * Get item model mapping for a given item type
 */
export function getItemModelMapping(itemType: number): ItemModelMapping | undefined {
  return OTTO_ITEM_MODEL_MAPPINGS[itemType];
}

/**
 * Comprehensive mapping of all Otto Matic item types to their 3D models
 *
 * ItemType ranges:
 * - 0: MyStartCoords (no model)
 * - 1-27: Basic plants, farm items, global items, and skeleton enemies
 * - 28-42: Slime level items
 * - 43-70: Multi-level items (cloud, jungle, apocalypse)
 * - 71-108: Boss levels and special items (jungle, fire/ice, saucer, brain)
 */
export const OTTO_ITEM_MODEL_MAPPINGS: Record<
  number,
  ItemModelMapping | undefined
> = {
  // 0: StartCoords (no visual model)

  // 1-10: Basic plants and early enemies
  [ItemType.BasicPlant]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 21, // Tree
  },
  [ItemType.SpacePodGenerator]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 5, // SpacePod
  },
  [ItemType.Enemy_Squooshy]: {
    modelFile: "Squooshy.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Squooshy.skeleton.rsrc",
  },
  // Human (type 4) is a PARAM-DEPENDENT item!
  // The model file changes based on p1 parameter:
  // p1=0: Farmer, p1=1: BeeWoman, p1=2: Scientist, p1=3: SkirtLady
  // This mapping serves as a fallback - actual selection happens in OttoItemMapper.getMapping()
  // See: Items/Humans.c - MakeHuman() function uses itemPtr->parm[1] for type
  [ItemType.Human]: undefined, // Param-dependent - handled by mapper
  [ItemType.Atom]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 0, // Ripple
  },
  [ItemType.PowerupPod]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 1.8,
    citations: [
      { file: "src/Items/Powerups.c", line: 52, description: "#define POD_SCALE 1.8f" },
      { file: "src/Items/Powerups.c", line: 619, description: "scale = POD_SCALE" },
    ],
  },
  [ItemType.Enemy_BrainAlien]: {
    modelFile: "BrainAlien.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "BrainAlien.skeleton.rsrc",
  },
  // Farm enemies (Onion, Corn, Tomato) - skeletal characters
  [ItemType.Enemy_Onion]: {
    modelFile: "Onion.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Onion.skeleton.rsrc",
  },
  [ItemType.Enemy_Corn]: {
    modelFile: "Corn.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Corn.skeleton.rsrc",
  },
  [ItemType.Enemy_Tomato]: {
    modelFile: "Tomato.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Tomato.skeleton.rsrc",
  },
  [ItemType.Checkpoint]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 31, // TeleportBase + TeleportDish
    groupSize: 2,
  },

  // 11-27: Farm level and global items
  [ItemType.Barn]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 1.5,
    citations: [{ file: "src/Items/Items.c", line: 146, description: "scale = 1.5" }],
  },
  [ItemType.Silo]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 2.5,
    citations: [{ file: "src/Items/Items.c", line: 177, description: "scale = 2.5" }],
  },
  [ItemType.WoodenGate]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 3, // WoodGate
  },
  [ItemType.MetalGate]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 6, // MetalGate
  },
  [ItemType.FencePost]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 9, // WoodPost
  },
  [ItemType.Tractor]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 11, // Tractor body + 4 wheels
    groupSize: 5,
  },
  [ItemType.CornStalk]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 16,
    scale: 2.0,
    citations: [{ file: "src/Items/Items.c", line: 340, description: "scale = 2.0" }],
  },
  [ItemType.Sprout]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 17,
    scale: 0.5,
    citations: [{ file: "src/Items/Items.c", line: 246, description: "scale = .5" }],
  },
  [ItemType.BigLeafPlant]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 20,
    scale: 2.5,
    citations: [{ file: "src/Items/Items.c", line: 371, description: "scale = 2.5" }],
  },
  [ItemType.PhonePole]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 22,
    scale: 4.0,
    citations: [{ file: "src/Items/Items.c", line: 208, description: "scale = 4.0" }],
  },
  [ItemType.Windmill]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 23,
    groupSize: 2,
    scale: 4.0,
    citations: [
      { file: "src/Items/Items.c", line: 44, description: "#define WINDMILL_SCALE 4.0f" },
      { file: "src/Items/Items.c", line: 709, description: "scale = WINDMILL_SCALE" },
    ],
  },
  [ItemType.Rock]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 27, // Rock_Small
  },
  [ItemType.ExitRocket]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 27, // Rocket + RocketDoor
    groupSize: 2,
  },

  // 28-42: Slime level items
  [ItemType.SlimePipe]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 0, // SlimeTube_FancyJ
    scale: 2.0,
    citations: [{ file: "src/Items/Items.c", line: 775, description: "scale = s = 2.0" }],
  },
  [ItemType.FallingCrystal]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 14,
    scale: 2.5,
    citations: [
      { file: "src/Items/Traps.c", line: 57, description: "#define FALLING_CRYSTAL_SCALE 2.5f" },
      { file: "src/Items/Traps.c", line: 125, description: "scale = FALLING_CRYSTAL_SCALE" },
    ],
  },
  [ItemType.Enemy_Blob]: {
    modelFile: "Blob.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Blob.skeleton.rsrc",
  },
  [ItemType.BumperBubble]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 16, // BumperBubble
  },
  [ItemType.BasicCrystal]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 10,
    scale: 3.0,
    citations: [{ file: "src/Items/Items.c", line: 1345, description: "scale = s = 3.0" }],
  },
  [ItemType.InertBubble]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 17,
    scale: 0.5,
    citations: [{ file: "src/Items/Traps.c", line: 377, description: "scale = .5" }],
  },
  [ItemType.SlimeTree]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 26,
    scale: 6.0,
    citations: [
      { file: "src/Items/Items.c", line: 46, description: "#define SLIME_TREE_SCALE 6.0f" },
      { file: "src/Items/Items.c", line: 1400, description: "scale = SLIME_TREE_SCALE" },
    ],
  },
  [ItemType.MagnetMonster]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 21, // SLIME_ObjType_MagnetMonster + Prop
    groupSize: 2,
  },
  [ItemType.FallingSlimePlatform]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 24, // FallingSlimePlatform_Small
  },
  [ItemType.BubblePump]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 19,
    groupSize: 2,
    scale: 2.0,
    citations: [{ file: "src/Items/Traps.c", line: 440, description: "scale = 2.0" }],
  },
  [ItemType.SlimeMech]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 7,
    groupSize: 2,
    scale: 2.5,
    citations: [{ file: "src/Items/Items.c", line: 1161, description: "scale = s = 2.5f" }],
  },
  [ItemType.SpinningPlatform]: {
    modelFile: "level3_blobboss.bg3d",
    modelPath: "models",
    modelIndex: 5, // CircularPlatform_Blue
  },
  [ItemType.MovingPlatform]: {
    modelFile: "level3_blobboss.bg3d",
    modelPath: "models",
    modelIndex: 21, // MovingPlatform_Blue
  },
  [ItemType.MachineBoss]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 9, // Mech_Boiler
  },

  // 43-54: Cloud/Jungle/Apocalypse level items
  [ItemType.BlobBossTube]: {
    modelFile: "level3_blobboss.bg3d",
    modelPath: "models",
    modelIndex: 31,
    scale: 3.0,
    citations: [{ file: "src/Items/Items.c", line: 1683, description: "scale = s = 3.0" }],
  },
  [ItemType.ScaffoldingPost]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 10.0,
    citations: [{ file: "src/Items/Items.c", line: 1718, description: "scale = 10.0" }],
  },
  [ItemType.JungleGate]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 1, // Gate
  },
  [ItemType.CrunchDoor]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 1,
    groupSize: 3,
    scale: 5.0,
    citations: [{ file: "src/Items/Traps.c", line: 1204, description: "scale = 5.0" }],
  },
  [ItemType.Manhole]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 0.5,
    citations: [{ file: "src/Items/Traps.c", line: 1506, description: "scale = .5" }],
  },
  [ItemType.Enemy_Flamester]: {
    modelFile: "Flamester.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Flamester.skeleton.rsrc",
  },
  [ItemType.Enemy_GiantLizard]: {
    modelFile: "GiantLizard.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "GiantLizard.skeleton.rsrc",
  },
  [ItemType.Enemy_FlyTrap]: {
    modelFile: "VenusFlytrap.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "VenusFlytrap.skeleton.rsrc",
  },
  [ItemType.Enemy_Mantis]: {
    modelFile: "Mantis.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Mantis.skeleton.rsrc",
  },
  [ItemType.TurtlePlatform]: {
    modelFile: "Turtle.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Turtle.skeleton.rsrc",
  },
  [ItemType.Smashable]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 5, // JUNGLE_ObjType_Hut (default smashable)
  },
  [ItemType.LeafPlatform]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 9, // LeafPlatform0
  },

  // 56-62: Mixed level items
  [ItemType.HelpBeacon]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 30, // BrainWave
  },
  [ItemType.Teleporter]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 1.5,
    citations: [{ file: "src/Items/Teleporter.c", line: 110, description: "scale = 1.5" }],
  },
  [ItemType.ZipLinePost]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 20, // ZipLinePost + ZipLinePully
    groupSize: 2,
  },
  [ItemType.Enemy_Mutant]: {
    modelFile: "Mutant.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Mutant.skeleton.rsrc",
  },
  [ItemType.Enemy_MutantRobot]: {
    modelFile: "MutantRobot.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "MutantRobot.skeleton.rsrc",
  },
  // HumanScientist (type 61) always uses Scientist skeleton
  // Different from Human which is param-dependent
  // See: Items/HumanScientist.c
  [ItemType.HumanScientist]: {
    modelFile: "Scientist.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Scientist.skeleton.rsrc",
  },
  [ItemType.ProximityMine]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 22,
    scale: 0.6,
    citations: [{ file: "src/Items/Traps.c", line: 1779, description: "scale = .6" }],
  },

  // 63-76: Apocalypse/Cloud level items
  [ItemType.LampPost]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 24,
    scale: 0.8,
    citations: [{ file: "src/Items/Items.c", line: 1833, description: "scale = .8" }],
  },
  [ItemType.DebrisGate]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 27, // DebrisGate_Open
  },
  [ItemType.GraveStone]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 34,
    scale: 0.6,
    citations: [{ file: "src/Items/Items.c", line: 2110, description: "scale = .6" }],
  },
  [ItemType.CrashedShip]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 40,
    scale: 1.4,
    citations: [{ file: "src/Items/Items.c", line: 1873, description: "scale = 1.4" }],
  },
  [ItemType.ChainReactingMine]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 22, // ProximityMine
  },
  [ItemType.Rubble]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 43,
    scale: 2.0,
    citations: [{ file: "src/Items/Items.c", line: 1912, description: "scale = 2.0" }],
  },
  [ItemType.TeleporterMap]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 50,
    scale: 2.0,
    citations: [{ file: "src/Items/Items.c", line: 1955, description: "scale = 2.0" }],
  },
  [ItemType.GreenSteam]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 42, // Shockwave
  },
  [ItemType.TentacleGenerator]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 18, // TentacleGenerator
  },
  [ItemType.PitcherPlantBoss]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 20, // PitcherPod_Pod
  },
  [ItemType.PitcherPod]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 19, // PitcherPod_Stem + Pod
    groupSize: 2,
  },
  [ItemType.TractorBeamPost]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 26, // TractorBeamPost
  },
  [ItemType.Cannon]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 8,
    groupSize: 2,
    scale: 1.9,
    citations: [
      { file: "src/Items/HumanCannonball.c", line: 25, description: "#define CANNON_SCALE 1.9f" },
      { file: "src/Items/HumanCannonball.c", line: 56, description: "scale = CANNON_SCALE" },
    ],
  },

  // 76-90: Cloud level items
  [ItemType.BumperCar]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 10,
    scale: 1.8,
    citations: [
      { file: "src/Items/BumperCar.c", line: 31, description: "#define BUMPERCAR_SCALE 1.8f" },
      { file: "src/Items/BumperCar.c", line: 192, description: "scale = BUMPERCAR_SCALE" },
    ],
  },
  [ItemType.TireBumperStrip]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 12,
    scale: 2.0,
    citations: [{ file: "src/Items/BumperCar.c", line: 839, description: "scale = 2.0" }],
  },
  [ItemType.Enemy_Clown]: {
    modelFile: "Clown.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Clown.skeleton.rsrc",
  },
  [ItemType.Clownfish]: {
    modelFile: "ClownFish.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "ClownFish.skeleton.rsrc",
  },
  [ItemType.BumperCarPowerPost]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 14,
    scale: 1.1,
    citations: [{ file: "src/Items/BumperCar.c", line: 936, description: "scale = 1.1" }],
  },
  // Strongman enemy (type 81)
  [ItemType.Enemy_StrongMan]: {
    modelFile: "Strongman.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "StrongMan.skeleton.rsrc",
  },
  [ItemType.CloudPlatform]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 5, // CloudPlatform
  },
  [ItemType.CloudTunnel]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 6,
    groupSize: 2,
    scale: 8.0,
    citations: [{ file: "src/Items/Items.c", line: 1778, description: "scale = 8.0" }],
  },
  [ItemType.RocketSled]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 26, // RocketSled
  },

  // 83-90: Fire/Ice level items
  [ItemType.LavaPillar]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 1, // LavaPillar_Full
  },
  [ItemType.JawsBot]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 10, // FIREICE_ObjType_JawsBot_Body + Jaw + Wheels
    groupSize: 3,
  },
  [ItemType.HammerBot]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 16, // FIREICE_ObjType_HammerBot_Body + Hammer + Wheels
    groupSize: 3,
  },
  [ItemType.DrillBot]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 22, // FIREICE_ObjType_DrillBot_Body + Drill + Wheels
    groupSize: 3,
  },
  [ItemType.SwingerBot]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 27, // FIREICE_ObjType_SwingerBot_Body + Treads + Pivot + SmallGear + Mace
    groupSize: 5,
  },

  // 92-108: Saucer/Brain boss items
  // IceCube enemy (type 92)
  [ItemType.Enemy_IceCube]: {
    modelFile: "IceCube.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "IceCube.skeleton.rsrc",
  },
  [ItemType.RadarDish]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 8, // DishBase + Dish
    groupSize: 2,
  },
  [ItemType.Beemer]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 2, // SAUCER_ObjType_Beemer
  },
  
  // Additional mappings for items that have models
  // Farm level items (indices from FARM_ObjType enum in mobjtypes.h)
  [ItemType.MetalTub]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 25, // FARM_ObjType_MetalTub
    scale: 5.0,
    citations: [{ file: "src/Items/Items.c", line: 516, description: "scale = 5.0f" }],
  },
  [ItemType.OutHouse]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 26, // FARM_ObjType_OutHouse
    scale: 2.3,
    citations: [{ file: "src/Items/Items.c", line: 546, description: "scale = 2.3f" }],
  },
  [ItemType.Hay]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 30, // FARM_ObjType_HayBrick
    scale: 1.3,
    citations: [{ file: "src/Items/Items.c", line: 607, description: "scale = 1.3" }],
  },
  
  // Fire/Ice level items (indices from FIREICE_ObjType enum in mobjtypes.h)
  [ItemType.LavaStone]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 40, // FIREICE_ObjType_Stone_Blance
  },
  [ItemType.Snowball]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 1.5,
    citations: [
      { file: "src/Items/Traps.c", line: 61, description: "#define SNOWBALL_SCALE_START 1.5f" },
      { file: "src/Items/Traps.c", line: 2091, description: "scale = SNOWBALL_SCALE_START" },
    ],
  },
  [ItemType.LavaPlatform]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 54, // FIREICE_ObjType_LavaPlatform
  },
  [ItemType.IceSaucer]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 6,
    groupSize: 3,
    scale: 2.7,
    citations: [
      { file: "src/Items/IceSaucer.c", line: 29, description: "#define ICE_SAUCER_SCALE 2.7f" },
      { file: "src/Items/IceSaucer.c", line: 72, description: "scale = ICE_SAUCER_SCALE" },
    ],
  },
  
  // Saucer level items (indices from SAUCER_ObjType enum in mobjtypes.h)
  [ItemType.PeopleHut]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 2.0,
    citations: [{ file: "src/Items/Humans.c", line: 1083, description: "scale = 2.0" }],
  },
  [ItemType.Railgun]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 4, // SAUCER_ObjType_RailGun + RailGunBeam
    groupSize: 2,
  },
  [ItemType.Turret]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 6, // SAUCER_ObjType_TurretBase + Turret
    groupSize: 2,
  },
  
  // Cloud level items (indices from CLOUD_ObjType enum in mobjtypes.h)
  [ItemType.TrapDoor]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 27, // CLOUD_ObjType_TrapDoor
  },
  [ItemType.ZigZagSlats]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 28, // CLOUD_ObjType_ZigZag_Blue
  },
  [ItemType.BumperCarGate]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 15,
    groupSize: 2,
    scale: 3.5,
    citations: [{ file: "src/Items/BumperCar.c", line: 1240, description: "scale = 3.5" }],
  },
  
  // Brain boss level items (indices from BRAINBOSS_ObjType enum in mobjtypes.h)
  [ItemType.Enemy_BrainBoss]: {
    modelFile: "level10_brainboss.bg3d",
    modelPath: "models",
    modelIndex: 1, // BRAINBOSS_ObjType_BrainCore
  },
  [ItemType.BlobArrow]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 29, // SLIME_ObjType_BlobArrow
  },
  [ItemType.NeuronStrand]: {
    modelFile: "level10_brainboss.bg3d",
    modelPath: "models",
    modelIndex: 4, // BRAINBOSS_ObjType_NeuronStrand
  },
  [ItemType.BrainPort]: {
    modelFile: "level10_brainboss.bg3d",
    modelPath: "models",
    modelIndex: 5, // BRAINBOSS_ObjType_BrainPort
  },
};
