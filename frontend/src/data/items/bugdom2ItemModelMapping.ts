/**
 * Bugdom 2 Item Type to 3D Model Mapping
 *
 * Maps each item type to its corresponding BG3D model file and mesh information.
 * Extracted from Bugdom 2 source code:
 * - /games/bugdom2/Source/Headers/mobjtypes.h
 *
 * Bugdom 2 organizes models into several level-specific and global files:
 * - garden.bg3d (GARDEN level 1)
 * - sidewalk.bg3d (SIDEWALK level 2)
 * - plumbing.bg3d (PLUMBING level 4)
 * - playroom.bg3d (PLAYROOM level 5)
 * - closet.bg3d (CLOSET level 6)
 * - gutter.bg3d (GUTTER level 7)
 * - garbage.bg3d (GARBAGE level 8)
 * - balsa.bg3d (BALSA level 9)
 * - park.bg3d (PARK level 10)
 * - global.bg3d (GLOBAL items)
 * - foliage.bg3d (FOLIAGE items)
 */

/**
 * Describes how to load and render a 3D model for a Bugdom 2 item type
 */
export interface Bugdom2ItemModelMapping {
  /** BG3D filename (e.g., "garden.bg3d", "global.bg3d") */
  modelFile: string;

  /** Subdirectory in /games/bugdom2/ */
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
 * Comprehensive mapping of all Bugdom 2 item types to their 3D models
 *
 * Model files by level:
 * - Global.bg3d: Global items used across all levels
 * - Foliage.bg3d: Plants and foliage
 * - Level1_Garden.bg3d: Garden level items
 * - Level2_Sidewalk.bg3d: Sidewalk level items
 * - Level4_Plumbing.bg3d: Plumbing level items
 * - Level5_Playroom.bg3d: Playroom level items
 * - Level6_Closet.bg3d: Closet level items
 * - Level7_Gutter.bg3d: Gutter level items
 * - Level8_Garbage.bg3d: Garbage level items
 * - Level9_Balsa.bg3d: Balsa level items
 * - Level10_Park.bg3d: Park level items
 *
 * Skeleton files for enemies (in /skeletons/):
 * - Snail.bg3d, Gnome.bg3d, HouseFly.bg3d, EvilPlant.bg3d, etc.
 *
 * Current coverage: 70+/86 items
 */
export const BUGDOM2_ITEM_MODEL_MAPPINGS: Record<
  number,
  Bugdom2ItemModelMapping | undefined
> = {
  // Enemies with skeleton models (character-type enemies)
  // 1: Snail
  1: { modelFile: "Snail.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Snail.skeleton.rsrc" },
  // 4: Gnome enemy
  4: { modelFile: "Gnome.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Gnome.skeleton.rsrc" },
  // 10: HouseFly enemy
  10: { modelFile: "HouseFly.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "HouseFly.skeleton.rsrc" },
  // 12: Evil Plant enemy
  12: { modelFile: "EvilPlant.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "EvilPlant.skeleton.rsrc" },
  // 19: Chipmunk (friendly NPC)
  19: { modelFile: "Chipmunk.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Chipmunk.skeleton.rsrc" },
  // 38: Flea enemy
  38: { modelFile: "Flea.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Flea.skeleton.rsrc" },
  // 39: Tick enemy
  39: { modelFile: "Tick.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Tick.skeleton.rsrc" },
  // 43: Toy Soldier enemy
  43: { modelFile: "Soldier.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Soldier.skeleton.rsrc" },
  // 45: Otto enemy (toy version)
  45: { modelFile: "OttoToy.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "OttoToy.skeleton.rsrc" },
  // 52: Dragonfly enemy
  52: { modelFile: "DragonFly.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "DragonFly.skeleton.rsrc" },
  // 54: Frog enemy
  54: { modelFile: "Frog.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Frog.skeleton.rsrc" },
  // 60: Moth enemy
  60: { modelFile: "Moth.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Moth.skeleton.rsrc" },
  // 61: Computer Bug enemy
  61: { modelFile: "ComputerBug.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "ComputerBug.skeleton.rsrc" },
  // 65: Roach enemy
  65: { modelFile: "Roach.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Roach.skeleton.rsrc" },
  // 68: Ant enemy
  68: { modelFile: "Ant.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Ant.skeleton.rsrc" },
  // 69: Fish enemy
  69: { modelFile: "Fish.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Fish.skeleton.rsrc" },

  // Non-enemy skeleton models
  // 42: Mouse Trap (animated)
  42: { modelFile: "MouseTrap.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "MouseTrap.skeleton.rsrc" },

  // Foliage items (Foliage.bg3d - MODEL_GROUP_FOLIAGE)
  // 5: Daisy (FOLIAGE_ObjType_Daisy1 = 0, param selects Daisy1-3)
  5: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 0 },
  // 6: Grass (FOLIAGE_ObjType_Grass1 = 7, param selects Grass1-3)
  6: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 7 },
  // 8: Tulip (FOLIAGE_ObjType_Tulip1 = 3, param selects Tulip1-4)
  8: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 3 },

  // Garden level items (Level1_Garden.bg3d - MODEL_GROUP_LEVELSPECIFIC)
  // 11: Scarecrow (GARDEN_ObjType_ScarecrowBody = 8, + Shirt + Head)
  11: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 8 },
  // 29: Rose (FOLIAGE_ObjType_Rose = 11)
  29: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 11 },
  // 30: Tulip Pot (SIDEWALK_ObjType_TulipPot = 30)
  30: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 30 },
  // 28: Windmill (SIDEWALK_ObjType_WindmillBase = 28)
  28: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 28 },

  // Sidewalk level items (Level2_Sidewalk.bg3d - MODEL_GROUP_LEVELSPECIFIC)
  // 17: Brick (SIDEWALK_ObjType_Brick = 8)
  17: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 8 },
  // 18: Post (SIDEWALK_ObjType_Post_Brick = 12)
  18: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 12 },
  // 21: Pebble (SIDEWALK_ObjType_LargeStone = 9)
  21: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 9 },
  // 23: Pool Coping (SIDEWALK_ObjType_Coping = 20)
  23: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 20 },
  // 24: Pool Leaf (SIDEWALK_ObjType_PoolLeaf1 = 16)
  24: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 16 },
  // 27: Dog House (SIDEWALK_ObjType_DogHouse = 27)
  27: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 27 },
  // 31: Beach Ball (SIDEWALK_ObjType_BeachBall = 22)
  31: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 22 },
  // 32: Chlorine Float (SIDEWALK_ObjType_ChlorineFloat = 23)
  32: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 23 },
  // 33: Pool Ring Float (SIDEWALK_ObjType_PoolRingFloat = 24)
  33: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 24 },
  // 34: Drain Pipe (SIDEWALK_ObjType_DrainPipe = 31)
  34: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 31 },

  // Playroom level items (Level5_Playroom.bg3d - MODEL_GROUP_LEVELSPECIFIC)
  // 14: Ride Ball (SIDEWALK_ObjType_RideBall = 15 on Sidewalk level)
  14: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 15 },
  // 15: Bowling Marble (PLAYROOM_ObjType_MarbleShell = 6)
  15: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 6 },
  // 41: Letter Block (PLAYROOM_ObjType_LetterBlock1 = 1)
  41: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 1 },
  // 40: Slot Car (PLAYROOM_ObjType_SlotCarRed = 11)
  40: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 11 },
  // 46: Puzzle (PLAYROOM_ObjType_PuzzleMain = 20)
  46: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 20 },
  // 47: Lego Wall (PLAYROOM_ObjType_LegoWall = 24)
  47: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 24 },

  // Closet level items (Level6_Closet.bg3d - MODEL_GROUP_LEVELSPECIFIC)
  // 48: Flashlight (CLOSET_ObjType_FlashLight = 0)
  48: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 0 },
  // 49: D-Cell battery (CLOSET_ObjType_Battery = 24)
  49: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 24 },
  // 50: Crayon - Playroom item (PLAYROOM_ObjType_Crayon = 19)
  50: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 19 },
  // 55: Cardboard Box (CLOSET_ObjType_CardboardBox1 = 2)
  55: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 2 },
  // 57: Moth Ball (CLOSET_ObjType_MothBall = 10)
  57: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 10 },
  // 58: Vacuum (CLOSET_ObjType_Vacuume = 11)
  58: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 11 },
  // 59: Closet Wall / PCI Card (CLOSET_ObjType_PCICard = 13)
  59: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 13 },
  // 62: Silicon Part (CLOSET_ObjType_SiliconDoor = 21)
  62: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 21 },
  // 64: Book Stack (CLOSET_ObjType_BookStack = 17)
  64: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 17 },
  // 66: Shoe Box (CLOSET_ObjType_ShoeBox = 6)
  66: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 6 },
  // 67: Picture Frame (CLOSET_ObjType_PictureFrame_Brian = 28)
  67: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 28 },

  // Gutter level items (Level7_Gutter.bg3d)
  // Items specific to gutter level

  // Garbage level items (Level8_Garbage.bg3d - MODEL_GROUP_LEVELSPECIFIC)
  // 79: Soda Can (GARBAGE_ObjType_Can = 1)
  79: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 1 },
  // 81: Jar (GARBAGE_ObjType_Jar = 8)
  81: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 8 },
  // 82: Tin Can (GARBAGE_ObjType_TinCan = 10)
  82: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 10 },
  // 83: Detergent (GARBAGE_ObjType_Detergent = 11)
  83: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 11 },

  // Balsa level items (Level9_Balsa.bg3d - MODEL_GROUP_LEVELSPECIFIC)
  // 51: Ant Hill (BALSA_ObjType_AntHill = 3)
  51: { modelFile: "Level9_Balsa.bg3d", modelPath: "models", modelIndex: 3 },
  // 84: Box Wall (GARBAGE_ObjType_BoxWall = 12)
  84: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 12 },
  // 85: Glider Part (GARBAGE_ObjType_Glider = 15)
  85: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 15 },

  // Park level items (Level10_Park.bg3d - MODEL_GROUP_LEVELSPECIFIC)
  // 70: Lily Pad (PARK_ObjType_LilyPad = 4)
  70: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 4 },
  // 71: Cat Tail (PARK_ObjType_CatTail = 5)
  71: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 5 },
  // 73: Platform Flower (PARK_ObjType_ShortFlower = 6)
  73: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 6 },
  // 74: Fishing Lure (PARK_ObjType_Lure = 9)
  74: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 9 },
  // 75: Silverware (PARK_ObjType_Fork = 10)
  75: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 10 },
  // 76: Picnic Basket (PARK_ObjType_PicnicBasket = 13)
  76: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 13 },
  // 78: Bee Hive (PARK_ObjType_Hive = 25)
  78: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 25 },

  // Global items (Global.bg3d - MODEL_GROUP_GLOBAL)
  // 7: Snail Shell (GLOBAL_ObjType_SnailShell = 26)
  7: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 26 },
  // 9: Acorn (GLOBAL_ObjType_Acorn = 25)
  9: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 25 },
  // 13: Door (level-specific, uses GARDEN_ObjType_RedDoor = 5 on Garden)
  13: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 5 },
  // 20: Shrub Root (FOLIAGE_ObjType_ShrubRoot = 10)
  20: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 10 },
  // 35: POW / Powerup (GLOBAL_ObjType_HealthPOW = 13)
  35: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 13 },
  // 36: Firecracker (GLOBAL_ObjType_Firecracker = 30)
  36: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 30 },
  // 37: Glass Bottle
  37: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 27 },
  // 44: Finish Line (PLAYROOM_ObjType_FinishLine = 10)
  44: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 10 },
  // 53: Cloud (BALSA_ObjType_Cloud = 4)
  53: { modelFile: "Level9_Balsa.bg3d", modelPath: "models", modelIndex: 4 },
  // 56: Trampoline
  56: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 13 },

  // Foliage items (Foliage.bg3d)
  // Various plants and foliage elements used across levels
};

/**
 * Get the model mapping for a specific Bugdom 2 item type
 * @param itemType Item type ID
 * @returns Mapping if available, undefined otherwise
 */
export const getBugdom2ItemModelMapping = (
  itemType: number,
): Bugdom2ItemModelMapping | undefined => {
  return BUGDOM2_ITEM_MODEL_MAPPINGS[itemType];
};
