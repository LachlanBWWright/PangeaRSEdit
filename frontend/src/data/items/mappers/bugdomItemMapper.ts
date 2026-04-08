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
  ): UniversalItemModelMapping | undefined {
    return BUGDOM_ITEM_MODEL_MAPPINGS[itemType];
  }
  
  getMappedTypes(): number[] {
    return Object.keys(BUGDOM_ITEM_MODEL_MAPPINGS)
      .map(Number)
      .filter(key => BUGDOM_ITEM_MODEL_MAPPINGS[key] !== undefined);
  }
  
  hasModel(itemType: number): boolean {
    return BUGDOM_ITEM_MODEL_MAPPINGS[itemType] !== undefined;
  }
  
  getMappingCount(): number {
    return this.getMappedTypes().length;
  }
}

/**
 * Singleton instance
 */
export const bugdomItemMapper = new BugdomItemMapper();
