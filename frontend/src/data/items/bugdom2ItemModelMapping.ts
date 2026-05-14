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

import type { UniversalItemModelMapping } from "./itemModelTypes";
import { ROTATION_4_WAY, ROTATION_8_WAY } from "./standardParamTypes";
import { ItemType } from "./bugdom2ItemType";

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
  UniversalItemModelMapping | undefined
> = {
  // Enemies with skeleton models (character-type enemies)
  [ItemType.Snail]: { modelFile: "Snail.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Snail.skeleton.rsrc" },
  [ItemType.Enemy_Gnome]: { modelFile: "Gnome.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Gnome.skeleton.rsrc" },
  [ItemType.Enemy_HouseFly]: { modelFile: "HouseFly.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "HouseFly.skeleton.rsrc" },
  [ItemType.Enemy_EvilPlant]: { modelFile: "EvilPlant.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "EvilPlant.skeleton.rsrc" },
  [ItemType.Chipmunk]: { modelFile: "Chipmunk.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Chipmunk.skeleton.rsrc" },
  [ItemType.Enemy_Flea]: { modelFile: "Flea.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Flea.skeleton.rsrc" },
  [ItemType.Enemy_Tick]: { modelFile: "Tick.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Tick.skeleton.rsrc" },
  [ItemType.Enemy_ToySoldier]: { modelFile: "Soldier.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Soldier.skeleton.rsrc" },
  [ItemType.Enemy_Otto]: { modelFile: "OttoToy.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "OttoToy.skeleton.rsrc" },
  [ItemType.Enemy_Dragonfly]: { modelFile: "DragonFly.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "DragonFly.skeleton.rsrc" },
  [ItemType.Enemy_Frog]: { modelFile: "Frog.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Frog.skeleton.rsrc" },
  [ItemType.Enemy_Moth]: { modelFile: "Moth.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Moth.skeleton.rsrc" },
  [ItemType.Enemy_ComputerBug]: { modelFile: "ComputerBug.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "ComputerBug.skeleton.rsrc" },
  [ItemType.Enemy_Roach]: { modelFile: "Roach.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Roach.skeleton.rsrc" },
  [ItemType.Enemy_Ant]: { modelFile: "Ant.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Ant.skeleton.rsrc" },
  [ItemType.Enemy_PondFish]: { modelFile: "Fish.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "Fish.skeleton.rsrc" },

  // Non-enemy skeleton models
  [ItemType.MouseTrap]: { modelFile: "MouseTrap.bg3d", modelPath: "skeletons", modelIndex: 0, requiresSkeleton: true, skeletonFile: "MouseTrap.skeleton.rsrc" },

  // Foliage items (Foliage.bg3d - MODEL_GROUP_FOLIAGE)
  [ItemType.Daisy]: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 0, scale: 2.0 }, // FOLIAGE_ObjType_Daisy1 = 0; scale: 1.0+RandomFloat()*2.0 → avg 2.0
  [ItemType.Grass]: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 7, scale: 2.5 }, // FOLIAGE_ObjType_Grass1 = 7; scale: 1.7+RandomFloat()*1.8 → avg 2.6
  [ItemType.Tulip]: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 3, scale: 3.0 }, // FOLIAGE_ObjType_Tulip1 = 3; scale: 2.5+RandomFloat()*1.5 → avg 3.25
  [ItemType.Rose]: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 11, scale: 3.0 }, // FOLIAGE_ObjType_Rose = 11; scale: 2.5+RandomFloat()*1.5 → avg 3.25
  [ItemType.ShrubRoot]: { modelFile: "Foliage.bg3d", modelPath: "models", modelIndex: 10 }, // FOLIAGE_ObjType_ShrubRoot = 10

  // Garden level items (Level1_Garden.bg3d)
  [ItemType.SprinklerHead]: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 1, groupSize: 2, rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY } }, // GARDEN_ObjType_SprinklerBase = 1; parm[0] * (PI/2) sets rotation
  [ItemType.Scarecrow]: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 8, scale: 1.1, groupSize: 3 }, // GARDEN_ObjType_ScarecrowBody = 8; scale = SCARECROW_SCALE = 1.1
  [ItemType.Door]: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 5, scale: 1.8, rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY } }, // GARDEN_ObjType_RedDoor = 5

  // Sidewalk level items (Level2_Sidewalk.bg3d)
  [ItemType.Brick]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 8, scale: 2.5, rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY } }, // SIDEWALK_ObjType_Brick = 8
  [ItemType.Post]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 12, scale: 1.5 }, // SIDEWALK_ObjType_Post_Brick = 12
  [ItemType.Pebble]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 9 }, // SIDEWALK_ObjType_LargeStone = 9
  [ItemType.PoolCoping]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 20, rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY } }, // SIDEWALK_ObjType_Coping = 20; parm[0] * (PI2/4) = PI/2 per step
  [ItemType.PoolLeaf]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 16, scale: 2.0 }, // SIDEWALK_ObjType_PoolLeaf1 = 16
  // DogHouse: base rotation is PI (180°), offset + parm[0]*PI/2; use ROTATION_4_WAY with PI offset
  [ItemType.DogHouse]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 27, scale: 2.0, rotationParam: { paramIndex: 0, rotationType: { type: "Rotation", divisions: 4, multiplier: "PI2/4", offset: Math.PI, description: "Dog house rotation (0-3, PI/2 per step, starting at 180°)" } } }, // SIDEWALK_ObjType_DogHouse = 27
  [ItemType.Windmill]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 28, groupSize: 2, rotationParam: { paramIndex: 0, rotationType: ROTATION_4_WAY } }, // SIDEWALK_ObjType_WindmillBase = 28
  [ItemType.TulipPot]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 30, scale: 3.0 }, // SIDEWALK_ObjType_TulipPot = 30
  [ItemType.BeachBall]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 22, scale: 2.5 }, // SIDEWALK_ObjType_BeachBall = 22
  [ItemType.ChlorineFloat]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 23, scale: 3.0 }, // SIDEWALK_ObjType_ChlorineFloat = 23
  [ItemType.PoolRingFloat]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 24, scale: 3.0 }, // SIDEWALK_ObjType_PoolRingFloat = 24
  [ItemType.DrainPipe]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 31, scale: 2.5 }, // SIDEWALK_ObjType_DrainPipe = 31
  [ItemType.RideBall]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 15, rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY } }, // SIDEWALK_ObjType_RideBall = 15; parm[0] * (PI2/8) = PI/4 per step
  [ItemType.GlassBottle]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 33, scale: 2.1 }, // SIDEWALK_ObjType_Bottle = 33
  [ItemType.SquishBerry]: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 25 }, // SIDEWALK_ObjType_SquishBerry = 25

  // Playroom level items (Level5_Playroom.bg3d)
  [ItemType.BowlingMarble]: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 6 }, // PLAYROOM_ObjType_MarbleShell = 6
  [ItemType.LetterBlock]: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 1 }, // PLAYROOM_ObjType_LetterBlock1 = 1
  [ItemType.Puzzle]: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 20 }, // PLAYROOM_ObjType_PuzzleMain = 20
  [ItemType.LegoWall]: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 24 }, // PLAYROOM_ObjType_LegoWall = 24
  [ItemType.FinishLine]: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 10 }, // PLAYROOM_ObjType_FinishLine = 10
  [ItemType.Crayon]: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 19 }, // PLAYROOM_ObjType_Crayon = 19
  [ItemType.DCell]: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 9 }, // PLAYROOM_ObjType_DCell = 9

  // Closet level items (Level6_Closet.bg3d)
  [ItemType.FlashLight]: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 0 }, // CLOSET_ObjType_FlashLight = 0
  [ItemType.CardboardBox]: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 2 }, // CLOSET_ObjType_CardboardBox1 = 2
  [ItemType.MothBall]: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 10 }, // CLOSET_ObjType_MothBall = 10
  [ItemType.ClosetWall]: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 13 }, // CLOSET_ObjType_PCICard = 13
  [ItemType.SiliconPart]: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 22 }, // CLOSET_ObjType_Chip1 = 22
  [ItemType.BookStack]: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 16 }, // CLOSET_ObjType_FlatBook = 16
  [ItemType.ShoeBox]: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 6 }, // CLOSET_ObjType_ShoeBox = 6
  [ItemType.PictureFrame]: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 28 }, // CLOSET_ObjType_PictureFrame_Brian = 28
  [ItemType.Trampoline]: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 7 }, // CLOSET_ObjType_TrampolineBase = 7

  // Garbage level items (Level8_Garbage.bg3d)
  [ItemType.SodaCan]: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 1 }, // GARBAGE_ObjType_Can = 1
  [ItemType.Jar]: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 8 }, // GARBAGE_ObjType_Jar = 8
  [ItemType.TinCan]: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 10 }, // GARBAGE_ObjType_TinCan = 10
  [ItemType.Detergent]: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 11 }, // GARBAGE_ObjType_Detergent = 11
  [ItemType.BoxWall]: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 12 }, // GARBAGE_ObjType_BoxWall = 12
  [ItemType.GliderPart]: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 15 }, // GARBAGE_ObjType_Glider = 15
  [ItemType.Veggie]: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 4 }, // GARBAGE_ObjType_Banana = 4

  // Balsa level items (Level9_Balsa.bg3d)
  [ItemType.AntHill]: { modelFile: "Level9_Balsa.bg3d", modelPath: "models", modelIndex: 3 }, // BALSA_ObjType_AntHill = 3
  [ItemType.Cloud]: { modelFile: "Level9_Balsa.bg3d", modelPath: "models", modelIndex: 4 }, // BALSA_ObjType_Cloud = 4

  // Park level items (Level10_Park.bg3d)
  [ItemType.LilyPad]: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 4 }, // PARK_ObjType_LilyPad = 4
  [ItemType.CatTail]: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 5 }, // PARK_ObjType_CatTail = 5
  [ItemType.PlatformFlower]: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 6 }, // PARK_ObjType_ShortFlower = 6
  [ItemType.FishingLure]: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 9 }, // PARK_ObjType_Lure = 9
  [ItemType.Silverware]: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 10 }, // PARK_ObjType_Fork = 10
  [ItemType.PicnicBasket]: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 13 }, // PARK_ObjType_PicnicBasket = 13
  [ItemType.BeeHive]: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 25, groupSize: 2 }, // PARK_ObjType_Hive = 25
  [ItemType.Kindling]: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 23 }, // PARK_ObjType_Leaf = 23

  // Global items (Global.bg3d)
  [ItemType.SnailShell]: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 26, scale: 1.2 }, // GLOBAL_ObjType_SnailShell = 26; scale = SNAIL_SCALE = 1.2
  [ItemType.Acorn]: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 25, scale: 1.1 }, // GLOBAL_ObjType_Acorn = 25
  [ItemType.POW]: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 13 }, // GLOBAL_ObjType_HealthPOW = 13
  [ItemType.Firecracker]: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 30, scale: 1.1 }, // GLOBAL_ObjType_Firecracker = 30
  [ItemType.Butterfly]: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 10, scale: 0.6, yOffset: 125 }, // GLOBAL_ObjType_ButterflyBody = 10 (groupSize 3: body + left/right wings); coord.y = terrainY + 150
};
