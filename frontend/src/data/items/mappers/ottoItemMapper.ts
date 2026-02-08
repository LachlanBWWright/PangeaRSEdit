/**
 * Otto Matic Item Model Mapper
 * 
 * Maps Otto Matic item types to their 3D models using the existing
 * ottoItemModelMapping.ts data.
 * 
 * Supports param-dependent model selection for items like Human where
 * the p1 parameter determines which skeleton model to use.
 * Uses the standardized TypeSelectorParam with modelVariants for param-based model selection.
 */

import { Game } from "../../globals/globals";
import { 
  type GameItemModelMapper, 
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { OTTO_ITEM_MODEL_MAPPINGS, type ItemModelMapping } from "../ottoItemModelMapping";
import { ItemType } from "../ottoItemType";
import { 
  OTTO_HUMAN_TYPE, 
  type ModelVariant,
  type TypeSelectorParam,
  getModelVariant,
  hasModelVariants,
  getParamByIndex,
} from "../standardParamTypes";

/**
 * Configuration for items with param-dependent models
 * Maps item type to the param index and TypeSelectorParam defining the model variants
 */
interface ParamDependentConfig {
  paramIndex: 0 | 1 | 2 | 3;
  paramType: TypeSelectorParam;
}

/**
 * Registry of items with param-dependent model selection
 * The key is the item type, value describes which param controls the model variant
 */
const PARAM_DEPENDENT_ITEMS: Record<number, ParamDependentConfig> = {
  [ItemType.Human]: {
    paramIndex: 1, // p1 controls human type
    paramType: OTTO_HUMAN_TYPE,
  },
};

/**
 * Convert ModelVariant to UniversalItemModelMapping
 */
function convertModelVariant(variant: ModelVariant): UniversalItemModelMapping {
  return {
    modelFile: variant.modelFile,
    modelPath: variant.modelPath,
    modelIndex: variant.modelIndex,
    groupSize: variant.groupSize,
    requiresSkeleton: variant.requiresSkeleton,
    skeletonFile: variant.skeletonFile,
    scale: variant.scale,
    scaleXZ: variant.scaleXZ,
    scaleY: variant.scaleY,
    rotationY: variant.rotationY,
    positionOffset: variant.positionOffset,
    citations: variant.citations,
  };
}

/**
 * Convert Otto-specific mapping to universal format
 */
function convertToUniversal(mapping: ItemModelMapping): UniversalItemModelMapping {
  return {
    modelFile: mapping.modelFile,
    modelPath: mapping.modelPath,
    modelIndex: mapping.modelIndex,
    groupSize: mapping.groupSize,
    requiresSkeleton: mapping.requiresSkeleton,
    skeletonFile: mapping.skeletonFile,
    scale: mapping.scale,
    scaleXZ: mapping.scaleXZ,
    scaleY: mapping.scaleY,
    rotationY: mapping.rotationY,
    positionOffset: mapping.positionOffset,
    citations: mapping.citations,
  };
}

/**
 * Get param-dependent model mapping using the standardized param type system
 */
function getParamDependentMapping(
  config: ParamDependentConfig,
  params?: { p0: number; p1: number; p2: number; p3: number },
): UniversalItemModelMapping | undefined {
  const paramValue = params ? getParamByIndex(params, config.paramIndex) : 0;
  const variant = getModelVariant(paramValue, config.paramType);
  
  if (!variant) {
    // Fall back to first variant if param value is out of range
    const firstVariant = getModelVariant(0, config.paramType);
    return firstVariant ? convertModelVariant(firstVariant) : undefined;
  }
  
  return convertModelVariant(variant);
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
    // Check for param-dependent items first
    const paramConfig = PARAM_DEPENDENT_ITEMS[itemType];
    if (paramConfig) {
      return getParamDependentMapping(paramConfig, params);
    }
    
    // Standard mapping lookup
    const mapping = OTTO_ITEM_MODEL_MAPPINGS[itemType];
    if (!mapping) return undefined;
    
    return convertToUniversal(mapping);
  }
  
  /**
   * Check if an item type has a model mapping.
   * Includes both static mappings and param-dependent items.
   */
  hasModel(itemType: number): boolean {
    // Check param-dependent items first
    const paramConfig = PARAM_DEPENDENT_ITEMS[itemType];
    if (paramConfig && hasModelVariants(paramConfig.paramType)) {
      return true;
    }
    
    return OTTO_ITEM_MODEL_MAPPINGS[itemType] !== undefined;
  }
  
  getMappedTypes(): number[] {
    const staticTypes = Object.keys(OTTO_ITEM_MODEL_MAPPINGS)
      .map(Number)
      .filter(k => !isNaN(k) && OTTO_ITEM_MODEL_MAPPINGS[k] !== undefined);
    
    // Add param-dependent types
    const paramDependentTypes = Object.keys(PARAM_DEPENDENT_ITEMS)
      .map(Number)
      .filter(k => !isNaN(k));
    
    // Combine and deduplicate
    const allTypes = new Set([...staticTypes, ...paramDependentTypes]);
    return Array.from(allTypes).sort((a, b) => a - b);
  }
  
  getMappingCount(): number {
    return this.getMappedTypes().length;
  }
  
  /**
   * Check if an item type has param-dependent model selection.
   * For param-dependent items, the model varies based on item parameters.
   */
  isParamDependent(itemType: number): boolean {
    return itemType in PARAM_DEPENDENT_ITEMS;
  }
  
  /**
   * Get the param-dependent configuration for an item type.
   * Returns undefined if the item type is not param-dependent.
   */
  getParamDependentConfig(itemType: number): ParamDependentConfig | undefined {
    return PARAM_DEPENDENT_ITEMS[itemType];
  }
  
  /**
   * Get param-dependent options for display.
   * Returns undefined if the item type is not param-dependent.
   */
  getParamDependentOptions(itemType: number): {
    paramIndex: number;
    options: { value: number; label: string }[];
  } | undefined {
    const config = PARAM_DEPENDENT_ITEMS[itemType];
    if (!config) return undefined;
    
    const options = Object.entries(config.paramType.options).map(([value, label]) => ({
      value: Number(value),
      label,
    }));
    
    return {
      paramIndex: config.paramIndex,
      options,
    };
  }
}

/**
 * Singleton instance
 */
export const ottoItemMapper = new OttoItemMapper();
