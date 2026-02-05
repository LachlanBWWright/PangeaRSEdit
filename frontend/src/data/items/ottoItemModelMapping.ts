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

  /** True if model requires skeleton data for rigging */
  requiresSkeleton?: boolean;

  /** Skeleton .rsrc filename */
  skeletonFile?: string;

  /** Scale multiplier for the model (default: 1.0) */
  scale?: number;

  /** Y-axis rotation offset in radians (default: 0) */
  rotationY?: number;
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
    modelIndex: 1, // PowerupOrb
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
    modelIndex: 31, // TeleportBase
  },

  // 11-27: Farm level and global items
  [ItemType.Barn]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 1, // Barn
  },
  [ItemType.Silo]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 2, // Silo
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
    modelIndex: 11, // Tractor
  },
  [ItemType.CornStalk]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 16, // CornStalk
  },
  [ItemType.Sprout]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 17, // CornSprout (first sprout)
  },
  [ItemType.BigLeafPlant]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 20, // BigLeafPlant
  },
  [ItemType.PhonePole]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 22, // PhonePole
  },
  [ItemType.Windmill]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 23, // Windmill
  },
  [ItemType.Rock]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 27, // Rock_Small
  },
  [ItemType.ExitRocket]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 27, // Rocket (correct!)
  },

  // 28-42: Slime level items
  [ItemType.SlimePipe]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 0, // SlimeTube_FancyJ
  },
  [ItemType.FallingCrystal]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 14, // FallingCrystal_Blue
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
    modelIndex: 10, // CrystalCluster_Blue
  },
  [ItemType.InertBubble]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 17, // SoapBubble
  },
  [ItemType.SlimeTree]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 26, // SlimeTree_Big
  },
  [ItemType.MagnetMonster]: {
    modelFile: "MagnetMonster.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "MagnetMonster.skeleton.rsrc",
  },
  [ItemType.FallingSlimePlatform]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 24, // FallingSlimePlatform_Small
  },
  [ItemType.BubblePump]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 19, // BubblePump
  },
  [ItemType.SlimeMech]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 7, // Mech_OnAStick_Pole
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
    modelIndex: 31, // Tube_Bent
  },
  [ItemType.ScaffoldingPost]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 1, // Post0
  },
  [ItemType.JungleGate]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 1, // Gate
  },
  [ItemType.CrunchDoor]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 1, // CrunchDoor_Bottom
  },
  [ItemType.Manhole]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 4, // Manhole
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
    modelFile: "FlyTrap.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "FlyTrap.skeleton.rsrc",
  },
  [ItemType.Enemy_Mantis]: {
    modelFile: "Mantis.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Mantis.skeleton.rsrc",
  },
  [ItemType.TurtlePlatform]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 9, // LeafPlatform0
  },
  [ItemType.Smashable]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 9, // LeafPlatform0
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
    modelIndex: 6, // Teleporter
  },
  [ItemType.ZipLinePost]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 20, // ZipLinePost
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
    modelIndex: 22, // ProximityMine
  },

  // 63-76: Apocalypse/Cloud level items
  [ItemType.LampPost]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 24, // LampPost
  },
  [ItemType.DebrisGate]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 27, // DebrisGate_Open
  },
  [ItemType.GraveStone]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 34, // GraveStone
  },
  [ItemType.CrashedShip]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 40, // CrashedSaucer
  },
  [ItemType.ChainReactingMine]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 22, // ProximityMine
  },
  [ItemType.Rubble]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 43, // Rubble0
  },
  [ItemType.TeleporterMap]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 50, // TeleporterMap0
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
    modelIndex: 20, // PitcherPod_Pod
  },
  [ItemType.TractorBeamPost]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 26, // TractorBeamPost
  },
  [ItemType.Cannon]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 8, // Cannon
  },

  // 76-90: Cloud level items
  [ItemType.BumperCar]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 10, // BumperCar
  },
  [ItemType.TireBumperStrip]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 12, // TireBumper
  },
  [ItemType.Enemy_Clown]: {
    modelFile: "Clown.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Clown.skeleton.rsrc",
  },
  [ItemType.Clownfish]: {
    modelFile: "Clownfish.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Clownfish.skeleton.rsrc",
  },
  [ItemType.BumperCarPowerPost]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 14, // GeneratorBumper
  },
  // Strongman enemy (type 81)
  [ItemType.Enemy_StrongMan]: {
    modelFile: "Strongman.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Strongman.skeleton.rsrc",
  },
  [ItemType.CloudPlatform]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 5, // CloudPlatform
  },
  [ItemType.CloudTunnel]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 6, // CloudTunnel_Frame
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
    modelFile: "JawsBot.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "JawsBot.skeleton.rsrc",
  },
  [ItemType.HammerBot]: {
    modelFile: "HammerBot.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "HammerBot.skeleton.rsrc",
  },
  [ItemType.DrillBot]: {
    modelFile: "DrillBot.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "DrillBot.skeleton.rsrc",
  },
  [ItemType.SwingerBot]: {
    modelFile: "SwingerBot.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "SwingerBot.skeleton.rsrc",
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
    modelIndex: 8, // DishBase
  },
  [ItemType.Beemer]: {
    modelFile: "Beemer.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Beemer.skeleton.rsrc",
  },
  
  // Additional mappings for items that have models
  // Farm level items
  [ItemType.MetalTub]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 12, // MetalTub
  },
  [ItemType.OutHouse]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 13, // OutHouse
  },
  [ItemType.Hay]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 14, // HayBale
  },
  
  // Fire/Ice level items
  [ItemType.LavaStone]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 4, // LavaStone
  },
  [ItemType.Snowball]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 10, // Snowball
  },
  [ItemType.LavaPlatform]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 6, // LavaPlatform
  },
  [ItemType.IceSaucer]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 8, // IceSaucer
  },
  [ItemType.Smoker]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 12, // Smoker
  },
  
  // Saucer level items
  [ItemType.PeopleHut]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 4, // PeopleHut
  },
  [ItemType.Railgun]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 12, // Railgun
  },
  [ItemType.Turret]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 14, // Turret
  },
  [ItemType.RunwayLights]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 16, // RunwayLights
  },
  
  // Cloud level items
  [ItemType.TrapDoor]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 18, // TrapDoor
  },
  [ItemType.ZigZagSlats]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 20, // ZigZagSlats
  },
  [ItemType.BumperCarGate]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 16, // BumperCarGate
  },
  
  // Brain boss level items
  [ItemType.Enemy_BrainBoss]: {
    modelFile: "level10_brainboss.bg3d",
    modelPath: "models",
    modelIndex: 0, // BrainBoss
  },
  [ItemType.BlobArrow]: {
    modelFile: "level10_brainboss.bg3d",
    modelPath: "models",
    modelIndex: 2, // BlobArrow
  },
  [ItemType.NeuronStrand]: {
    modelFile: "level10_brainboss.bg3d",
    modelPath: "models",
    modelIndex: 4, // NeuronStrand
  },
  [ItemType.BrainPort]: {
    modelFile: "level10_brainboss.bg3d",
    modelPath: "models",
    modelIndex: 6, // BrainPort
  },
};
