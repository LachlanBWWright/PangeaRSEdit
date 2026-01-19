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

const TILES_PER_SUPERTILE = 5;

export function createBlankBugdomLevel(
  options: BlankLevelOptions,
): BlankLevelResult {
  const validation = validateBlankLevelOptions(
    options,
    TILES_PER_SUPERTILE,
    10,
    256,
    10,
    256,
  );
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const { mapWidth, mapHeight, defaultHeight = 0 } = options;

  // Bugdom header
  const header = {
    version: 1,
    mapWidth,
    mapHeight,
    numItems: 1,
    numSplines: 0,
    numFences: 0,
    numTilePages: 1, // At least one tile page
    numTiles: mapWidth * mapHeight,
    numWaterPatches: 0,
    numUniqueSupertiles: 0,
  };

  // Create terrain data
  const yCrd = createHeightArray(mapWidth, mapHeight, defaultHeight);
  const yCrdRoof = createHeightArray(mapWidth, mapHeight, defaultHeight + 500); // Roof height
  const atrb = createAttributeArray(mapWidth, mapHeight);
  const stgd = createSupertileGrid(mapWidth, mapHeight, TILES_PER_SUPERTILE);
  const layr = createLayerArray(mapWidth, mapHeight, 0);

  // Start position
  const items = [
    {
      x: (mapWidth * 32) / 2,
      z: (mapHeight * 32) / 2,
      type: 0, // StartCoords
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      flags: 0,
    },
  ];

  const levelData: LevelData = {
    Hedr: { 1000: { obj: header } },
    Itms: { 1000: { obj: items } },
    YCrd: {
      1000: { obj: yCrd },
      1001: { obj: yCrdRoof }, // Roof heightmap
    },
    Atrb: { 1000: { obj: atrb } },
    STgd: { 1000: { obj: stgd } },
    Layr: { 1000: { obj: layr } },
    Spln: { 1000: { obj: {} } },
    SpNb: {},
    SpPt: {},
    SpIt: {},
    _metadata: {
      format: "rsrc",
      game: "bugdom",
    },
  };

  return { success: true, levelData };
}

export const bugdomBlankLevelConfig: GameBlankLevelConfig = {
  game: Game.BUGDOM,
  tilesPerSupertile: TILES_PER_SUPERTILE,
  minWidth: 10,
  minHeight: 10,
  maxWidth: 256,
  maxHeight: 256,
  defaultWidth: 50,
  defaultHeight: 50,
  defaultTerrainHeight: 0,
  createBlankLevel: createBlankBugdomLevel,
};
