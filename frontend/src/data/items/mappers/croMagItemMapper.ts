/**
 * Cro-Mag Rally Item Model Mapper
 *
 * Maps Cro-Mag Rally item types to their corresponding 3D models.
 * Cro-Mag Rally uses track-specific BG3D files organized by theme.
 *
 * Tracks/Themes:
 * - Stone Age (prehistoric)
 * - Bronze Age (desert/Egypt)
 * - Ice Age (arctic)
 * - Crete (Mediterranean)
 * - China
 * - Viking/Celtic
 * - Jungle
 * - Atlantis
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { ItemType } from "../croMagItemType";

/**
 * Track-specific model files (for future use with level-aware loading)
 */
export const CROMAG_TRACK_MODEL_FILES: Record<number, string> = {
  0: "stonehenge.bg3d",
  1: "egypt.bg3d",
  2: "ice.bg3d",
  3: "crete.bg3d",
  4: "china.bg3d",
  5: "Viking.bg3d",
  6: "jungle.bg3d",
  7: "atlantis.bg3d",
};

/**
 * Base mappings for Cro-Mag Rally items
 */
const CROMAG_BASE_MAPPINGS: Record<number, UniversalItemModelMapping> = {
  // Environmental - Cacti (Desert/Stone Age)
  [ItemType.Cactus]: {
    modelFile: "stonehenge.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
    variants: {
      0: { modelIndex: 0 },
      1: { modelIndex: 1 },
    },
  },

  // Signs (Global)
  [ItemType.Sign]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation", description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
    variants: {
      0: { modelIndex: 0 }, // Fire sign
      1: { modelIndex: 1 }, // Ice sign
      2: { modelIndex: 2 }, // Other signs...
    },
  },

  // Trees (Track-specific)
  [ItemType.Tree]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 1.0,
    variants: {
      0: { modelIndex: 2 },
      1: { modelIndex: 3 },
      2: { modelIndex: 4 },
      3: { modelIndex: 5 },
    },
  },

  // Power-ups (Global)
  [ItemType.POW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 0.5,
    variants: {
      0: { modelIndex: 6 },  // Bone
      1: { modelIndex: 7 },  // Oil slick
      2: { modelIndex: 8 },  // Bird bomb
      3: { modelIndex: 9 },  // Freeze
      4: { modelIndex: 10 }, // Nitro
    },
  },

  [ItemType.StickyTiresPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 11,
    scale: 0.5,
  },

  [ItemType.SuspensionPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 12,
    scale: 0.5,
  },

  [ItemType.InvisibilityPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 13,
    scale: 0.5,
  },

  // Finish Line (Global)
  [ItemType.FinishLine]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 14,
    scale: 1.0,
  },

  // Decorative Items
  [ItemType.Vase]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 0.8,
    rotationParam: {
      paramIndex: 0,
      rotationType: {
        type: "Rotation", description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
  },

  [ItemType.Rickshaw]: {
    modelFile: "china.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
  },

  [ItemType.FlagPole]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 15,
    scale: 1.0,
  },

  [ItemType.Token]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 16,
    scale: 0.4,
  },

  // Easter Island
  [ItemType.EasterHead]: {
    modelFile: "stonehenge.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 1.2,
  },

  // Ice Age
  [ItemType.SnoMan]: {
    modelFile: "ice.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
  },

  [ItemType.CampFire]: {
    modelFile: "ice.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 0.8,
  },

  [ItemType.Yeti]: {
    modelFile: "Yeti.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "yeti.skeleton.rsrc",
    scale: 1.0,
  },

  // Egypt/Bronze Age
  [ItemType.Pillar]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 1.0,
  },

  [ItemType.Pylon]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 1.0,
  },

  [ItemType.Boat]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 3,
    scale: 1.2,
  },

  [ItemType.Sphinx]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 1.5,
  },

  [ItemType.Statue]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 17,
    scale: 1.0,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation", description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
    variants: {
      0: { modelIndex: 17 }, // Bull
      1: { modelIndex: 18 }, // Cat
      2: { modelIndex: 19 }, // Other statues
    },
  },

  // Team mode items
  [ItemType.TeamTorch]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 20,
    scale: 0.8,
  },

  [ItemType.TeamBase]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 21,
    scale: 1.0,
  },

  // Rocks (Global)
  [ItemType.Rock]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 22,
    scale: 1.0,
    variants: {
      0: { modelIndex: 22 }, // Grey rock
      1: { modelIndex: 23 }, // Other rocks
    },
  },

  // Stone Age/Prehistoric
  [ItemType.BrontoNeck]: {
    modelFile: "stonehenge.bg3d",
    modelPath: "models",
    modelIndex: 3,
    scale: 1.5,
  },

  [ItemType.RockOverhang]: {
    modelFile: "stonehenge.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 1.0,
  },

  [ItemType.TarPatch]: {
    modelFile: "stonehenge.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 1.0,
  },

  // Jungle
  [ItemType.Vine]: {
    modelFile: "jungle.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
  },

  [ItemType.AztecHead]: {
    modelFile: "jungle.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 1.2,
  },

  [ItemType.TotemPole]: {
    modelFile: "jungle.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 1.0,
  },

  [ItemType.Flower]: {
    modelFile: "jungle.bg3d",
    modelPath: "models",
    modelIndex: 3,
    scale: 0.5,
  },

  // Viking/Celtic
  [ItemType.CastleTower]: {
    modelFile: "Viking.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.5,
  },

  [ItemType.Catapult]: {
    modelFile: "Viking.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 1.0,
  },

  [ItemType.Baracade]: {
    modelFile: "Viking.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 1.0,
  },

  [ItemType.VikingFlag]: {
    modelFile: "Viking.bg3d",
    modelPath: "models",
    modelIndex: 3,
    scale: 0.8,
  },

  [ItemType.WeaponsRack]: {
    modelFile: "Viking.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 1.0,
  },

  [ItemType.StoneHenge]: {
    modelFile: "Viking.bg3d",
    modelPath: "models",
    modelIndex: 5,
    scale: 1.5,
  },

  [ItemType.Druid]: {
    modelFile: "Druid.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "druid.skeleton.rsrc",
    scale: 1.0,
  },

  // China
  [ItemType.Gong]: {
    modelFile: "china.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 1.0,
  },

  [ItemType.Dragon]: {
    modelFile: "Dragon.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "dragon.skeleton.rsrc",
    scale: 1.5,
  },

  // Crete
  [ItemType.Coliseum]: {
    modelFile: "crete.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 2.0,
  },

  [ItemType.Clock]: {
    modelFile: "crete.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 1.0,
  },

  [ItemType.Goddess]: {
    modelFile: "crete.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 1.0,
  },

  // Buildings (Track-specific types)
  [ItemType.House]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 24,
    scale: 1.0,
    rotationParam: {
      paramIndex: 1,
      rotationType: {
        type: "Rotation", description: "Rotation angle",
        divisions: 8,
        multiplier: "PI2/8",
      },
    },
    variants: {
      0: { modelIndex: 24 }, // Hut
      1: { modelIndex: 25 }, // Cabin
      2: { modelIndex: 26 }, // Dome
      3: { modelIndex: 27 }, // Other houses
    },
  },

  [ItemType.Cauldron]: {
    modelFile: "Viking.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 0.8,
  },

  [ItemType.Well]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 28,
    scale: 1.0,
  },

  [ItemType.Stump]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 29,
    scale: 0.6,
  },

  [ItemType.TorchPot]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 30,
    scale: 0.8,
  },

  // Atlantis
  [ItemType.Capsule]: {
    modelFile: "atlantis.bg3d",
    modelPath: "models",
    modelIndex: 0,
    scale: 1.0,
  },

  [ItemType.Clam]: {
    modelFile: "atlantis.bg3d",
    modelPath: "models",
    modelIndex: 1,
    scale: 0.8,
  },

  [ItemType.SeaMine]: {
    modelFile: "atlantis.bg3d",
    modelPath: "models",
    modelIndex: 2,
    scale: 0.6,
  },

  [ItemType.Cannon]: {
    modelFile: "atlantis.bg3d",
    modelPath: "models",
    modelIndex: 3,
    scale: 1.0,
  },

  // Hazards
  [ItemType.DustDevil]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 31,
    scale: 1.0,
  },

  [ItemType.LavaGenerator]: {
    modelFile: "stonehenge.bg3d",
    modelPath: "models",
    modelIndex: 6,
    scale: 1.0,
  },

  [ItemType.Volcano]: {
    modelFile: "stonehenge.bg3d",
    modelPath: "models",
    modelIndex: 7,
    scale: 2.0,
  },

  [ItemType.BubbleGenerator]: {
    modelFile: "atlantis.bg3d",
    modelPath: "models",
    modelIndex: 4,
    scale: 0.5,
  },

  [ItemType.Waterfall]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 32,
    scale: 1.0,
  },

  // Spline-based creatures (animated along paths)
  [ItemType.CamelSpline]: {
    modelFile: "Camel.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "camel.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.BeetleSpline]: {
    modelFile: "Beetle.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "beetle.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.SharkSpline]: {
    modelFile: "Shark.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "shark.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.TrollSpline]: {
    modelFile: "Troll.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "troll.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.PteradactylSpline]: {
    modelFile: "Pterodactyl.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "pteradactyl.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.MummySpline]: {
    modelFile: "Mummy.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "mummy.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.PolarBearSpline]: {
    modelFile: "PolarBear.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "polarbear.skeleton.rsrc",
    scale: 1.0,
  },

  [ItemType.VikingSpline]: {
    modelFile: "viking_enemy.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "viking_enemy.skeleton.rsrc",
    scale: 1.0,
  },
};

/**
 * Cro-Mag Rally Item Mapper Implementation
 */
export class CroMagItemMapper implements GameItemModelMapper {
  readonly game = Game.CRO_MAG;
  
  /**
   * Get model mapping for a Cro-Mag Rally item type
   */
  getMapping(
    itemType: number,
    _levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const base = CROMAG_BASE_MAPPINGS[itemType];
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
    return Object.keys(CROMAG_BASE_MAPPINGS)
      .map(Number)
      .filter((k) => !isNaN(k));
  }

  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean {
    return CROMAG_BASE_MAPPINGS[itemType] !== undefined;
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
export const croMagItemMapper = new CroMagItemMapper();
