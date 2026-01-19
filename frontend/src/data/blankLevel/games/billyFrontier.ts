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

/**
 * Create blank Billy Frontier level data structure.
 */
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
    numTilePages: 0,
    numTiles: mapWidth * mapHeight,
    numWaterPatches: 0,
    numCheckpoints: 0,
    tileSize: 32,
    minY: 0,
    maxY: 1000,
    levelType: 0,
  };

  const yCrd = createHeightArray(mapWidth, mapHeight, defaultHeight);
  const atrb = createAttributeArray(mapWidth, mapHeight);
  const stgd = createSupertileGrid(mapWidth, mapHeight, TILES_PER_SUPERTILE);
  const layr = createLayerArray(mapWidth, mapHeight);

  const items = [
    {
      x: (mapWidth * 32) / 2,
      z: (mapHeight * 32) / 2,
      type: 0,
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      flags: 0,
    },
  ];

  const levelData: Record<string, unknown> = {
    Hedr: { 1000: { name: "Header", obj: header, order: 0 } },
    Itms: { 1000: { name: "Terrain Items List", obj: items, order: 1 } },
    YCrd: { 1000: { name: "Floor&Ceiling Y Coords", obj: yCrd, order: 2 } },
    Atrb: { 1000: { name: "Tile Attribute Data", obj: atrb, order: 3 } },
    STgd: { 1000: { name: "Supertile Grid", obj: stgd.map(s => ({ ...s, isEmpty: s.superTileId === -1 })), order: 4 } },
    Layr: { 1000: { name: "Terrain Layer Matrix", obj: layr, order: 5 } },
    Spln: { 1000: { name: "Splines", obj: [], order: 6 } },
    SpNb: {},
    SpPt: {},
    SpIt: {},
    _metadata: {
      format: "rsrc",
      game: "billy_frontier",
      file_attributes: {},
      junk1: "",
      junk2: "",
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
