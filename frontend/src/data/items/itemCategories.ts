import { ItemFilterCategory } from "@/data/canvasView/itemFilterAtoms";
import { Game } from "@/data/globals/globals";

/**
 * Get the filter category for an item type in a specific game
 */
export function getItemCategory(
  game: Game,
  itemType: number,
): ItemFilterCategory {
  switch (game) {
    case Game.OTTO_MATIC:
      return getOttoMaticItemCategory(itemType);
    case Game.BUGDOM:
      return getBugdomItemCategory(itemType);
    case Game.BUGDOM_2:
      return getBugdom2ItemCategory(itemType);
    case Game.NANOSAUR:
      return getNanosaurItemCategory(itemType);
    case Game.NANOSAUR_2:
      return getNanosaur2ItemCategory(itemType);
    case Game.CRO_MAG:
      return getCroMagItemCategory(itemType);
    case Game.BILLY_FRONTIER:
      return getBillyFrontierItemCategory(itemType);
    case Game.MIGHTY_MIKE:
      return getMightyMikeItemCategory(itemType);
    default:
      return ItemFilterCategory.SCENERY;
  }
}

// Otto Matic category classification
function getOttoMaticItemCategory(itemType: number): ItemFilterCategory {
  // Start coords
  if (itemType === 0) return ItemFilterCategory.START_END;

  // Enemies (identified by "Enemy_" prefix in source)
  const enemyTypes = [
    3, 7, 8, 9, 10, 30, 35, 38, 49, 50, 51, 52, 59, 60, 78, 81, 89, 92, 93, 94,
    95, 102, 105,
  ];
  if (enemyTypes.includes(itemType)) return ItemFilterCategory.ENEMIES;

  // Powerups
  const powerupTypes = [5, 6, 32]; // Atom, PowerupPod, BasicCrystal
  if (powerupTypes.includes(itemType)) return ItemFilterCategory.POWERUPS;

  // Platforms
  const platformTypes = [36, 39, 40, 47, 53, 55, 98];
  if (platformTypes.includes(itemType)) return ItemFilterCategory.PLATFORMS;

  // Checkpoints & Exit
  if (itemType === 26 || itemType === 27) return ItemFilterCategory.CHECKPOINTS;

  // Triggers (gates, teleporters, etc.)
  const triggerTypes = [13, 19, 44, 45, 46, 57, 58, 64, 82];
  if (triggerTypes.includes(itemType)) return ItemFilterCategory.TRIGGERS;

  // Hazards
  const hazardTypes = [28, 29, 31, 62, 67, 70, 87, 97];
  if (hazardTypes.includes(itemType)) return ItemFilterCategory.HAZARDS;

  // Default to scenery
  return ItemFilterCategory.SCENERY;
}

// Bugdom category classification
function getBugdomItemCategory(itemType: number): ItemFilterCategory {
  // Start coords
  if (itemType === 0) return ItemFilterCategory.START_END;

  // Enemies
  const enemyTypes = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  ];
  if (enemyTypes.includes(itemType)) return ItemFilterCategory.ENEMIES;

  // Powerups
  const powerupTypes = [20, 21, 22, 23, 24];
  if (powerupTypes.includes(itemType)) return ItemFilterCategory.POWERUPS;

  // Checkpoints
  if (itemType === 25 || itemType === 26) return ItemFilterCategory.CHECKPOINTS;

  return ItemFilterCategory.SCENERY;
}

// Bugdom 2 category classification
function getBugdom2ItemCategory(itemType: number): ItemFilterCategory {
  // Start coords
  if (itemType === 0) return ItemFilterCategory.START_END;

  // Basic classification - can be refined based on actual item types
  return ItemFilterCategory.SCENERY;
}

// Nanosaur category classification
function getNanosaurItemCategory(itemType: number): ItemFilterCategory {
  // Start coords
  if (itemType === 0) return ItemFilterCategory.START_END;

  // Enemies (dinosaurs)
  const enemyTypes = [1, 2, 3, 4, 5, 6];
  if (enemyTypes.includes(itemType)) return ItemFilterCategory.ENEMIES;

  // Powerups (eggs, powerup pods)
  const powerupTypes = [7, 8, 9, 10, 11, 12];
  if (powerupTypes.includes(itemType)) return ItemFilterCategory.POWERUPS;

  // Hazards (lava, water patches)
  const hazardTypes = [20, 21];
  if (hazardTypes.includes(itemType)) return ItemFilterCategory.HAZARDS;

  return ItemFilterCategory.SCENERY;
}

// Nanosaur 2 category classification
function getNanosaur2ItemCategory(itemType: number): ItemFilterCategory {
  if (itemType === 0) return ItemFilterCategory.START_END;
  return ItemFilterCategory.SCENERY;
}

// Cro-Mag Rally category classification
function getCroMagItemCategory(itemType: number): ItemFilterCategory {
  if (itemType === 0) return ItemFilterCategory.START_END;

  // Powerups (boost, weapons)
  const powerupTypes = [1, 2, 3, 4, 5];
  if (powerupTypes.includes(itemType)) return ItemFilterCategory.POWERUPS;

  // Hazards (obstacles)
  const hazardTypes = [10, 11, 12, 13];
  if (hazardTypes.includes(itemType)) return ItemFilterCategory.HAZARDS;

  // Checkpoints
  if (itemType === 20 || itemType === 21) return ItemFilterCategory.CHECKPOINTS;

  return ItemFilterCategory.SCENERY;
}

// Billy Frontier category classification
function getBillyFrontierItemCategory(itemType: number): ItemFilterCategory {
  // Start coords
  if (itemType === 0) return ItemFilterCategory.START_END;

  // Duelers/enemies
  const enemyTypes = [1, 7, 8, 31, 35];
  if (enemyTypes.includes(itemType)) return ItemFilterCategory.ENEMIES;

  // Powerups
  if (itemType === 32 || itemType === 36) return ItemFilterCategory.POWERUPS;

  // Scenery (buildings, plants, etc.)
  const sceneryTypes = [2, 3, 4, 6, 11, 14, 17, 24, 25, 29, 30];
  if (sceneryTypes.includes(itemType)) return ItemFilterCategory.SCENERY;

  return ItemFilterCategory.SCENERY;
}

// Mighty Mike category classification
function getMightyMikeItemCategory(itemType: number): ItemFilterCategory {
  if (itemType === 0) return ItemFilterCategory.START_END;

  // Enemies
  const enemyTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  if (enemyTypes.includes(itemType)) return ItemFilterCategory.ENEMIES;

  // Powerups
  const powerupTypes = [20, 21, 22, 23, 24, 25];
  if (powerupTypes.includes(itemType)) return ItemFilterCategory.POWERUPS;

  return ItemFilterCategory.SCENERY;
}
