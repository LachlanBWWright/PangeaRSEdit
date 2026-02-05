/**
 * Bugdom 1 Item Model Mapper
 * 
 * NOTE: Bugdom 1 uses 3DMF model format (not BG3D), which is not currently supported.
 * This mapper returns empty results until a 3DMF parser is implemented.
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

/**
 * Bugdom 1 item model mapper
 * 
 * Currently returns no mappings since 3DMF format is not supported.
 * Models exist as 3DMF files but require a separate parser.
 */
export class BugdomItemMapper implements GameItemModelMapper {
  readonly game = Game.BUGDOM;
  
  /**
   * Model format not supported - always returns undefined
   */
  getMapping(
    _itemType: number,
    _levelNum?: number,
    _params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    // 3DMF format not supported yet
    return undefined;
  }
  
  getMappedTypes(): number[] {
    // No mappings until 3DMF parser is implemented
    return [];
  }
  
  hasModel(_itemType: number): boolean {
    // 3DMF format not supported yet
    return false;
  }
  
  getMappingCount(): number {
    return 0;
  }
}

/**
 * Singleton instance
 */
export const bugdomItemMapper = new BugdomItemMapper();
