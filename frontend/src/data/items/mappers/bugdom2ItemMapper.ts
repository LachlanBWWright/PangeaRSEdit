/**
 * Bugdom 2 Item Model Mapper
 * 
 * Maps Bugdom 2 item types to their 3D models.
 * Uses the comprehensive mappings from bugdom2ItemModelMapping.ts.
 */

import { Game } from "../../globals/globals";
import { 
  type GameItemModelMapper, 
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { BUGDOM2_ITEM_MODEL_MAPPINGS } from "../bugdom2ItemModelMapping";

/**
 * Bugdom 2 level model file associations
 */
const BUGDOM2_LEVEL_MODELS: Record<number, string> = {
  0: "Level1_Garden.bg3d",
  1: "Level2_Sidewalk.bg3d",
  2: "Level4_Plumbing.bg3d",
  3: "Level5_Playroom.bg3d",
  4: "Level6_Closet.bg3d",
  5: "Level7_Gutter.bg3d",
  6: "Level8_Garbage.bg3d",
  7: "Level9_Balsa.bg3d",
  8: "Level10_Park.bg3d",
};

/**
 * Bugdom 2 item model mapper
 */
export class Bugdom2ItemMapper implements GameItemModelMapper {
  readonly game = Game.BUGDOM_2;
  
  getMapping(
    itemType: number,
  ): UniversalItemModelMapping | undefined {
    return BUGDOM2_ITEM_MODEL_MAPPINGS[itemType];
  }
  
  getMappedTypes(): number[] {
    return Object.keys(BUGDOM2_ITEM_MODEL_MAPPINGS)
      .map(Number)
      .filter(k => !isNaN(k) && BUGDOM2_ITEM_MODEL_MAPPINGS[k] !== undefined);
  }
  
  hasModel(itemType: number): boolean {
    return BUGDOM2_ITEM_MODEL_MAPPINGS[itemType] !== undefined;
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
