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
import type { UniversalItemModelMapping } from "./itemModelTypes";
import { ROTATION_2_WAY, ROTATION_4_WAY, ROTATION_8_WAY, ROTATION_16_WAY, ROTATION_PI_STEP } from "./standardParamTypes";

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
  UniversalItemModelMapping | undefined
> = {
  // 0: StartCoords (no visual model)

  // 1-10: Basic plants and early enemies
  [ItemType.BasicPlant]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 21,
    scale: 3.0,
    citations: [
      { file: "src/Items/Items.c", line: 401, endLine: 445, description: "scale varies 2.0-4.5 by type, using ~3.0 average" },
    ],
  },
  [ItemType.SpacePodGenerator]: undefined,
  [ItemType.Enemy_Squooshy]: {
    modelFile: "Squooshy.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Squooshy.skeleton.rsrc",
    scale: 2.5,
    yOffset: 250,
    citations: [{ file: "src/Enemies/FireIce/Enemy_Squooshy.c", line: 46, description: "#define SQUOOSHY_SCALE 2.5f" }],
  },
  // Human (type 4) is a PARAM-DEPENDENT item!
  // The model file changes based on p1 parameter:
  // p1=0: Farmer, p1=1: BeeWoman, p1=2: Scientist, p1=3: SkirtLady
  // This mapping serves as a fallback - actual selection happens in OttoItemMapper.getMapping()
  // See: Items/Humans.c - MakeHuman() function uses itemPtr->parm[1] for type
  [ItemType.Human]: undefined, // Param-dependent - handled by mapper
  // Atom (type 5) uses CUSTOM_GENRE + DrawAtom (sprite rendering), not a BG3D model
  [ItemType.Atom]: undefined,
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
    scale: 1.7,
    yOffset: 170,
    citations: [{ file: "src/Enemies/Enemy_BrainAlien.c", line: 43, description: "#define BRAINALIEN_SCALE 1.7f" }],
  },
  // Farm enemies (Onion, Corn, Tomato) - skeletal characters
  [ItemType.Enemy_Onion]: {
    modelFile: "Onion.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Onion.skeleton.rsrc",
    scale: 2.0,
    yOffset: 200,
    citations: [{ file: "src/Enemies/Farm/Enemy_Onion.c", line: 47, description: "#define ONION_SCALE 2.0f" }],
  },
  [ItemType.Enemy_Corn]: {
    modelFile: "Corn.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Corn.skeleton.rsrc",
    scale: 1.7,
    yOffset: 170,
    citations: [{ file: "src/Enemies/Farm/Enemy_Corn.c", line: 47, description: "#define CORN_SCALE 1.7f" }],
  },
  [ItemType.Enemy_Tomato]: {
    modelFile: "Tomato.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Tomato.skeleton.rsrc",
    scale: 1.3,
    yOffset: 130,
    citations: [{ file: "src/Enemies/Farm/Enemy_Tomato.c", line: 46, description: "#define TOMATO_SCALE 1.3f" }],
  },
  [ItemType.Checkpoint]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 31,
    groupSize: 2,
    scale: 5.0,
    citations: [{ file: "src/Items/Triggers.c", line: 691, description: "scale = 5.0" }],
  },

  // 11-27: Farm level and global items
  [ItemType.Barn]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 1.5,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY },
    citations: [{ file: "src/Items/Items.c", line: 146, description: "scale = 1.5; parm[0] * (PI/2) sets rotation (0-3)" }],
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
    modelIndex: 3,
    scale: 1.5,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_2_WAY },
    citations: [
      { file: "src/Items/Triggers.c", line: 49, description: "#define WOODFENCE_SCALE 1.5f" },
      { file: "src/Items/Triggers.c", line: 206, description: "scale = WOODFENCE_SCALE; parm[0]==1 sets PI/2 rotation (0=0°, 1=90°)" },
    ],
  },
  [ItemType.MetalGate]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 1.3,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_2_WAY },
    citations: [
      { file: "src/Items/Triggers.c", line: 50, description: "#define METALFENCE_SCALE 1.3f" },
      { file: "src/Items/Triggers.c", line: 444, description: "scale = METALFENCE_SCALE; parm[0]==1 sets PI/2 rotation (0=0°, 1=90°)" },
    ],
  },
  [ItemType.FencePost]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 9,
    scale: 1.2,
    citations: [
      { file: "src/Items/Items.c", line: 630, endLine: 641, description: "scale varies by type: 1.2 (wood), 0.9 (metal), 4.0 (jungle), etc." },
      { file: "src/Items/Items.c", line: 669, description: "scale = scale[type]" },
    ],
  },
  [ItemType.Tractor]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 11,
    groupSize: 5,
    scale: 1.0,
    citations: [
      { file: "src/Enemies/Farm/Enemy_Tractor.c", line: 31, description: "#define TRACTOR_SCALE 1.0f" },
      { file: "src/Enemies/Farm/Enemy_Tractor.c", line: 78, description: "scale = TRACTOR_SCALE" },
    ],
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
    rotationParam: { paramIndex: 0, rotationType: ROTATION_PI_STEP },
    citations: [{ file: "src/Items/Items.c", line: 208, description: "scale = 4.0; parm[0] * PI sets rotation (0° or 180°)" }],
  },
  [ItemType.Windmill]: {
    modelFile: "level1_farm.bg3d",
    modelPath: "models",
    modelIndex: 23,
    groupSize: 2,
    scale: 4.0,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY },
    citations: [
      { file: "src/Items/Items.c", line: 44, description: "#define WINDMILL_SCALE 4.0f" },
      { file: "src/Items/Items.c", line: 709, description: "scale = WINDMILL_SCALE; parm[0] * (PI/2) sets rotation (0-3)" },
    ],
  },
  // Rock: param-dependent (p0=0→Small, p0=1→Medium, p0=2→Large); handled by OttoItemMapper
  [ItemType.Rock]: undefined,
  [ItemType.ExitRocket]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 27,
    groupSize: 2,
    scale: 0.8,
    citations: [
      { file: "src/Player/Player.c", line: 40, description: "#define ROCKET_SCALE .8f" },
      { file: "src/Player/Player.c", line: 604, description: "scale = ROCKET_SCALE" },
    ],
  },

  // 28-42: Slime level items
  [ItemType.SlimePipe]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 0, // SlimeTube_FancyJ
    scale: 2.0,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
    citations: [{ file: "src/Items/Items.c", line: 775, description: "scale = s = 2.0; parm[1] * (PI2/8) sets rotation (PI/4 per step)" }],
  },
  [ItemType.FallingCrystal]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 14,
    scale: 2.5,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
    citations: [
      { file: "src/Items/Traps.c", line: 57, description: "#define FALLING_CRYSTAL_SCALE 2.5f" },
      { file: "src/Items/Traps.c", line: 125, description: "scale = FALLING_CRYSTAL_SCALE; parm[0] * (PI2/8.0f) sets rotation (PI/4 per step)" },
    ],
  },
  [ItemType.Enemy_Blob]: {
    modelFile: "Blob.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Blob.skeleton.rsrc",
    scale: 2.4,
    yOffset: 240,
    citations: [
      { file: "src/Enemies/Slime/Enemy_Blob.c", line: 37, description: "#define BLOB_SCALE 2.4f" },
      { file: "src/Enemies/Slime/Enemy_Blob.c", line: 120, description: "scale = BLOB_SCALE" },
    ],
  },
  [ItemType.BumperBubble]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 16,
    scale: 1.5,
    citations: [
      { file: "src/Items/Triggers.c", line: 46, description: "#define BUMPERBUBBLE_SCALE 1.5f" },
      { file: "src/Items/Triggers.c", line: 944, description: "scale = BUMPERBUBBLE_SCALE" },
    ],
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
    modelIndex: 21,
    groupSize: 2,
    scale: 4.0,
    citations: [{ file: "src/Items/Traps.c", line: 865, description: "scale = 4.0" }],
  },
  [ItemType.FallingSlimePlatform]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 24,
    scale: 2.0,
    citations: [{ file: "src/Items/Triggers.c", line: 1102, description: "scale = s = 2.0f" }],
  },
  [ItemType.BubblePump]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 19,
    groupSize: 2,
    scale: 2.0,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY },
    citations: [{ file: "src/Items/Traps.c", line: 440, description: "scale = 2.0; parm[0] * (PI2/4.0f) sets rotation (PI/2 per step)" }],
  },
  [ItemType.SlimeMech]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 7,
    groupSize: 2,
    scale: 2.5,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY },
    citations: [{ file: "src/Items/Items.c", line: 1161, description: "scale = s = 2.5f; parm[0] * (PI/2) sets rotation" }],
  },
  [ItemType.SpinningPlatform]: {
    modelFile: "level3_blobboss.bg3d",
    modelPath: "models",
    modelIndex: 1, // BLOBBOSS_ObjType_BarPlatform_Blue (default parm[0]=0; type is BLOBBOSS_ObjType_BarPlatform_Blue + parm[0])
    scale: 2.0,
    citations: [{ file: "src/Items/Triggers.c", line: 1357, description: "scale = s = 2.0f" }],
  },
  [ItemType.MovingPlatform]: {
    modelFile: "level3_blobboss.bg3d",
    modelPath: "models",
    modelIndex: 21,
    scale: 2.0,
    citations: [{ file: "src/Items/Items.c", line: 1602, description: "scale = s = 2.0" }],
  },
  // MachineBoss (type 41): NilAdd in Terrain2.c — the blob boss machine is spawned internally
  // by MakeBlobBossMachine(), never placed as a static terrain item
  [ItemType.MachineBoss]: undefined,

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
    modelIndex: 1,
    scale: 3.0,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY },
    citations: [
      { file: "src/Items/Triggers2.c", line: 36, description: "#define JUNGLEGATE_SCALE 3.0f" },
      { file: "src/Items/Triggers2.c", line: 77, description: "scale = JUNGLEGATE_SCALE; parm[0] * (PI/2) sets rotation (0-3 values)" },
    ],
  },
  [ItemType.CrunchDoor]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 1,
    groupSize: 3,
    scale: 5.0,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY },
    citations: [{ file: "src/Items/Traps.c", line: 1204, description: "scale = 5.0; parm[0] * (PI/2) sets rotation" }],
  },
  [ItemType.Manhole]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 0.5,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY },
    citations: [{ file: "src/Items/Traps.c", line: 1506, description: "scale = .5; parm[0] * (PI/2) sets rotation" }],
  },
  [ItemType.Enemy_Flamester]: {
    modelFile: "Flamester.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Flamester.skeleton.rsrc",
    scale: 2.1,
    yOffset: 210,
    citations: [{ file: "src/Enemies/FireIce/Enemy_Flamester.c", line: 43, description: "#define FLAMESTER_SCALE_NORMAL 2.1f" }],
  },
  [ItemType.Enemy_GiantLizard]: {
    modelFile: "GiantLizard.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "GiantLizard.skeleton.rsrc",
    scale: 2.5,
    yOffset: 250,
    citations: [{ file: "src/Enemies/Jungle/Enemy_GiantLizard.c", line: 53, description: "#define GIANTLIZARD_SCALE 2.5f" }],
  },
  [ItemType.Enemy_FlyTrap]: {
    modelFile: "VenusFlytrap.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "VenusFlytrap.skeleton.rsrc",
    scale: 2.6,
    yOffset: 260,
    citations: [{ file: "src/Enemies/Jungle/Enemy_Flytrap.c", line: 36, description: "#define FLYTRAP_SCALE 2.6f" }],
  },
  [ItemType.Enemy_Mantis]: {
    modelFile: "Mantis.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Mantis.skeleton.rsrc",
    scale: 2.1,
    yOffset: 210,
    citations: [{ file: "src/Enemies/Jungle/Enemy_Mantis.c", line: 45, description: "#define MANTIS_SCALE 2.1f" }],
  },
  [ItemType.TurtlePlatform]: {
    modelFile: "Turtle.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Turtle.skeleton.rsrc",
    scale: 2.5,
    yOffset: 250,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
    citations: [{ file: "src/Items/Triggers2.c", line: 266, description: "scale = 2.5; parm[0] * (PI2/8.0f) sets rotation (PI/4 per step)" }],
  },
  [ItemType.Smashable]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 3.0,
    citations: [{ file: "src/Items/Triggers2.c", line: 366, description: "scale = 3.0" }],
  },
  [ItemType.LeafPlatform]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 9,
    scale: 4.0,
    citations: [{ file: "src/Items/Triggers2.c", line: 431, description: "scale = 4.0" }],
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
    rotationParam: { paramIndex: 2, rotationType: ROTATION_8_WAY },
    citations: [{ file: "src/Items/Teleporter.c", line: 110, description: "scale = 1.5; parm[2] * (PI2/8.0f) sets rotation (PI/4 per step)" }],
  },
  [ItemType.ZipLinePost]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 20,
    groupSize: 2,
    scale: 1.5,
    citations: [{ file: "src/Items/ZipLine.c", line: 209, description: "scale = 1.5" }],
  },
  [ItemType.Enemy_Mutant]: {
    modelFile: "Mutant.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Mutant.skeleton.rsrc",
    scale: 1.2,
    yOffset: 120,
    citations: [{ file: "src/Enemies/Apocalypse/Enemy_Mutant.c", line: 46, description: "#define MUTANT_SCALE 1.2f" }],
  },
  [ItemType.Enemy_MutantRobot]: {
    modelFile: "MutantRobot.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "MutantRobot.skeleton.rsrc",
    scale: 1.9,
    yOffset: 190,
    citations: [{ file: "src/Enemies/Apocalypse/Enemy_MutantRobot.c", line: 46, description: "#define MUTANTROBOT_SCALE 1.9f" }],
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
    scale: 2.0,
    yOffset: 200,
    citations: [
      { file: "src/Items/Humans.c", line: 35, description: "#define HUMAN_SCALE (2.0f * gHumanScaleRatio)" },
      { file: "src/Items/Humans.c", line: 267, description: "scale = HUMAN_SCALE" },
    ],
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
    modelIndex: 27,
    scale: 2.5,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_2_WAY },
    citations: [
      { file: "src/Items/Triggers2.c", line: 38, description: "#define DEBRISGATE_SCALE 2.5f" },
      { file: "src/Items/Triggers2.c", line: 599, description: "scale = DEBRISGATE_SCALE; parm[1]==1 sets PI/2 rotation" },
    ],
  },
  [ItemType.GraveStone]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 34,
    scale: 0.6,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_4_WAY },
    citations: [{ file: "src/Items/Items.c", line: 2110, description: "scale = .6; parm[1] * (PI2/4.0f) sets rotation (PI/2 per step)" }],
  },
  [ItemType.CrashedShip]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 40,
    scale: 1.4,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_4_WAY },
    citations: [{ file: "src/Items/Items.c", line: 1873, description: "scale = 1.4; parm[1] * (PI2/4.0f) sets rotation (PI/2 per step)" }],
  },
  [ItemType.ChainReactingMine]: {
    modelFile: "level4_apocalypse.bg3d",
    modelPath: "models",
    modelIndex: 22,
    scale: 0.6,
    citations: [{ file: "src/Items/Triggers2.c", line: 766, description: "scale = s = .6" }],
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
    modelIndex: 18,
    scale: 5.0,
    citations: [{ file: "src/Enemies/Jungle/PitcherPlantBoss.c", line: 218, description: "scale = 5.0" }],
  },
  // PitcherPlantBoss uses SKELETON_TYPE_PITCHERPLANT (PitcherPlant.bg3d).
  // The game adds JUNGLE_ObjType_PitcherPlant_Grass as a chain node decoration.
  [ItemType.PitcherPlantBoss]: {
    modelFile: "PitcherPlant.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "PitcherPlant.skeleton.rsrc",
    scale: 9.5,
    yOffset: 950,
    citations: [
      { file: "src/Enemies/Jungle/PitcherPlantBoss.c", line: 96, description: "#define PITCHER_PLANT_SCALE 9.5f" },
      { file: "src/Enemies/Jungle/PitcherPlantBoss.c", line: 686, description: "scale = PITCHER_PLANT_SCALE" },
    ],
  },
  [ItemType.PitcherPod]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 19,
    groupSize: 2,
    scale: 2.5,
    citations: [{ file: "src/Enemies/Jungle/PitcherPlantBoss.c", line: 935, description: "scale = 2.5f + Random" }],
  },
  [ItemType.TractorBeamPost]: {
    modelFile: "level6_jungle.bg3d",
    modelPath: "models",
    modelIndex: 26,
    scale: 1.2,
    citations: [{ file: "src/Enemies/Jungle/PitcherPlantBoss.c", line: 1331, description: "scale = 1.2" }],
  },
  [ItemType.Cannon]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 8,
    groupSize: 2,
    scale: 1.9,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY },
    citations: [
      { file: "src/Items/HumanCannonball.c", line: 25, description: "#define CANNON_SCALE 1.9f" },
      { file: "src/Items/HumanCannonball.c", line: 56, description: "scale = CANNON_SCALE; parm[0] * (PI2/4.0f) sets rotation (PI/2 per step)" },
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
    rotationParam: { paramIndex: 1, rotationType: ROTATION_4_WAY },
    citations: [{ file: "src/Items/BumperCar.c", line: 839, description: "scale = 2.0; parm[1] * (PI2/4.0f) sets rotation (PI/2 per step)" }],
  },
  [ItemType.Enemy_Clown]: {
    modelFile: "Clown.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "Clown.skeleton.rsrc",
    scale: 2.2,
    yOffset: 220,
    citations: [{ file: "src/Enemies/Cloud/Enemy_Clown.c", line: 48, description: "#define CLOWN_SCALE 2.2f" }],
  },
  [ItemType.Clownfish]: {
    modelFile: "ClownFish.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "ClownFish.skeleton.rsrc",
    scale: 2.0,
    yOffset: 200,
    citations: [{ file: "src/Enemies/Cloud/Enemy_ClownFish.c", line: 39, description: "#define CLOWNFISH_SCALE 2.0f" }],
  },
  [ItemType.BumperCarPowerPost]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 13, // CLOUD_ObjType_Generator (main post); GeneratorBumper (14) is a chain node
    groupSize: 2,
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
    scale: 2.0,
    yOffset: 200,
    citations: [{ file: "src/Enemies/Cloud/Enemy_StrongMan.c", line: 45, description: "#define STRONGMAN_SCALE 2.0f" }],
  },
  [ItemType.CloudPlatform]: undefined,
  [ItemType.CloudTunnel]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 6,
    groupSize: 2,
    scale: 8.0,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY },
    citations: [{ file: "src/Items/Items.c", line: 1778, description: "scale = 8.0; parm[0] * (PI/2) sets rotation" }],
  },
  [ItemType.RocketSled]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 26,
    scale: 1.3,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
    citations: [
      { file: "src/Items/RocketSled.c", line: 27, description: "#define ROCKETSLED_SCALE 1.3f" },
      { file: "src/Items/RocketSled.c", line: 68, description: "scale = ROCKETSLED_SCALE; parm[0] * (PI2/8) sets rotation (PI/4 per step)" },
    ],
  },

  // 83-90: Fire/Ice level items
  [ItemType.LavaPillar]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 8.0,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
    citations: [
      { file: "src/Items/Volcano.c", line: 39, description: "#define LAVA_PILLAR_SCALE 8.0f" },
      { file: "src/Items/Volcano.c", line: 68, description: "scale = LAVA_PILLAR_SCALE; parm[0] * (PI2/8.0f) sets rotation (type also encodes orientation)" },
    ],
  },
  [ItemType.JawsBot]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 10,
    groupSize: 3,
    scale: 15.0,
    citations: [
      { file: "src/Enemies/FireIce/Enemy_JawsBot.c", line: 40, description: "#define JAWSBOT_SCALE 15.0f" },
      { file: "src/Enemies/FireIce/Enemy_JawsBot.c", line: 116, description: "scale = JAWSBOT_SCALE" },
    ],
  },
  [ItemType.HammerBot]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 16,
    groupSize: 3,
    scale: 2.5,
    citations: [
      { file: "src/Enemies/FireIce/Enemy_HammerBot.c", line: 42, description: "#define HAMMERBOT_SCALE 2.5f" },
      { file: "src/Enemies/FireIce/Enemy_HammerBot.c", line: 124, description: "scale = HAMMERBOT_SCALE" },
    ],
  },
  [ItemType.DrillBot]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 22,
    groupSize: 3,
    scale: 1.5,
    citations: [
      { file: "src/Enemies/FireIce/Enemy_DrillBot.c", line: 42, description: "#define DRILLBOT_SCALE 1.5f" },
      { file: "src/Enemies/FireIce/Enemy_DrillBot.c", line: 128, description: "scale = DRILLBOT_SCALE" },
    ],
  },
  [ItemType.SwingerBot]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 27,
    groupSize: 5,
    scale: 1.0,
    citations: [
      { file: "src/Enemies/FireIce/Enemy_SwingerBot.c", line: 41, description: "#define SWINGERBOT_SCALE 1.0f" },
      { file: "src/Enemies/FireIce/Enemy_SwingerBot.c", line: 123, description: "scale = SWINGERBOT_SCALE" },
    ],
  },

  // 92-108: Saucer/Brain boss items
  // IceCube enemy (type 92)
  [ItemType.Enemy_IceCube]: {
    modelFile: "IceCube.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "IceCube.skeleton.rsrc",
    scale: 2.5,
    yOffset: 250,
    citations: [{ file: "src/Enemies/FireIce/Enemy_IceCube.c", line: 54, description: "#define ICECUBE_SCALE_NORMAL 2.5f" }],
  },
  [ItemType.RadarDish]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 8,
    groupSize: 2,
    scale: 1.0,
    citations: [{ file: "src/Items/items2.c", line: 383, description: "scale = 1.0" }],
  },
  [ItemType.Beemer]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 1.3,
    citations: [
      { file: "src/Items/Traps2.c", line: 31, description: "#define BEEMER_SCALE 1.3f" },
      { file: "src/Items/Traps2.c", line: 72, description: "scale = BEEMER_SCALE" },
    ],
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
  // Hay: param-dependent (p0=0→Brick, p0=1→Cylinder); handled by OttoItemMapper
  [ItemType.Hay]: undefined,
  
  // Fire/Ice level items (indices from FIREICE_ObjType enum in mobjtypes.h)
  [ItemType.LavaStone]: {
    modelFile: "level8_fireice.bg3d",
    modelPath: "models",
    modelIndex: 40,
    scale: 2.5,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_16_WAY },
    citations: [
      { file: "src/Items/items2.c", line: 31, description: "#define LAVA_STONE_SCALE 2.5f" },
      { file: "src/Items/items2.c", line: 288, description: "scale = LAVA_STONE_SCALE; parm[1] * (PI2/16) sets rotation (PI/8 per step)" },
    ],
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
    modelIndex: 54,
    scale: 4.2,
    citations: [{ file: "src/Items/Volcano.c", line: 756, description: "scale = 4.2f" }],
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
    modelIndex: 4,
    groupSize: 2,
    scale: 1.0,
    citations: [
      { file: "src/Items/Traps2.c", line: 33, description: "#define RAIL_GUN_SCALE 1.0f" },
      { file: "src/Items/Traps2.c", line: 204, description: "scale = RAIL_GUN_SCALE" },
    ],
  },
  [ItemType.Turret]: {
    modelFile: "level9_saucer.bg3d",
    modelPath: "models",
    modelIndex: 6,
    groupSize: 2,
    scale: 1.0,
    citations: [
      { file: "src/Items/Traps2.c", line: 35, description: "#define TURRET_SCALE 1.0f" },
      { file: "src/Items/Traps2.c", line: 360, description: "scale = TURRET_SCALE" },
    ],
  },
  
  // Cloud level items (indices from CLOUD_ObjType enum in mobjtypes.h)
  [ItemType.TrapDoor]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 27,
    scale: 225.0,
    citations: [{ file: "src/Items/Triggers2.c", line: 1076, description: "scale = TERRAIN_POLYGON_SIZE (225.0f)" }],
  },
  [ItemType.ZigZagSlats]: {
    modelFile: "level5_cloud.bg3d",
    modelPath: "models",
    modelIndex: 28,
    scale: 3.0,
    citations: [{ file: "src/Items/items2.c", line: 75, description: "scale = 3" }],
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
    modelIndex: 1,
    scale: 5.0,
    citations: [
      { file: "src/Enemies/Enemy_BrainBoss.c", line: 46, description: "#define BRAINBOSS_SCALE 5.0f" },
      { file: "src/Enemies/Enemy_BrainBoss.c", line: 185, description: "scale = BRAINBOSS_SCALE" },
    ],
  },
  [ItemType.BlobArrow]: {
    modelFile: "level2_slime.bg3d",
    modelPath: "models",
    modelIndex: 29,
    scale: 1.6,
    citations: [{ file: "src/Items/items2.c", line: 444, description: "scale = 1.6" }],
  },
  [ItemType.NeuronStrand]: {
    modelFile: "level10_brainboss.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 9.0,
    citations: [{ file: "src/Items/items2.c", line: 476, description: "scale = 9.0" }],
  },
  [ItemType.BrainPort]: {
    modelFile: "level10_brainboss.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 3.5,
    // parm[0] is both the portal ID (0-7) and encodes the portal's angular position around the brain boss arena
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
    citations: [{ file: "src/Enemies/Enemy_BrainBoss.c", line: 995, description: "scale = 3.5; parm[0] is portal ID (0-7) which also determines angular placement (PI2/8 per step)" }],
  },
};
