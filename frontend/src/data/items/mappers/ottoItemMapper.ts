/**
 * Otto Matic Item Model Mapper
 * 
 * Maps Otto Matic item types to their 3D models using the existing
 * ottoItemModelMapping.ts data.
 * 
 * Supports param-dependent model selection for items like Human where
 * the p1 parameter determines which skeleton model to use.
 */

import { Game } from "../../globals/globals";
import { 
  type GameItemModelMapper, 
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { OTTO_ITEM_MODEL_MAPPINGS, type ItemModelMapping } from "../ottoItemModelMapping";
import { ItemType } from "../ottoItemType";

/**
 * Human type variants based on p1 parameter
 * From Items/Humans.c - MakeHuman() uses itemPtr->parm[1]
 */
const HUMAN_TYPE_MODELS: Record<number, { modelFile: string; skeletonFile: string }> = {
  0: { modelFile: "Farmer.bg3d", skeletonFile: "Farmer.skeleton.rsrc" },
  1: { modelFile: "BeeWoman.bg3d", skeletonFile: "BeeWoman.skeleton.rsrc" },
  2: { modelFile: "Scientist.bg3d", skeletonFile: "Scientist.skeleton.rsrc" },
  3: { modelFile: "SkirtLady.bg3d", skeletonFile: "SkirtLady.skeleton.rsrc" },
};

/**
 * Convert Otto-specific mapping to universal format
 */
function convertToUniversal(mapping: ItemModelMapping): UniversalItemModelMapping {
  return {
    modelFile: mapping.modelFile,
    modelPath: mapping.modelPath,
    modelIndex: mapping.modelIndex,
    requiresSkeleton: mapping.requiresSkeleton,
    skeletonFile: mapping.skeletonFile,
    scale: mapping.scale,
    rotationY: mapping.rotationY,
  };
}

/**
 * Get Human model based on p1 parameter
 */
function getHumanMapping(
  params?: { p0: number; p1: number; p2: number; p3: number },
): UniversalItemModelMapping {
  const humanType = params?.p1 ?? 0;
  const modelInfo = HUMAN_TYPE_MODELS[humanType] ?? HUMAN_TYPE_MODELS[0];
  
  return {
    modelFile: modelInfo.modelFile,
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: modelInfo.skeletonFile,
  };
}

/**
 * Otto Matic item model mapper
 */
export class OttoItemMapper implements GameItemModelMapper {
  readonly game = Game.OTTO_MATIC;
  
  getMapping(
    itemType: number,
    _levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    // Handle param-dependent item types
    if (itemType === ItemType.Human) {
      return getHumanMapping(params);
    }
    
    // Standard mapping lookup
    const mapping = OTTO_ITEM_MODEL_MAPPINGS[itemType];
    if (!mapping) return undefined;
    
    return convertToUniversal(mapping);
  }
  
  /**
   * Check if an item type has a model mapping.
   * Note: Human (type 4) is param-dependent and always has a model.
   */
  hasModel(itemType: number): boolean {
    if (itemType === ItemType.Human) {
      return true; // Always has model (param-dependent)
    }
    return OTTO_ITEM_MODEL_MAPPINGS[itemType] !== undefined;
  }
  
  getMappedTypes(): number[] {
    const staticTypes = Object.keys(OTTO_ITEM_MODEL_MAPPINGS)
      .map(Number)
      .filter(k => !isNaN(k) && OTTO_ITEM_MODEL_MAPPINGS[k] !== undefined);
    
    // Add Human type since it's param-dependent and not in static mappings
    staticTypes.push(ItemType.Human);
    
    return staticTypes.sort((a, b) => a - b);
  }
  
  getMappingCount(): number {
    return this.getMappedTypes().length;
  }
  
  /**
   * Check if an item type has param-dependent model selection.
   * For param-dependent items, the model varies based on item parameters.
   */
  isParamDependent(itemType: number): boolean {
    return itemType === ItemType.Human;
  }
  
  /**
   * Get param-dependent options for display.
   * Returns undefined if the item type is not param-dependent.
   */
  getParamDependentOptions(itemType: number): {
    paramIndex: number;
    options: { value: number; label: string }[];
  } | undefined {
    if (itemType === ItemType.Human) {
      return {
        paramIndex: 1,
        options: [
          { value: 0, label: "Farmer" },
          { value: 1, label: "Bee Woman" },
          { value: 2, label: "Scientist" },
          { value: 3, label: "Skirt Lady" },
        ],
      };
    }
    return undefined;
  }
  
  /**
   * Get human type names for display
   */
  getHumanTypeNames(): Record<number, string> {
    return {
      0: "Farmer",
      1: "Bee Woman",
      2: "Scientist", 
      3: "Skirt Lady",
    };
  }
}

/**
 * Singleton instance
 */
export const ottoItemMapper = new OttoItemMapper();
