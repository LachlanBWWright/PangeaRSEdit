/**
 * Nanosaur 1 Item Model Mapper
 *
 * Maps Nanosaur 1 item types to their corresponding 3D models.
 * Nanosaur 1 has a smaller set of items compared to newer games.
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { ItemType } from "../nanosaurItemType";

/**
 * Base mappings for Nanosaur 1 items
 * Most models are stored in level-specific bg3d files.
 */
const NANOSAUR1_BASE_MAPPINGS: Record<number, UniversalItemModelMapping> = {
  // Trees
  [ItemType.Tree]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
    variants: {
      0: { modelIndex: 0 }, // Fern
      1: { modelIndex: 1 }, // StickPalm
      2: { modelIndex: 2 }, // Bamboo
      3: { modelIndex: 3 }, // Cypress
      4: { modelIndex: 4 }, // MainPalm
      5: { modelIndex: 5 }, // PinePalm
    },
  },

  // Powerups
  [ItemType.PowerUp]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 0.5,
    variants: {
      0: { modelIndex: 0 }, // HeatSeek
      1: { modelIndex: 1 }, // Laser
      2: { modelIndex: 2 }, // TriBlast
      3: { modelIndex: 3 }, // Health
      4: { modelIndex: 4 }, // Shield
      5: { modelIndex: 5 }, // Nuke
      6: { modelIndex: 6 }, // Sonic
    },
  },

  // Eggs
  [ItemType.Egg]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 0.4,
    variants: {
      0: { modelIndex: 6 },  // Egg type 1
      1: { modelIndex: 7 },  // Egg type 2
      2: { modelIndex: 8 },  // Egg type 3
      3: { modelIndex: 9 },  // Egg type 4
      4: { modelIndex: 10 }, // Egg type 5
    },
  },

  // Enemies (skeleton-based models)
  [ItemType.Enemy_Tricer]: {
    modelFile: "tricer.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "tricer.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.Enemy_Rex]: {
    modelFile: "rex.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "rex.skeleton.rsrc",
    scale: 1.5,
  },

  [ItemType.Enemy_Ptera]: {
    modelFile: "ptera.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "ptera.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.Enemy_Stego]: {
    modelFile: "stego.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "stego.skeleton.rsrc",
    scale: 1.2,
  },

  [ItemType.Enemy_Spitter]: {
    modelFile: "spitter.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "spitter.skeleton.rsrc",
    scale: 0.8,
  },

  // Hazards
  [ItemType.LavaPatch]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 11,
    scale: 1.0,
  },

  [ItemType.GasVent]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 12,
    scale: 0.8,
  },

  // Environment
  [ItemType.Boulder]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 13,
    scale: 1.0,
  },

  [ItemType.RollingBoulder]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 14,
    scale: 1.0,
  },

  [ItemType.Mushroom]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 15,
    scale: 0.6,
  },

  [ItemType.Bush]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 16,
    scale: 0.7,
  },

  [ItemType.Crystal]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 17,
    scale: 0.5,
    variants: {
      0: { modelIndex: 17 },
      1: { modelIndex: 18 },
      2: { modelIndex: 19 },
    },
  },

  // Level elements
  [ItemType.TimePortal]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 7,
    scale: 1.0,
  },

  [ItemType.WaterPatch]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 20,
    scale: 1.0,
  },

  [ItemType.StepStone]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 21,
    scale: 0.8,
  },

  [ItemType.SporePod]: {
    modelFile: "level0.bg3d",
    modelPath: "models",
    modelIndex: 22,
    scale: 0.6,
  },
};

/**
 * Nanosaur 1 Item Mapper Implementation
 */
export class Nanosaur1ItemMapper implements GameItemModelMapper {
  readonly game = Game.NANOSAUR;

  /**
   * Get model mapping for a Nanosaur 1 item type
   */
  getMapping(
    itemType: number,
    _levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const base = NANOSAUR1_BASE_MAPPINGS[itemType];
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
    return Object.keys(NANOSAUR1_BASE_MAPPINGS)
      .map(Number)
      .filter((k) => !isNaN(k));
  }

  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean {
    return NANOSAUR1_BASE_MAPPINGS[itemType] !== undefined;
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
export const nanosaur1ItemMapper = new Nanosaur1ItemMapper();
