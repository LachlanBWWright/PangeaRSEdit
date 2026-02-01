/**
 * Blank Level Generator
 * 
 * Creates blank/empty level data structures for each supported game.
 * These can be used as starting points for new level creation.
 */

import { Game } from "@/data/globals/globals";
import type {
  HeaderData,
  TerrainData,
  ItemData,
  FenceData,
  SplineData,
  LiquidData,
  StandardHeader,
  CroMagHeader,
  TileAttribute,
  SupertileGridEntry,
  LevelMetadata,
} from "@/python/structSpecs/LevelTypes";
import { LEVEL_REQUIREMENTS, validateDimensions } from "./levelRequirements";
import { type Result, ok, err } from "@/types/result";

/**
 * Options for creating a blank level
 */
export interface BlankLevelOptions {
  width: number;
  height: number;
  defaultTerrainHeight?: number;
}

/**
 * Complete blank level data
 */
export interface BlankLevelData {
  headerData: HeaderData<StandardHeader | CroMagHeader>;
  terrainData: TerrainData<TileAttribute, SupertileGridEntry>;
  itemData: ItemData;
  fenceData: FenceData | null;
  splineData: SplineData | null;
  liquidData: LiquidData | null;
}

/**
 * Create a blank level for the specified game
 */
export function createBlankLevel(
  game: Game,
  options: BlankLevelOptions,
): Result<BlankLevelData, Error> {
  const validation = validateDimensions(game, options.width, options.height);
  if (!validation.valid) {
    return err(new Error(validation.message ?? "Invalid dimensions"));
  }

  const req = LEVEL_REQUIREMENTS[game];
  const defaultHeight = options.defaultTerrainHeight ?? req.defaultTerrainHeight;

  const headerData = createBlankHeader(game, options.width, options.height);
  const terrainData = createBlankTerrain(game, options.width, options.height, defaultHeight);
  const itemData = createBlankItemData();
  const fenceData = req.supportsFences ? createBlankFenceData() : null;
  const splineData = req.supportsSplines ? createBlankSplineData() : null;
  const liquidData = req.supportsWater ? createBlankLiquidData() : null;

  return ok({
    headerData,
    terrainData,
    itemData,
    fenceData,
    splineData,
    liquidData,
  });
}

/**
 * Create blank header data with all required fields
 */
function createBlankHeader(
  game: Game,
  width: number,
  height: number,
): HeaderData<StandardHeader | CroMagHeader> {
  // Base fields required by BaseHeader
  const baseFields = {
    version: 1,
    numItems: 0,
    mapWidth: width,
    mapHeight: height,
    tileSize: 32,
    minY: 0,
    maxY: 100,
    numSplines: 0,
    numFences: 0,
  };

  // Standard extension fields
  const standardExtension = {
    numTilePages: 1,
    numTiles: 1,
    numUniqueSupertiles: 1,
    numCheckpoints: 0,
  };

  if (game === Game.CRO_MAG) {
    // Cro-Mag uses numPaths instead of numWaterPatches
    const croMagHeader: CroMagHeader = {
      ...baseFields,
      ...standardExtension,
      numPaths: 0,
    };
    return {
      Hedr: {
        1000: {
          name: "Header",
          obj: croMagHeader,
          order: 0,
        },
      },
    };
  }

  // Standard header for most games
  const standardHeader: StandardHeader = {
    ...baseFields,
    ...standardExtension,
    numWaterPatches: 0,
  };

  return {
    Hedr: {
      1000: {
        name: "Header",
        obj: standardHeader,
        order: 0,
      },
    },
  };
}

/**
 * Create blank terrain data with all required sections
 */
function createBlankTerrain(
  game: Game,
  width: number,
  height: number,
  defaultHeight: number,
): TerrainData<TileAttribute, SupertileGridEntry> {
  const req = LEVEL_REQUIREMENTS[game];
  const totalTiles = width * height;
  const supertilesWide = Math.ceil(width / req.tilesPerSupertile);
  const supertilesHigh = Math.ceil(height / req.tilesPerSupertile);
  const totalSupertiles = supertilesWide * supertilesHigh;

  // Metadata
  const metadata: LevelMetadata = {
    file_attributes: 0,
    junk1: 0,
    junk2: 0,
  };

  // Build terrain data with required fields
  const terrainData: TerrainData<TileAttribute, SupertileGridEntry> = {
    // Atrb - Tile attributes (required)
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: [{ flags: 0, p0: 0, p1: 0 }],
        order: 1,
      },
    },

    // ItCo - Items color array (required, stored as base64)
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: "",
        order: 2,
      },
    },

    // YCrd - Terrain heights (required)
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: new Array(totalTiles).fill(defaultHeight),
        order: 3,
      },
    },

    // alis - Texture page aliases (required)
    alis: {
      1000: {
        name: "Texture Page Picture Alias",
        data: "",
        order: 10,
      },
    },

    _metadata: metadata,
  };

  // Add roof layer for Bugdom 1
  if (req.supportsRoof) {
    terrainData.YCrd[1001] = {
      name: "Roof Y Coords",
      obj: new Array(totalTiles).fill(defaultHeight + 100),
      order: 4,
    };
  }

  // Layr - Tile layer mapping (optional)
  if (req.requiresLayr) {
    terrainData.Layr = {
      1000: {
        name: "Terrain Layer Matrix",
        obj: new Array(totalTiles).fill(0),
        order: 5,
      },
    };
  }

  // STgd - Supertile grid (optional)
  if (req.requiresSTgd) {
    const supertileGrid: SupertileGridEntry[] = [];
    for (let i = 0; i < totalSupertiles; i++) {
      supertileGrid.push({
        isEmpty: true,
        superTileId: 0,
      });
    }
    terrainData.STgd = {
      1000: {
        name: "SuperTile Grid",
        obj: supertileGrid,
        order: 6,
      },
    };
  }

  // Xlat - Translation table (for tile-based games like Nanosaur, Bugdom 1)
  if (req.requiresXlat) {
    terrainData.Xlat = {
      1000: {
        name: "Tile Index Translation Table",
        obj: [{ idx: 0 }],
        order: 7,
      },
    };
  }

  return terrainData;
}

/**
 * Create blank item data
 */
function createBlankItemData(): ItemData {
  return {
    Itms: {
      1000: {
        name: "Terrain Items List",
        obj: [],
        order: 0,
      },
    },
  };
}

/**
 * Create blank fence data
 */
function createBlankFenceData(): FenceData {
  return {
    Fenc: {
      1000: {
        name: "Fence List",
        obj: [],
        order: 0,
      },
    },
    FnNb: {},
  };
}

/**
 * Create blank spline data
 */
function createBlankSplineData(): SplineData {
  return {
    Spln: {
      1000: {
        name: "Spline List",
        obj: [],
        order: 0,
      },
    },
    SpNb: {},
    SpPt: {},
    SpIt: {},
  };
}

/**
 * Create blank liquid/water data
 */
function createBlankLiquidData(): LiquidData {
  return {
    Liqd: {
      1000: {
        name: "Water List",
        obj: [],
        order: 0,
      },
    },
  };
}

/**
 * Check if a game supports creating blank levels
 */
export function canCreateBlankLevel(_game: Game): boolean {
  // All games support blank level creation
  return true;
}

/**
 * Get a human-readable description of what a blank level includes
 */
export function getBlankLevelDescription(game: Game): string {
  const req = LEVEL_REQUIREMENTS[game];
  const features: string[] = ["terrain"];

  if (req.supportsRoof) features.push("roof layer");
  if (req.supportsFences) features.push("fences");
  if (req.supportsSplines) features.push("splines");
  if (req.supportsWater) features.push("water bodies");

  return `Creates a blank level with: ${features.join(", ")}`;
}
