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

  // Garden level items (Level1_Garden.bg3d)
  // 5: Daisy
  5: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 0 },
  // 6: Grass
  6: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 1 },
  // 8: Tulip
  8: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 2 },
  // 11: Scarecrow
  11: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 3 },
  // 29: Rose
  29: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 4 },
  // 30: Tulip Pot
  30: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 5 },
  // 28: Windmill
  28: { modelFile: "Level1_Garden.bg3d", modelPath: "models", modelIndex: 6 },

  // Sidewalk level items (Level2_Sidewalk.bg3d)
  // 17: Brick
  17: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 0 },
  // 18: Post
  18: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 1 },
  // 21: Pebble
  21: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 2 },
  // 23: Pool Coping
  23: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 3 },
  // 24: Pool Leaf
  24: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 4 },
  // 27: Dog House
  27: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 5 },
  // 31: Beach Ball
  31: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 6 },
  // 32: Chlorine Float
  32: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 7 },
  // 33: Pool Ring Float
  33: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 8 },
  // 34: Drain Pipe
  34: { modelFile: "Level2_Sidewalk.bg3d", modelPath: "models", modelIndex: 9 },

  // Playroom level items (Level5_Playroom.bg3d)
  // 14: Ride Ball
  14: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 0 },
  // 15: Bowling Marble
  15: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 1 },
  // 16: Bowling Pins
  16: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 2 },
  // 40: Slot Car
  40: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 3 },
  // 41: Letter Block
  41: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 4 },
  // 46: Puzzle
  46: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 5 },
  // 47: Lego Wall
  47: { modelFile: "Level5_Playroom.bg3d", modelPath: "models", modelIndex: 6 },

  // Closet level items (Level6_Closet.bg3d)
  // 48: Flashlight
  48: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 0 },
  // 49: D-Cell battery
  49: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 1 },
  // 50: Crayon
  50: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 2 },
  // 55: Cardboard Box
  55: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 3 },
  // 57: Moth Ball
  57: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 4 },
  // 58: Vacuum
  58: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 5 },
  // 59: Closet Wall / PCI Card
  59: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 6 },
  // 62: Silicon Part
  62: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 7 },
  // 64: Book Stack
  64: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 8 },
  // 66: Shoe Box
  66: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 9 },
  // 67: Picture Frame
  67: { modelFile: "Level6_Closet.bg3d", modelPath: "models", modelIndex: 10 },

  // Gutter level items (Level7_Gutter.bg3d)
  // Items specific to gutter level

  // Garbage level items (Level8_Garbage.bg3d)
  // 79: Soda Can
  79: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 0 },
  // 81: Jar
  81: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 1 },
  // 82: Tin Can
  82: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 2 },
  // 83: Detergent
  83: { modelFile: "Level8_Garbage.bg3d", modelPath: "models", modelIndex: 3 },

  // Balsa level items (Level9_Balsa.bg3d)
  // 84: Box Wall
  84: { modelFile: "Level9_Balsa.bg3d", modelPath: "models", modelIndex: 0 },
  // 85: Glider Part
  85: { modelFile: "Level9_Balsa.bg3d", modelPath: "models", modelIndex: 1 },

  // Park level items (Level10_Park.bg3d)
  // 70: Lily Pad
  70: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 0 },
  // 71: Cat Tail
  71: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 1 },
  // 72: Bubbler
  72: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 2 },
  // 73: Platform Flower
  73: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 3 },
  // 74: Fishing Lure
  74: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 4 },
  // 75: Silverware
  75: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 5 },
  // 76: Picnic Basket
  76: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 6 },
  // 77: Kindling
  77: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 7 },
  // 78: Bee Hive
  78: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 8 },
  // 80: Veggie
  80: { modelFile: "Level10_Park.bg3d", modelPath: "models", modelIndex: 9 },

  // Global items (Global.bg3d)
  // 2: Sprinkler Head
  2: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 0 },
  // 3: Butterfly
  3: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 1 },
  // 7: Snail Shell
  7: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 2 },
  // 9: Acorn
  9: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 3 },
  // 13: Door
  13: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 4 },
  // 20: Shrub Root
  20: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 5 },
  // 26: Squish Berry
  26: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 6 },
  // 35: POW / Powerup
  35: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 7 },
  // 36: Firecracker
  36: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 8 },
  // 37: Glass Bottle
  37: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 9 },
  // 44: Finish Line
  44: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 10 },
  // 51: Ant Hill
  51: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 11 },
  // 53: Cloud
  53: { modelFile: "Global.bg3d", modelPath: "models", modelIndex: 12 },
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
