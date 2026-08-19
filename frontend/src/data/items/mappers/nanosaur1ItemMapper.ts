/**
 * Nanosaur 1 Item Model Mapper
 *
 * Nanosaur 1 uses 3DMF model format which is supported by the worker (auto-detected by magic number).
 *
 * Model files available:
 * - /models/*.3dmf - Level model files (e.g., Level1_Models.3dmf, Global_Models.3dmf)
 * - /skeletons/*.3dmf - Character skeletons (e.g., Tricer.3dmf, Rex.3dmf)
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { NANOSAUR_ITEM_MODEL_MAPPINGS } from "../nanosaurItemModelMapping";

/**
 * Nanosaur 1 Item Mapper Implementation
 *
 * Uses 3DMF format which is automatically detected and parsed by the worker.
 */
export class Nanosaur1ItemMapper implements GameItemModelMapper {
  readonly game = Game.NANOSAUR;

  /**
   * Get model mapping for a Nanosaur item
   */
  getMapping(
    itemType: number,
    _levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const mapping = NANOSAUR_ITEM_MODEL_MAPPINGS[itemType];
    if (!mapping) {
      return undefined;
    }

    const variantIndex = params?.p0 ?? 0;
    if (!mapping.variants || mapping.variants[variantIndex] === undefined) {
      return mapping;
    }

    return {
      ...mapping,
      modelFile: mapping.variants[variantIndex]?.modelFile ?? mapping.modelFile,
      modelIndex: mapping.variants[variantIndex]?.modelIndex ?? mapping.modelIndex,
    };
  }

  /**
   * Get all mapped item types
   */
  getMappedTypes(): number[] {
    return Object.keys(NANOSAUR_ITEM_MODEL_MAPPINGS)
      .map(Number)
      .filter(key => NANOSAUR_ITEM_MODEL_MAPPINGS[key] !== undefined);
  }

  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean {
    return NANOSAUR_ITEM_MODEL_MAPPINGS[itemType] !== undefined;
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
export const nanosaur1ItemMapper = new Nanosaur1ItemMapper();
