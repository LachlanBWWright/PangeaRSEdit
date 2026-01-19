import type { LevelData } from "@/python/structSpecs/LevelTypes";
import type {
  BlankLevelOptions,
  BlankLevelResult,
  GameBlankLevelConfig,
} from "../types";
import {
  createHeightArray,
  createAttributeArray,
  createSupertileGrid,
  createLayerArray,
  validateBlankLevelOptions,
} from "../levelFactoryUtils";
import { Game } from "@/data/globals/globals";

const TILES_PER_SUPERTILE = 8;

export function createBlankBillyFrontierLevel(
  options: BlankLevelOptions,
): BlankLevelResult {
  const validation = validateBlankLevelOptions(
    options,
    TILES_PER_SUPERTILE,
    16,
    512,
    16,
    512,
  );
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const { mapWidth, mapHeight, defaultHeight = 0 } = options;

  const header = {
    version: 1,
    mapWidth,
    mapHeight,
    numItems: 1,
    numSplines: 0,
    numFences: 0,
    numUniqueSupertiles: 0,
    levelType: 0, // 0=duel, 1=stampede, 2=shootout
  };

  const yCrd = createHeightArray(mapWidth, mapHeight, defaultHeight);
  const atrb = createAttributeArray(mapWidth, mapHeight);
  const stgd = createSupertileGrid(mapWidth, mapHeight, TILES_PER_SUPERTILE);
  const layr = createLayerArray(mapWidth, mapHeight);

  const items = [
    {
      x: (mapWidth * 32) / 2,
      z: (mapHeight * 32) / 2,
      type: 0, // StartCoords
      p0: 0, // Starting rotation
      p1: 0,
      p2: 0,
      p3: 0,
      flags: 0,
    },
  ];

  const levelData: LevelData = {
    Hedr: { 1000: { obj: header } },
    Itms: { 1000: { obj: items } },
    YCrd: { 1000: { obj: yCrd } },
    Atrb: { 1000: { obj: atrb } },
    STgd: { 1000: { obj: stgd } },
    Layr: { 1000: { obj: layr } },
    Spln: { 1000: { obj: {} } },
    SpNb: {},
    SpPt: {},
    SpIt: {},
    _metadata: {
      format: "rsrc",
      game: "billy_frontier",
    },
  };

  return { success: true, levelData };
}

export const billyFrontierBlankLevelConfig: GameBlankLevelConfig = {
  game: Game.BILLY_FRONTIER,
  tilesPerSupertile: TILES_PER_SUPERTILE,
  minWidth: 16,
  minHeight: 16,
  maxWidth: 512,
  maxHeight: 512,
  defaultWidth: 64,
  defaultHeight: 64,
  defaultTerrainHeight: 0,
  createBlankLevel: createBlankBillyFrontierLevel,
};
