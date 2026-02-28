/**
 * Mapping of Mighty Mike item types to their sprite group and type.
 * Based on analysis of the Mighty Mike source code (Playfield.c, objecttypes.h, and enemy files).
 *
 * Sprite groups are defined in objecttypes.h:
 * - GROUP_MAIN (0): Main sprites (player, coins, shadows)
 * - GROUP_AREA_SPECIFIC (2): Area 1 specific (jurassic1.shapes, clown1.shapes, etc.)
 * - GROUP_AREA_SPECIFIC2 (3): Area 2 specific (jurassic2.shapes, clown2.shapes, etc.)
 * - GROUP_WEAPONS (4): Weapons
 * - GROUP_OVERHEAD (5): Overhead view
 * - GROUP_WIN (6): Win screen
 *
 * Item images are loaded from scene-specific .shapes files:
 * - jurassic1.shapes / jurassic2.shapes
 * - candy1.shapes / candy2.shapes
 * - clown1.shapes / clown2.shapes
 * - fairy1.shapes / fairy2.shapes
 * - bargain1.shapes / bargain2.shapes
 * - main.shapes (for global items like weapons)
 * - bonus.shapes (for health/powerup items)
 */

export interface ItemSpriteMapping {
  itemType: number;
  groupNum: number;
  spriteType: number;
  scene?: string; // jurassic, candy, clown, fairy, bargain, etc.
  shapesFile?: string; // Override for items not in scene-specific files
  notes?: string;
}

/**
 * Maps each Mighty Mike item type to its sprite location.
 * For scene-specific items, the group (AREA_SPECIFIC or AREA_SPECIFIC2) maps to the current scene.
 * The shapesFile can be used to override if an item is in a non-standard location.
 */
export const MIGHTY_MIKE_ITEM_SPRITE_MAP: Record<number, ItemSpriteMapping> = {
  // Item 0: Caveman (Jurassic scene)
  0: {
    itemType: 0,
    groupNum: 2, // GROUP_AREA_SPECIFIC
    spriteType: 0, // ObjType_Caveman
    scene: "jurassic",
    notes: "Enemy - uses jurassic1.shapes or jurassic2.shapes depending on which area",
  },

  // Item 1: Appear Zone (Trigger)
  1: {
    itemType: 1,
    groupNum: -1, // No visual sprite, just a trigger zone
    spriteType: -1,
    notes: "Invisible trigger - no sprite to display",
  },

  // Item 2: Store (unused)
  2: {
    itemType: 2,
    groupNum: -1,
    spriteType: -1,
    notes: "Unused",
  },

  // Item 3: Bunny
  3: {
    itemType: 3,
    groupNum: 0, // GROUP_MAIN
    spriteType: 4, // ObjType_Bunny
    shapesFile: "main.shapes",
  },

  // Item 4: Triceratops (Jurassic)
  4: {
    itemType: 4,
    groupNum: 2,
    spriteType: 1, // ObjType_Triceratops
    scene: "jurassic",
  },

  // Item 5: Turtle (Jurassic)
  5: {
    itemType: 5,
    groupNum: 2,
    spriteType: 4, // ObjType_Turtle
    scene: "jurassic",
  },

  // Item 6: Man-Eating Plant (Jurassic)
  6: {
    itemType: 6,
    groupNum: 3, // GROUP_AREA_SPECIFIC2
    spriteType: 0, // ObjType_ManEatingPlant
    scene: "jurassic",
  },

  // Item 7: Dino Egg (Jurassic)
  7: {
    itemType: 7,
    groupNum: 3,
    spriteType: 1, // ObjType_DinoEgg
    scene: "jurassic",
  },

  // Item 8: Baby Dino (Jurassic)
  8: {
    itemType: 8,
    groupNum: 3,
    spriteType: 2, // ObjType_BabyDino
    scene: "jurassic",
  },

  // Item 9: T-Rex (Jurassic)
  9: {
    itemType: 9,
    groupNum: 3,
    spriteType: 3, // ObjType_Rex
    scene: "jurassic",
  },

  // Item 10: Clown Balloon (Clown - unused)
  10: {
    itemType: 10,
    groupNum: -1,
    spriteType: -1,
    notes: "Unused",
  },

  // Item 11: Clown Car (Clown)
  11: {
    itemType: 11,
    groupNum: 3,
    spriteType: 6, // ObjType_ClownCar
    scene: "clown",
  },

  // Item 12: Jack-in-the-Box (Clown)
  12: {
    itemType: 12,
    groupNum: 3,
    spriteType: 0, // ObjType_JackInTheBox
    scene: "clown",
  },

  // Item 13: Clown (Clown)
  13: {
    itemType: 13,
    groupNum: 2,
    spriteType: 0, // ObjType_Clown
    scene: "clown",
  },

  // Item 14: Magic Hat (Clown)
  14: {
    itemType: 14,
    groupNum: 2,
    spriteType: 1, // ObjType_MagicHat
    scene: "clown",
  },

  // Item 15: Health Powerup (scene-specific sprite from area-specific2 shapes)
  15: {
    itemType: 15,
    groupNum: 3, // GROUP_AREA_SPECIFIC2 (varies per scene, but always group 3 except bargain)
    spriteType: 4, // Scene-specific: Jurassic=4, Clown=4, Candy=5, Fairy=1, Bargain group2=1
    notes: "Scene-specific health powerup",
  },

  // Item 16: Flower Clown (Clown)
  16: {
    itemType: 16,
    groupNum: 3,
    spriteType: 1, // ObjType_FlowerClown
    scene: "clown",
  },

  // Item 17: Teleporter
  17: {
    itemType: 17,
    groupNum: -1,
    spriteType: -1,
    notes: "Trigger - no visual sprite",
  },

  // Item 18: Race Car (Bargain)
  18: {
    itemType: 18,
    groupNum: 3,
    spriteType: 6, // ObjType_RaceCar
    scene: "bargain",
  },

  // Item 19: Key
  19: {
    itemType: 19,
    groupNum: -1,
    spriteType: -1,
    shapesFile: "bonus.shapes",
    notes: "Color keys stored in bonus.shapes",
  },

  // Item 20: Clown Door (Clown)
  20: {
    itemType: 20,
    groupNum: 3,
    spriteType: 2, // ObjType_ClownDoor
    scene: "clown",
  },

  // Item 21: Candy Moving Platform (Candy)
  21: {
    itemType: 21,
    groupNum: 2,
    spriteType: 0, // ObjType_CandyMPlatform
    scene: "candy",
  },

  // Item 22: Candy Door (Candy)
  22: {
    itemType: 22,
    groupNum: 2,
    spriteType: 1, // ObjType_CandyDoor
    scene: "candy",
  },

  // Item 23: Star (Clown)
  23: {
    itemType: 23,
    groupNum: 3,
    spriteType: 3, // ObjType_Star
    scene: "clown",
  },

  // Item 24: Chocolate Bunny (Candy)
  24: {
    itemType: 24,
    groupNum: 2, // GROUP_AREA_SPECIFIC
    spriteType: 2, // ObjType_ChocBunny
    scene: "candy",
  },

  // Item 25: Gingerbread Man (Candy)
  25: {
    itemType: 25,
    groupNum: 2, // GROUP_AREA_SPECIFIC
    spriteType: 3, // ObjType_GBread
    scene: "candy",
  },

  // Item 26: Mint (Candy)
  26: {
    itemType: 26,
    groupNum: 3,
    spriteType: 6, // ObjType_Mint
    scene: "candy",
  },

  // Item 27: Cherry Bomb (was here, unused)
  27: {
    itemType: 27,
    groupNum: -1,
    spriteType: -1,
    notes: "Unused",
  },

  // Item 28: Gum Bear (Candy)
  28: {
    itemType: 28,
    groupNum: 3,
    spriteType: 0, // ObjType_RedGummy
    scene: "candy",
  },

  // Item 29: Player Start Coordinates
  29: {
    itemType: 29,
    groupNum: -1,
    spriteType: -1,
    notes: "Level metadata - no sprite",
  },

  // Item 30: Finish Line
  30: {
    itemType: 30,
    groupNum: -1,
    spriteType: -1,
    notes: "Level goal - no sprite",
  },

  // Item 31: Jurassic Door (Jurassic)
  31: {
    itemType: 31,
    groupNum: 3,
    spriteType: 6, // ObjType_JurassicDoor
    scene: "jurassic",
  },

  // Item 32: Caramel (Candy)
  32: {
    itemType: 32,
    groupNum: 3,
    spriteType: 2, // ObjType_Carmel
    scene: "candy",
  },

  // Item 33: Weapon Powerup
  33: {
    itemType: 33,
    groupNum: 4, // GROUP_WEAPONS
    spriteType: -1,
    shapesFile: "weapon.shapes",
  },

  // Item 34: Misc Powerup
  34: {
    itemType: 34,
    groupNum: -1,
    spriteType: -1,
    shapesFile: "bonus.shapes",
    notes: "Scene-specific misc powerups in bonus.shapes",
  },

  // Item 35: Gum Ball (Candy)
  35: {
    itemType: 35,
    groupNum: 3,
    spriteType: 3, // ObjType_GumBall
    scene: "candy",
  },

  // Item 36: Lemon Drop (Candy)
  36: {
    itemType: 36,
    groupNum: 3,
    spriteType: 4, // ObjType_LemonDrop
    scene: "candy",
  },

  // Item 37: Giant (Fairy)
  37: {
    itemType: 37,
    groupNum: 2,
    spriteType: 2, // ObjType_Giant
    scene: "fairy",
  },

  // Item 38: Dragon (Fairy)
  38: {
    itemType: 38,
    groupNum: 2,
    spriteType: 1, // ObjType_Dragon
    scene: "fairy",
  },

  // Item 39: Witch (Fairy)
  39: {
    itemType: 39,
    groupNum: 2,
    spriteType: 0, // ObjType_Witch
    scene: "fairy",
  },

  // Item 40: Big Bad Wolf (Fairy)
  40: {
    itemType: 40,
    groupNum: 2,
    spriteType: 3, // ObjType_BBWolf
    scene: "fairy",
  },

  // Item 41: Soldier (Fairy)
  41: {
    itemType: 41,
    groupNum: 3,
    spriteType: 3, // ObjType_Soldier
    scene: "fairy",
  },

  // Item 42: Muffin (Fairy)
  42: {
    itemType: 42,
    groupNum: 2,
    spriteType: 4, // ObjType_Muffit
    scene: "fairy",
  },

  // Item 43: Spider (Fairy)
  43: {
    itemType: 43,
    groupNum: 3,
    spriteType: 0, // ObjType_Spider
    scene: "fairy",
  },

  // Item 44: Fairy Door (Fairy)
  44: {
    itemType: 44,
    groupNum: 3,
    spriteType: 4, // ObjType_FairyDoor
    scene: "fairy",
  },

  // Item 45: Battery (Bargain)
  45: {
    itemType: 45,
    groupNum: 2,
    spriteType: 0, // ObjType_BadBattery
    scene: "bargain",
  },

  // Item 46: Poison Apple (Fairy)
  46: {
    itemType: 46,
    groupNum: 3,
    spriteType: 1, // ObjType_FairyHealth (used by AddPoisonApple)
    scene: "fairy",
  },

  // Item 47: Slinky (Bargain)
  47: {
    itemType: 47,
    groupNum: 2,
    spriteType: 2, // ObjType_Slinky
    scene: "bargain",
  },

  // Item 48: 8-Ball (Bargain)
  48: {
    itemType: 48,
    groupNum: 2,
    spriteType: 3, // ObjType_8Ball
    scene: "bargain",
  },

  // Item 49: Ship Powerup (Bargain)
  49: {
    itemType: 49,
    groupNum: 2,
    spriteType: 4, // ObjType_SpaceShip
    scene: "bargain",
  },

  // Item 50: Robot (Bargain)
  50: {
    itemType: 50,
    groupNum: 3,
    spriteType: 0, // ObjType_Robot
    scene: "bargain",
  },

  // Item 51: Doggy (Bargain)
  51: {
    itemType: 51,
    groupNum: 3,
    spriteType: 1, // ObjType_Doggy
    scene: "bargain",
  },

  // Item 52: Bargain Door (Bargain)
  52: {
    itemType: 52,
    groupNum: 3,
    spriteType: 2, // ObjType_BargainDoor
    scene: "bargain",
  },

  // Item 53: Top (Bargain)
  53: {
    itemType: 53,
    groupNum: 3,
    spriteType: 4, // ObjType_Top
    scene: "bargain",
  },

  // Item 54: Hydrant (Bargain)
  54: {
    itemType: 54,
    groupNum: 3,
    spriteType: 5, // ObjType_FireHydrant
    scene: "bargain",
  },

  // Item 55: Key Color (Color key)
  55: {
    itemType: 55,
    groupNum: -1,
    spriteType: -1,
    shapesFile: "bonus.shapes",
    notes: "Color keys in bonus.shapes",
  },
};

/**
 * Get the sprite mapping for an item type.
 * Returns null if the item has no sprite (triggers, metadata, unused items).
 */
export function getItemSpriteMapping(itemType: number): ItemSpriteMapping | null {
  const mapping = MIGHTY_MIKE_ITEM_SPRITE_MAP[itemType];
  if (!mapping) return null;
  if (mapping.groupNum < 0 || mapping.spriteType < 0) return null;
  return mapping;
}

/**
 * Get the .shapes file name for a given item and scene.
 * For scene-specific items, construct the filename based on the scene name and group number.
 * If the item has no explicit scene but belongs to a scene-specific group,
 * uses the current level scene (for items like health powerups that vary by scene).
 */
export function getItemShapesFile(itemType: number, scene?: string): string | null {
  const mapping = MIGHTY_MIKE_ITEM_SPRITE_MAP[itemType];
  if (!mapping) return null;

  // If there's an explicit shapesFile override, use it
  if (mapping.shapesFile) {
    return mapping.shapesFile;
  }

  // Determine which scene to use: item's explicit scene, or the level's current scene
  const effectiveScene = mapping.scene || scene;

  // For scene-specific items, construct the filename
  if (effectiveScene) {
    if (mapping.groupNum === 2) {
      // GROUP_AREA_SPECIFIC (first area)
      return `${effectiveScene}1.shapes`;
    } else if (mapping.groupNum === 3) {
      // GROUP_AREA_SPECIFIC2 (second area)
      return `${effectiveScene}2.shapes`;
    }
  }

  return null;
}
