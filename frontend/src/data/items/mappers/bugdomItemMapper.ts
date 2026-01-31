/**
 * Bugdom 1 Item Model Mapper
 * 
 * Maps Bugdom 1 item types to their 3D models.
 * Bugdom 1 has level-specific items similar to Bugdom 2.
 */

import { Game } from "../../globals/globals";
import { 
  type GameItemModelMapper, 
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { BUGDOM_ITEM_MODEL_MAPPINGS, type BugdomItemModelMapping } from "../bugdomItemModelMapping";

/**
 * Bugdom 1 level model file associations
 */
const BUGDOM_LEVEL_MODELS: Record<number, string> = {
  0: "lawn1.bg3d",
  1: "lawn2.bg3d",
  2: "pond.bg3d",
  3: "forest.bg3d",
  4: "hive.bg3d",
  5: "night.bg3d",
  6: "anthill.bg3d",
  7: "antqueen.bg3d",
  8: "lawn3.bg3d",
  9: "forest2.bg3d",
};

/**
 * Convert Bugdom-specific mapping to universal format
 */
function convertToUniversal(mapping: BugdomItemModelMapping): UniversalItemModelMapping {
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
 * Bugdom 1 item model mapper
 */
export class BugdomItemMapper implements GameItemModelMapper {
  readonly game = Game.BUGDOM;
  
  getMapping(
    itemType: number,
    _levelNum?: number,
    _params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const mapping = BUGDOM_ITEM_MODEL_MAPPINGS[itemType];
    if (!mapping) return undefined;
    
    return convertToUniversal(mapping);
  }
  
  getMappedTypes(): number[] {
    return Object.keys(BUGDOM_ITEM_MODEL_MAPPINGS)
      .map(Number)
      .filter(k => !isNaN(k) && BUGDOM_ITEM_MODEL_MAPPINGS[k] !== undefined);
  }
  
  hasModel(itemType: number): boolean {
    return BUGDOM_ITEM_MODEL_MAPPINGS[itemType] !== undefined;
  }
  
  getMappingCount(): number {
    return this.getMappedTypes().length;
  }
  
  /**
   * Get level-specific model file
   */
  getLevelModelFile(levelNum: number): string | undefined {
    return BUGDOM_LEVEL_MODELS[levelNum];
  }
}

/**
 * Singleton instance
 */
export const bugdomItemMapper = new BugdomItemMapper();
