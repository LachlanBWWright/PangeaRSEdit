/**
 * Otto Matic Item Model Mapper
 * 
 * Maps Otto Matic item types to their 3D models using the existing
 * ottoItemModelMapping.ts data.
 */

import { Game } from "../../globals/globals";
import { 
  type GameItemModelMapper, 
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { OTTO_ITEM_MODEL_MAPPINGS, type ItemModelMapping } from "../ottoItemModelMapping";

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
 * Otto Matic item model mapper
 */
export class OttoItemMapper implements GameItemModelMapper {
  readonly game = Game.OTTO_MATIC;
  
  getMapping(
    itemType: number,
    _levelNum?: number,
    _params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const mapping = OTTO_ITEM_MODEL_MAPPINGS[itemType];
    if (!mapping) return undefined;
    
    return convertToUniversal(mapping);
  }
  
  getMappedTypes(): number[] {
    return Object.keys(OTTO_ITEM_MODEL_MAPPINGS)
      .map(Number)
      .filter(k => !isNaN(k) && OTTO_ITEM_MODEL_MAPPINGS[k] !== undefined);
  }
  
  hasModel(itemType: number): boolean {
    return OTTO_ITEM_MODEL_MAPPINGS[itemType] !== undefined;
  }
  
  getMappingCount(): number {
    return this.getMappedTypes().length;
  }
}

/**
 * Singleton instance
 */
export const ottoItemMapper = new OttoItemMapper();
