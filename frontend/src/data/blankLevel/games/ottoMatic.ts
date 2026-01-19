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

/**
 * Create blank Otto Matic level data structure.
 * 
 * Note: This creates a minimal structure suitable for testing and initialization.
 * The actual runtime LevelData type may have additional required fields.
 */
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

  // Create header with all required fields
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
      x: mapWidth * 16,
      z: mapHeight * 16,
      type: 0, // StartCoords
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      flags: 0,
    },
  ];

  // Assemble level data using Record to avoid type constraints
  const levelData: Record<string, unknown> = {
    Hedr: {
      1000: { name: "Header", obj: header, order: 0 },
    },
    Itms: {
      1000: { name: "Terrain Items List", obj: items, order: 1 },
    },
    YCrd: {
      1000: { name: "Floor&Ceiling Y Coords", obj: yCrd, order: 2 },
    },
    Atrb: {
      1000: { name: "Tile Attribute Data", obj: atrb, order: 3 },
    },
    STgd: {
      1000: { name: "Supertile Grid", obj: stgd.map(s => ({ ...s, isEmpty: s.superTileId === -1 })), order: 4 },
    },
    Spln: {
      1000: { name: "Splines", obj: [], order: 5 },
    },
    SpNb: {},
    SpPt: {},
    SpIt: {},
    _metadata: {
      format: "rsrc",
      game: "otto_matic",
      file_attributes: {},
      junk1: "",
      junk2: "",
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
