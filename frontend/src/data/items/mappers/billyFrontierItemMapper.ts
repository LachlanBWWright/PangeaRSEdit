/**
 * Billy Frontier Item Model Mapper
 *
 * Maps Billy Frontier item types to their corresponding 3D models.
 * Billy Frontier is organized by scene types:
 * - Town (shootout scenes)
 * - Swamp (tremor scenes)
 * - Duel scenes
 * - Stampede scenes
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { ItemType } from "../billyFrontierItemType";

/**
 * Scene-specific model files for Billy Frontier (for future use)
 */
export const BILLY_SCENE_MODEL_FILES: Record<string, string> = {
  town: "town.bg3d",
  swamp: "swamp.bg3d",
  duel: "duel.bg3d",
  stampede: "stampede.bg3d",
  global: "global.bg3d",
};

/**
 * Base mappings for Billy Frontier items
 */
const BILLY_BASE_MAPPINGS: Record<number, UniversalItemModelMapping> = {
  // Duel items
  [ItemType.Dueler]: {
    modelFile: "dueler.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "dueler.skeleton.rsrc",
    scale: 1.0,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  // Buildings
  [ItemType.Building]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.5,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 4,
        multiplier: "PI2/4",
      },
    },
    variants: {
      0: { modelIndex: 0 }, // Saloon
      1: { modelIndex: 1 }, // Bank
      2: { modelIndex: 2 }, // Hotel
      3: { modelIndex: 3 }, // General Store
    },
  },

  [ItemType.ShootoutSaloon]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 1.5,
  },

  [ItemType.ShootoutAlley]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 1.5,
  },

  // Cemetery items
  [ItemType.HeadStone]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 0.8,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
    variants: {
      0: { modelIndex: 6 },
      1: { modelIndex: 7 },
      2: { modelIndex: 8 },
    },
  },

  [ItemType.Coffin]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 9,
    scale: 1.0,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  // Plants
  [ItemType.Plant]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 10,
    scale: 1.0,
    variants: {
      0: { modelIndex: 10 }, // Cactus (town)
      1: { modelIndex: 11 }, // Mushroom tree (swamp)
      2: { modelIndex: 12 }, // Other plants
    },
  },

  // Duel scene items
  [ItemType.DuelRockWall]: {
    modelFile: "duel.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
  },

  // Shootout enemies
  [ItemType.FrogMan_Shootout]: {
    modelFile: "frogman.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "frogman.skeleton.rsrc",
    scale: 1.0,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  [ItemType.Bandito_Shootout]: {
    modelFile: "bandito.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "bandito.skeleton.rsrc",
    scale: 1.0,
    rotationParam: {
      paramIndex: 2,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  [ItemType.Shorty_Shootout]: {
    modelFile: "shorty.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "shorty.skeleton.rsrc",
    scale: 1.0,
    rotationParam: {
      paramIndex: 2,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  // Props
  [ItemType.Barrel]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 0.8,
    variants: {
      0: { modelIndex: 0 }, // Regular barrel
      1: { modelIndex: 1 }, // TNT barrel
    },
  },

  [ItemType.WoodCrate]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 0.8,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
    variants: {
      0: { modelIndex: 2 }, // Wood crate
      1: { modelIndex: 2 }, // Wood crate variant
      2: { modelIndex: 3 }, // Metal crate
    },
  },

  [ItemType.HayBale]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 0.8,
  },

  [ItemType.Post]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 1.0,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  // Furniture
  [ItemType.Table]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 13,
    scale: 0.8,
    rotationParam: {
      paramIndex: 0,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  [ItemType.Chair]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 14,
    scale: 0.8,
    rotationParam: {
      paramIndex: 0,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  // Effects
  [ItemType.Flame]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 0.5,
  },

  [ItemType.Smoker]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 7,
    scale: 0.5,
  },

  [ItemType.Tumbleweed]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 8,
    scale: 0.6,
  },

  // Animals
  [ItemType.SceneryKangaCow]: {
    modelFile: "kangacow.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "kangacow.skeleton.rsrc",
    scale: 1.0,
  },

  // Stampede items
  [ItemType.StampedeKanga]: {
    modelFile: "stampedekanga.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "stampedekanga.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.StampedeKangarex]: {
    modelFile: "kangarex.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "kangarex.skeleton.rsrc",
    scale: 1.2,
  },

  [ItemType.Boost]: {
    modelFile: "stampede.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 0.5,
  },

  [ItemType.StampedeCamera]: {
    modelFile: "stampede.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 0.3,
  },

  // Walker enemy
  [ItemType.Wallker]: {
    modelFile: "walker.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "walker.skeleton.rsrc",
    scale: 1.0,
  },

  // Environment
  [ItemType.DeadTree]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 15,
    scale: 1.0,
  },

  [ItemType.Rock]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 9,
    scale: 1.0,
  },

  [ItemType.ElectricFence]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 10,
    scale: 1.0,
  },

  // Swamp/Tremor items
  [ItemType.TremorGrave]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
    rotationParam: {
      paramIndex: 0,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  [ItemType.TremorAlien_Shootout]: {
    modelFile: "tremoralien.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "tremoralien.skeleton.rsrc",
    scale: 1.0,
    rotationParam: {
      paramIndex: 2,
      rotationType: {
        type: "Rotation",
        description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  [ItemType.SwampCabin]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 1.2,
  },

  // Native items
  [ItemType.TeePee]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 11,
    scale: 1.0,
  },

  [ItemType.SpearSkull]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 12,
    scale: 0.8,
  },

  // Powerups
  [ItemType.FreeLifePOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 13,
    scale: 0.5,
  },

  [ItemType.Peso]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 14,
    scale: 0.4,
  },
};

/**
 * Billy Frontier Item Mapper Implementation
 */
export class BillyFrontierItemMapper implements GameItemModelMapper {
  readonly game = Game.BILLY_FRONTIER;

  /**
   * Get model mapping for a Billy Frontier item type
   */
  getMapping(
    itemType: number,
    _levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const base = BILLY_BASE_MAPPINGS[itemType];
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

    return base;
  }

  /**
   * Get all mapped item types
   */
  getMappedTypes(): number[] {
    return Object.keys(BILLY_BASE_MAPPINGS)
      .map(Number)
      .filter((k) => !isNaN(k));
  }

  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean {
    return BILLY_BASE_MAPPINGS[itemType] !== undefined;
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
export const billyFrontierItemMapper = new BillyFrontierItemMapper();
