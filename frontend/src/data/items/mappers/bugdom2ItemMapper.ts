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
import { ItemType } from "../bugdom2ItemType";
import { ROTATION_4_WAY } from "../standardParamTypes";

const BUGDOM2_PLAYROOM_LEVEL = 3;
const BUGDOM2_CLOSET_LEVEL = 4;
const BUGDOM2_DOOR_SCALE = 1.8;
const BUGDOM2_DIARY_DOOR_SCALE = 6.0;
const BUGDOM2_SILICON_DOOR_SCALE = 0.5;

const BUGDOM2_DOOR_MODEL_BASES: Partial<
  Record<number, { readonly modelFile: string; readonly modelIndexBase: number }>
> = {
  0: { modelFile: "Level1_Garden.bg3d", modelIndexBase: 5 },
  1: { modelFile: "Level2_Sidewalk.bg3d", modelIndexBase: 5 },
  3: { modelFile: "Level5_Playroom.bg3d", modelIndexBase: 30 },
  6: { modelFile: "Level8_Garbage.bg3d", modelIndexBase: 13 },
  8: { modelFile: "Level10_Park.bg3d", modelIndexBase: 14 },
};

const BUGDOM2_DOOR_PARAM_OPTIONS = {
  options: {
    0: "Red door / silicon door",
    1: "Green door / diary door",
    2: "Blue door",
  },
};

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

  private getDoorMapping(
    levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    if (levelNum === undefined) {
      return BUGDOM2_ITEM_MODEL_MAPPINGS[ItemType.Door];
    }

    const doorColor = params?.p1 ?? 0;
    if (levelNum === BUGDOM2_CLOSET_LEVEL) {
      if (doorColor === 0) {
        return {
          modelFile: "Level6_Closet.bg3d",
          modelPath: "models",
          modelIndex: 21,
          scale: BUGDOM2_SILICON_DOOR_SCALE,
          rotationParam: BUGDOM2_ITEM_MODEL_MAPPINGS[ItemType.Door]?.rotationParam,
        };
      }

      return {
        modelFile: "Level6_Closet.bg3d",
        modelPath: "models",
        modelIndex: 19,
        scale: BUGDOM2_DIARY_DOOR_SCALE,
        rotationParam: BUGDOM2_ITEM_MODEL_MAPPINGS[ItemType.Door]?.rotationParam,
      };
    }

    const doorBase = BUGDOM2_DOOR_MODEL_BASES[levelNum];
    if (!doorBase) {
      return BUGDOM2_ITEM_MODEL_MAPPINGS[ItemType.Door];
    }

    return {
      modelFile: doorBase.modelFile,
      modelPath: "models",
      modelIndex: doorBase.modelIndexBase + doorColor,
      scale: BUGDOM2_DOOR_SCALE,
      rotationParam: BUGDOM2_ITEM_MODEL_MAPPINGS[ItemType.Door]?.rotationParam,
    };
  }

  private getPowMapping(
    levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const powKind = params?.p0 ?? 0;
    if (powKind === 5) {
      return undefined;
    }

    if (levelNum === BUGDOM2_CLOSET_LEVEL && powKind === 2) {
      return {
        modelFile: "Level6_Closet.bg3d",
        modelPath: "models",
        modelIndex: 26,
        scale: 3.0,
      };
    }

    if (levelNum === 2 && powKind === 0) {
      return {
        modelFile: "Level4_Plumbing.bg3d",
        modelPath: "models",
        modelIndex: 2,
        scale: 1.6,
      };
    }

    const modelIndexByPowKind: Partial<Record<number, number>> = {
      0: 13,
      1: 14,
      2: 15,
      3: 16,
      4: 17,
      6: 18,
      7: 19,
      8: 20,
      9: 21,
      10: 22,
      11: 23,
      12: 24,
    };

    const modelIndex = modelIndexByPowKind[powKind];
    if (modelIndex === undefined) {
      return BUGDOM2_ITEM_MODEL_MAPPINGS[ItemType.POW];
    }

    const scale =
      powKind === 0
        ? 1.6
        : powKind === 2
          ? 3.0
          : powKind >= 9 && powKind <= 11
            ? 0.4
            : 1.0;

    return {
      modelFile: "Global.bg3d",
      modelPath: "models",
      modelIndex,
      scale,
    };
  }

  private getScarecrowMapping(
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
    return (params?.p0 ?? 0) === 0
      ? {
          modelFile: "Level1_Garden.bg3d",
          modelPath: "models",
          modelIndex: 8,
          groupSize: 2,
          scale: 1.1,
        }
      : {
          modelFile: "Level1_Garden.bg3d",
          modelPath: "models",
          modelIndex: 10,
          scale: 1.1,
        };
  }

  private getPuzzleMapping(
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
    const part = params?.p0 ?? 0;
    return {
      modelFile: "Level5_Playroom.bg3d",
      modelPath: "models",
      modelIndex: part === 0 ? 20 : 20 + Math.min(part, 3),
    };
  }

  private getCardboardBoxMapping(
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
    return {
      modelFile: "Level6_Closet.bg3d",
      modelPath: "models",
      modelIndex: 2 + Math.min(params?.p0 ?? 0, 3),
    };
  }

  private getBookStackMapping(
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
    return {
      modelFile: "Level6_Closet.bg3d",
      modelPath: "models",
      modelIndex: 16 + Math.min(params?.p0 ?? 0, 2),
      rotationParam: { paramIndex: 1, rotationType: ROTATION_4_WAY },
    };
  }

  private getPictureFrameMapping(
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
    return {
      modelFile: "Level6_Closet.bg3d",
      modelPath: "models",
      modelIndex: 28 + Math.min(params?.p0 ?? 0, 2),
      rotationParam: { paramIndex: 1, rotationType: ROTATION_4_WAY },
    };
  }

  private getSiliconPartMapping(
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
    return {
      modelFile: "Level6_Closet.bg3d",
      modelPath: "models",
      modelIndex: 22 + Math.min(params?.p0 ?? 0, 2),
    };
  }

  private getPlatformFlowerMapping(
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
    return {
      modelFile: "Level10_Park.bg3d",
      modelPath: "models",
      modelIndex: 6 + Math.min(params?.p0 ?? 0, 2),
    };
  }

  private getKindlingMapping(
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
    return {
      modelFile: "Level10_Park.bg3d",
      modelPath: "models",
      modelIndex: (params?.p0 ?? 0) === 0 ? 23 : 24,
    };
  }

  private getGliderPartMapping(
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping {
    return {
      modelFile: "Level8_Garbage.bg3d",
      modelPath: "models",
      modelIndex: 15 + Math.min(params?.p0 ?? 0, 2),
    };
  }

  private getSquishBerryMapping(flags?: number): UniversalItemModelMapping {
    return {
      modelFile: "Level2_Sidewalk.bg3d",
      modelPath: "models",
      modelIndex: (flags ?? 0) === 0 ? 25 : 26,
    };
  }
  
  getMapping(
    itemType: number,
    levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
    flags?: number,
  ): UniversalItemModelMapping | undefined {
    if (itemType === ItemType.RideBall && levelNum === BUGDOM2_PLAYROOM_LEVEL) {
      return {
        modelFile: "Level5_Playroom.bg3d",
        modelPath: "models",
        modelIndex: 18,
      };
    }

    if (itemType === ItemType.Door) {
      return this.getDoorMapping(levelNum, params);
    }

    if (itemType === ItemType.POW) {
      return this.getPowMapping(levelNum, params);
    }

    if (itemType === ItemType.Scarecrow) {
      return this.getScarecrowMapping(params);
    }

    if (itemType === ItemType.Puzzle) {
      return this.getPuzzleMapping(params);
    }

    if (itemType === ItemType.CardboardBox) {
      return this.getCardboardBoxMapping(params);
    }

    if (itemType === ItemType.BookStack) {
      return this.getBookStackMapping(params);
    }

    if (itemType === ItemType.PictureFrame) {
      return this.getPictureFrameMapping(params);
    }

    if (itemType === ItemType.SiliconPart) {
      return this.getSiliconPartMapping(params);
    }

    if (itemType === ItemType.PlatformFlower) {
      return this.getPlatformFlowerMapping(params);
    }

    if (itemType === ItemType.Kindling) {
      return this.getKindlingMapping(params);
    }

    if (itemType === ItemType.GliderPart) {
      return this.getGliderPartMapping(params);
    }

    if (itemType === ItemType.SquishBerry) {
      return this.getSquishBerryMapping(flags);
    }

    if (itemType === ItemType.Enemy_Moth && ((params?.p3 ?? 0) & 1) !== 0) {
      return undefined;
    }

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

  isLevelDependent(itemType: number): boolean {
    return itemType === ItemType.RideBall || itemType === ItemType.Door || itemType === ItemType.POW;
  }

  isParamDependent(itemType: number): boolean {
    return (
      itemType === ItemType.Door ||
      itemType === ItemType.POW ||
      itemType === ItemType.Scarecrow ||
      itemType === ItemType.Puzzle ||
      itemType === ItemType.CardboardBox ||
      itemType === ItemType.BookStack ||
      itemType === ItemType.PictureFrame ||
      itemType === ItemType.SiliconPart ||
      itemType === ItemType.PlatformFlower ||
      itemType === ItemType.Kindling ||
      itemType === ItemType.GliderPart
    );
  }

  getParamDependentConfig(itemType: number):
    | {
        paramIndex: 0 | 1 | 2 | 3;
        paramType: {
          options: Record<number, string>;
          modelVariants?: Record<number, unknown>;
        };
      }
    | undefined {
    if (itemType !== ItemType.Door) {
      return undefined;
    }

    return {
      paramIndex: 1,
      paramType: BUGDOM2_DOOR_PARAM_OPTIONS,
    };
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
