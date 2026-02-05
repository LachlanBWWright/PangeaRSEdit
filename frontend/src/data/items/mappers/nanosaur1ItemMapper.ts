/**
 * Nanosaur 1 Item Model Mapper
 *
 * NOTE: Nanosaur 1 uses 3DMF model format (not BG3D), which is not currently supported.
 * This mapper returns empty results until a 3DMF parser is implemented.
 *
 * Model files available:
 * - /models/*.3dmf - Level model files (e.g., Level1_Models.3dmf, Global_Models.3dmf)
 * - /skeletons/*.3dmf - Character skeletons (e.g., tricer.3dmf, rex.3dmf)
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";

/**
 * Nanosaur 1 Item Mapper Implementation
 *
 * Currently returns no mappings since 3DMF format is not supported.
 * Models exist as 3DMF files but require a separate parser.
 */
export class Nanosaur1ItemMapper implements GameItemModelMapper {
  readonly game = Game.NANOSAUR;

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

  /**
   * Get all mapped item types - empty since 3DMF not supported
   */
  getMappedTypes(): number[] {
    return [];
  }

  /**
   * Check if an item type has a model - always false since 3DMF not supported
   */
  hasModel(_itemType: number): boolean {
    return false;
  }

  /**
   * Get total number of mapped items
   */
  getMappingCount(): number {
    return 0;
  }
}

/**
 * Singleton instance
 */
export const nanosaur1ItemMapper = new Nanosaur1ItemMapper();
