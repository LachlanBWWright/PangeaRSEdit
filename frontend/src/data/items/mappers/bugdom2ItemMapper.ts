/**
 * Bugdom 2 Item Model Mapper
 * 
 * Maps Bugdom 2 item types to their 3D models.
 * Note: Bugdom 2 has level-specific items where the same item type
 * may use different models depending on the current level.
 */

import { Game } from "../../globals/globals";
import { 
  type GameItemModelMapper, 
  type UniversalItemModelMapping,
} from "../itemModelTypes";

/**
 * Bugdom 2 level model file associations
 */
const BUGDOM2_LEVEL_MODELS: Record<number, string> = {
  0: "garden.bg3d",
  1: "sidewalk.bg3d",
  2: "plumbing.bg3d",
  3: "playroom.bg3d",
  4: "closet.bg3d",
  5: "gutter.bg3d",
  6: "garbage.bg3d",
  7: "balsa.bg3d",
  8: "park.bg3d",
  9: "pond.bg3d",
  10: "backyard.bg3d",
};

/**
 * Global item mappings (available on all levels)
 */
const GLOBAL_ITEM_MAPPINGS: Record<number, UniversalItemModelMapping> = {
  // TODO: Add global item mappings
  // These are items that use global.bg3d or foliage.bg3d
};

/**
 * Level-specific item mappings
 * Key format: `${levelNum}_${itemType}`
 */
const LEVEL_ITEM_MAPPINGS: Record<string, UniversalItemModelMapping> = {
  // TODO: Add level-specific mappings
  // Example: "0_5" means level 0 (garden), item type 5
};

/**
 * Bugdom 2 item model mapper
 */
export class Bugdom2ItemMapper implements GameItemModelMapper {
  readonly game = Game.BUGDOM_2;
  
  getMapping(
    itemType: number,
    levelNum?: number,
    _params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    // First check global mappings
    const globalMapping = GLOBAL_ITEM_MAPPINGS[itemType];
    if (globalMapping) return globalMapping;
    
    // Then check level-specific mappings
    if (levelNum !== undefined) {
      const levelKey = `${levelNum}_${itemType}`;
      const levelMapping = LEVEL_ITEM_MAPPINGS[levelKey];
      if (levelMapping) return levelMapping;
    }
    
    return undefined;
  }
  
  getMappedTypes(): number[] {
    const globalTypes = Object.keys(GLOBAL_ITEM_MAPPINGS).map(Number);
    const levelTypes = Object.keys(LEVEL_ITEM_MAPPINGS)
      .map(key => parseInt(key.split("_")[1]))
      .filter(n => !isNaN(n));
    
    return [...new Set([...globalTypes, ...levelTypes])];
  }
  
  hasModel(itemType: number): boolean {
    // Check global first
    if (GLOBAL_ITEM_MAPPINGS[itemType]) return true;
    
    // Check if any level has this item
    for (let level = 0; level <= 10; level++) {
      if (LEVEL_ITEM_MAPPINGS[`${level}_${itemType}`]) return true;
    }
    
    return false;
  }
  
  getMappingCount(): number {
    return this.getMappedTypes().length;
  }
  
  /**
   * Get level-specific model file
   */
  getLevelModelFile(levelNum: number): string | undefined {
    return BUGDOM2_LEVEL_MODELS[levelNum];
  }
}

/**
 * Singleton instance
 */
export const bugdom2ItemMapper = new Bugdom2ItemMapper();
