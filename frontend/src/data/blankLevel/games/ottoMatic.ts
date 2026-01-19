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
  validateBlankLevelOptions,
} from "../levelFactoryUtils";
import { Game } from "@/data/globals/globals";

const TILES_PER_SUPERTILE = 8;

export function createBlankOttoMaticLevel(
  options: BlankLevelOptions,
): BlankLevelResult {
  // Validate options
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

  // Create header
  const header = {
    version: 1,
    mapWidth,
    mapHeight,
    numItems: 1, // At least start position
    numSplines: 0,
    numFences: 0,
    numUniqueSupertiles: 0,
    numTilePages: 0,
    numTiles: mapWidth * mapHeight,
    // Player start position (center of map)
    playerStartX: mapWidth * 16,
    playerStartZ: mapHeight * 16,
    playerStartRotY: 0,
  };

  // Create terrain data
  const yCrd = createHeightArray(mapWidth, mapHeight, defaultHeight);
  const atrb = createAttributeArray(mapWidth, mapHeight, 0, 0, 0);
  const stgd = createSupertileGrid(mapWidth, mapHeight, TILES_PER_SUPERTILE);

  // Create minimal item list (just start position)
  const items = [
    {
      x: mapWidth * 16, // Center X
      z: mapHeight * 16, // Center Z
      type: 0, // StartCoords
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      flags: 0,
    },
  ];

  // Assemble level data
  const levelData: LevelData = {
    Hedr: {
      1000: { obj: header },
    },
    Itms: {
      1000: { obj: items },
    },
    YCrd: {
      1000: { obj: yCrd },
    },
    Atrb: {
      1000: { obj: atrb },
    },
    STgd: {
      1000: { obj: stgd },
    },
    Spln: {
      1000: { obj: {} },
    },
    SpNb: {},
    SpPt: {},
    SpIt: {},
    _metadata: {
      format: "rsrc",
      game: "otto_matic",
    },
  };

  return { success: true, levelData };
}

export const ottoMaticBlankLevelConfig: GameBlankLevelConfig = {
  game: Game.OTTO_MATIC,
  tilesPerSupertile: TILES_PER_SUPERTILE,
  minWidth: 16,
  minHeight: 16,
  maxWidth: 512,
  maxHeight: 512,
  defaultWidth: 64,
  defaultHeight: 64,
  defaultTerrainHeight: 0,
  createBlankLevel: createBlankOttoMaticLevel,
};
