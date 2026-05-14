/**
 * Bugdom 1 Item Model Mapper
 *
 * Bugdom 1 uses 3DMF model format which is supported by the worker (auto-detected by magic number).
 *
 * Model files available:
 * - /models/*.3dmf - Level model files (e.g., Lawn_Models1.3dmf, Forest_Models.3dmf)
 * - /skeletons/*.3dmf - Character skeletons (e.g., Ant.3dmf, Spider.3dmf)
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { BUGDOM_ITEM_MODEL_MAPPINGS } from "../bugdomItemModelMapping";
import { ItemType } from "../bugdomItemType";
import { getBugdomSourceDerivedMapping } from "../bugdomItemModelDefinitions";

function resolveVariant(
  mapping: UniversalItemModelMapping,
  paramValue: number,
): UniversalItemModelMapping {
  const variant = mapping.variants?.[paramValue];
  if (!variant) {
    return mapping;
  }

  return {
    ...mapping,
    modelFile: variant.modelFile ?? mapping.modelFile,
    modelIndex: variant.modelIndex,
  };
}

function resolveBugdomFallbackMapping(
  itemType: number,
  mapping: UniversalItemModelMapping,
  params?: { p0: number; p1: number; p2: number; p3: number },
): UniversalItemModelMapping {
  const variantResolved =
    itemType === ItemType.Grass || itemType === ItemType.Clover
      ? resolveVariant(mapping, params?.p0 ?? 0)
      : mapping;

  return {
    ...variantResolved,
    verificationStatus: "approximate",
  };
}

const LEVEL_DEPENDENT_TYPES = new Set<number>([
  ItemType.Grass,
  ItemType.Rock,
  ItemType.LawnDoor,
]);

const PARAM_DEPENDENT_TYPES = new Set<number>([
  ItemType.Grass,
  ItemType.Clover,
  ItemType.PondGrass,
  ItemType.Reed,
  ItemType.Rock,
  ItemType.LawnDoor,
  ItemType.HoneycombPlatform,
  ItemType.Detonator,
  ItemType.HoneyTube,
]);

/**
 * Bugdom 1 item model mapper
 *
 * Uses 3DMF format which is automatically detected and parsed by the worker.
 */
export class BugdomItemMapper implements GameItemModelMapper {
  readonly game = Game.BUGDOM;

  /**
   * Get model mapping for a Bugdom item
   */
  getMapping(
    itemType: number,
    levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
    flags?: number,
  ): UniversalItemModelMapping | undefined {
    const sourceDerived = getBugdomSourceDerivedMapping(itemType, {
      levelNum,
      params,
      flags,
    });
    if (sourceDerived) {
      return sourceDerived;
    }

    const mapping = BUGDOM_ITEM_MODEL_MAPPINGS[itemType];
    if (!mapping) {
      return undefined;
    }

    return resolveBugdomFallbackMapping(itemType, mapping, params);
  }

  getMappedTypes(): number[] {
    return Object.keys(BUGDOM_ITEM_MODEL_MAPPINGS)
      .map(Number)
      .filter((key) => BUGDOM_ITEM_MODEL_MAPPINGS[key] !== undefined);
  }

  hasModel(itemType: number): boolean {
    return BUGDOM_ITEM_MODEL_MAPPINGS[itemType] !== undefined;
  }

  getMappingCount(): number {
    return this.getMappedTypes().length;
  }

  isLevelDependent(itemType: number): boolean {
    return LEVEL_DEPENDENT_TYPES.has(itemType);
  }

  isParamDependent(itemType: number): boolean {
    return PARAM_DEPENDENT_TYPES.has(itemType);
  }

  getParamDependentConfig(itemType: number):
    | {
        paramIndex: 0 | 1 | 2 | 3;
        paramType: {
          options: Record<number, string>;
          modelVariants?: Record<number, unknown>;
        };
      }
    | undefined {
    switch (itemType) {
      case ItemType.Grass:
        return {
          paramIndex: 0,
          paramType: {
            options: {
              0: "Grass",
              1: "Grass 2",
            },
          },
        };
      case ItemType.Clover:
        return {
          paramIndex: 0,
          paramType: {
            options: {
              0: "Clover",
              1: "Clover 2",
            },
          },
        };
      case ItemType.PondGrass:
        return {
          paramIndex: 0,
          paramType: {
            options: {
              0: "Pond grass 1",
              1: "Pond grass 2",
              2: "Pond grass 3",
            },
          },
        };
      case ItemType.Reed:
        return {
          paramIndex: 0,
          paramType: {
            options: {
              0: "Short reed",
              1: "Tall reed",
            },
          },
        };
      case ItemType.Rock:
        return {
          paramIndex: 0,
          paramType: {
            options: {
              0: "Primary rock",
              1: "Secondary rock",
            },
          },
        };
      case ItemType.LawnDoor:
        return {
          paramIndex: 0,
          paramType: {
            options: {
              0: "Green",
              1: "Teal",
              2: "Red",
              3: "Orange",
              4: "Purple",
            },
          },
        };
      case ItemType.HoneycombPlatform:
        return {
          paramIndex: 0,
          paramType: {
            options: {
              0: "Brick",
              1: "Steel",
            },
          },
        };
      case ItemType.Detonator:
        return {
          paramIndex: 1,
          paramType: {
            options: {
              0: "Green",
              1: "Orange",
              2: "Purple",
              3: "Red",
              4: "Teal",
            },
          },
        };
      case ItemType.HoneyTube:
        return {
          paramIndex: 0,
          paramType: {
            options: {
              0: "Bent tube",
              1: "Straight tube (remapped)",
              2: "Straight tube",
              3: "Taper tube",
            },
          },
        };
      default:
        return undefined;
    }
  }
}

/**
 * Singleton instance
 */
export const bugdomItemMapper = new BugdomItemMapper();
