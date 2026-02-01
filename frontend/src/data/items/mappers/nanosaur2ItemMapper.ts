/**
 * Nanosaur 2 Item Model Mapper
 *
 * Maps Nanosaur 2 item types to their corresponding 3D models.
 * Nanosaur 2 uses level-specific BG3D files similar to Otto Matic.
 *
 * Note: Most models in Nanosaur 2 are stored in level-specific files like
 * level1.bg3d, level2.bg3d, etc. Some global models exist in global.bg3d.
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { ItemType } from "../nanosaur2ItemType";

/**
 * Level-specific model files for Nanosaur 2 (for future use with level-aware loading)
 */
export const NANOSAUR2_LEVEL_MODEL_FILES: Record<number, string> = {
  1: "level1.bg3d",
  2: "level2.bg3d",
  3: "level3.bg3d",
  4: "level4.bg3d",
  5: "level5.bg3d",
};

/**
 * Base mappings for Nanosaur 2 items
 * Models are organized by level and item type
 */
const NANOSAUR2_BASE_MAPPINGS: Record<number, UniversalItemModelMapping> = {
  // Trees (Level 1 - Forest)
  [ItemType.BirchTree]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
    variants: {
      0: { modelIndex: 0 }, // HighRed
      1: { modelIndex: 1 }, // HighYellow
      2: { modelIndex: 2 }, // LowRed
      3: { modelIndex: 3 }, // LowYellow
    },
  },

  [ItemType.PineTree]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 1.0,
    variants: {
      0: { modelIndex: 4 }, // HighDead
      1: { modelIndex: 5 }, // HighGreen
      2: { modelIndex: 6 }, // LowDead
      3: { modelIndex: 7 }, // LowGreen
    },
  },

  [ItemType.SmallTree]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 8,
    scale: 0.8,
  },

  [ItemType.FallenTree]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 10,
    scale: 1.0,
    rotationParam: {
      paramIndex: 0,
      rotationType: {
        type: "Rotation", description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  [ItemType.TreeStump]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 11,
    scale: 0.6,
  },

  // Vegetation (Level 1)
  [ItemType.Grass]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 12,
    scale: 0.5,
  },

  [ItemType.Fern]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 13,
    scale: 0.7,
  },

  [ItemType.BerryBush]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 14,
    scale: 0.8,
  },

  [ItemType.CatTail]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 15,
    scale: 0.6,
  },

  // Rocks
  [ItemType.Rock]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 16,
    scale: 1.0,
    variants: {
      0: { modelIndex: 16 },
      1: { modelIndex: 17 },
      2: { modelIndex: 18 },
    },
  },

  [ItemType.RiverRock]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 19,
    scale: 0.8,
  },

  // Powerups (Global)
  [ItemType.Egg]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 0.5,
    variants: {
      0: { modelIndex: 0 }, // Red egg
      1: { modelIndex: 1 }, // Blue egg
      2: { modelIndex: 2 }, // Green egg
      3: { modelIndex: 3 }, // Yellow egg
      4: { modelIndex: 4 }, // Purple egg
    },
  },

  [ItemType.EggWormhole]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 1.0,
  },

  [ItemType.WeaponPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 0.5,
  },

  [ItemType.HealthPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 7,
    scale: 0.5,
  },

  [ItemType.FuelPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 8,
    scale: 0.5,
  },

  [ItemType.ShieldPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 9,
    scale: 0.5,
  },

  [ItemType.FreeLifePOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 10,
    scale: 0.5,
  },

  // Hazards
  [ItemType.TowerTurret]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 11,
    scale: 1.0,
  },

  [ItemType.AirMine]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 12,
    scale: 0.6,
  },

  [ItemType.Electrode]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 13,
    scale: 0.8,
  },

  [ItemType.GasMound]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 20,
    scale: 1.0,
  },

  [ItemType.LaserOrb]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 14,
    scale: 0.4,
  },

  // Forest Door system
  [ItemType.ForestDoor]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 21,
    scale: 1.0,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation", description: "Rotation angle",
        divisions: 4,
        multiplier: "PI2/8",
      },
    },
  },

  [ItemType.ForestDoorKey]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 22,
    scale: 0.5,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation", description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  // Desert Level (Level 2)
  [ItemType.DesertTree]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
    variants: {
      0: { modelIndex: 0 },
      1: { modelIndex: 1 },
      2: { modelIndex: 2 },
      3: { modelIndex: 3 },
      4: { modelIndex: 4 },
    },
  },

  [ItemType.DesertBush]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 0.8,
    variants: {
      0: { modelIndex: 5 },
      1: { modelIndex: 6 },
    },
  },

  [ItemType.Cactus]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 7,
    scale: 1.0,
    variants: {
      0: { modelIndex: 7 },
      1: { modelIndex: 8 },
      2: { modelIndex: 9 },
    },
  },

  [ItemType.Crystal]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 10,
    scale: 0.6,
  },

  [ItemType.PalmTree]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 11,
    scale: 1.0,
    variants: {
      0: { modelIndex: 11 },
      1: { modelIndex: 12 },
    },
  },

  [ItemType.PalmBush]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 13,
    scale: 0.7,
    variants: {
      0: { modelIndex: 13 },
      1: { modelIndex: 14 },
    },
  },

  [ItemType.BurntDesertTree]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 15,
    scale: 1.0,
  },

  // Swamp Level (Level 3)
  [ItemType.SwampFallenTree]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
    variants: {
      0: { modelIndex: 0 },
      1: { modelIndex: 1 },
    },
  },

  [ItemType.SwampStump]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 0.6,
  },

  [ItemType.HydraTree]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 3,
    scale: 1.0,
  },

  [ItemType.OddTree]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 1.0,
  },

  [ItemType.GeckoPlant]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 0.8,
  },

  [ItemType.SproutPlant]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 0.6,
  },

  [ItemType.Ivy]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 7,
    scale: 0.7,
  },

  [ItemType.Hole]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 8,
    scale: 1.0,
  },

  // Effects
  [ItemType.DustDevil]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 15,
    scale: 1.0,
  },

  [ItemType.Smoker]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 16,
    scale: 0.5,
  },

  [ItemType.Flame]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 17,
    scale: 0.5,
  },

  [ItemType.Asteroid]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 18,
    scale: 1.0,
  },

  // Enemies (Skeletons)
  [ItemType.Enemy_Raptor]: {
    modelFile: "raptor.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "raptor.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.Enemy_Brach]: {
    modelFile: "brach.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "brach.skeleton.rsrc",
    scale: 1.0,
    rotationParam: {
      paramIndex: 0,
      rotationType: {
        type: "Rotation", description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  [ItemType.RamphorEnemy]: {
    modelFile: "ramphor.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "ramphor.skeleton.rsrc",
    scale: 1.0,
  },

  // Special items
  [ItemType.BentPineTree]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 23,
    scale: 1.0,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation", description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },
};

/**
 * Nanosaur 2 Item Mapper Implementation
 */
export class Nanosaur2ItemMapper implements GameItemModelMapper {
  readonly game = Game.NANOSAUR_2;
  
  /**
   * Get model mapping for a Nanosaur 2 item type
   */
  getMapping(
    itemType: number,
    _levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const base = NANOSAUR2_BASE_MAPPINGS[itemType];
    if (!base) return undefined;

    // Handle variants based on p0
    if (base.variants && params) {
      const variant = base.variants[params.p0];
      if (variant) {
        return {
          ...base,
          modelFile: variant.modelFile ?? base.modelFile,
          modelIndex: variant.modelIndex,
        };
      }
    }

    // For level-specific models, we could adjust the modelFile based on _levelNum
    // For now, use the base mapping directly
    return base;
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
    return NANOSAUR2_BASE_MAPPINGS[itemType] !== undefined;
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
