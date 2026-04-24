import { Game } from "@/data/globals/globals";
import type {
  HeaderData,
  TerrainData,
  ItemData,
  FenceData,
  SplineData,
  LiquidData,
  StandardHeader,
  TileAttribute,
  SupertileGridEntry,
  LevelMetadata,
} from "@/python/structSpecs/LevelTypes";
import { LEVEL_REQUIREMENTS, validateDimensions } from "./levelRequirements";
import { Result } from "neverthrow";
import { ok, err } from "neverthrow";
import type { Nanosaur1LevelData } from "@/data/processors/classicProprocessor";
import type {
  MightyMikeMap,
  MightyMikeTileValue,
  MightyMikeTileSet,
} from "@/python/structSpecs/mightyMikeInterface";
import {
  buildBlankMightyMikeData,
  buildBlankNanosaurRawLevel,
} from "./blankLevelGameDataBuilders";
export interface BlankLevelOptions {
  width: number;
  height: number;
  defaultTerrainHeight?: number;
}
export interface BlankLevelData {
  headerData: HeaderData;
  terrainData: TerrainData<TileAttribute, SupertileGridEntry>;
  itemData: ItemData;
  fenceData: FenceData | null;
  splineData: SplineData | null;
  liquidData: LiquidData | null;
  nanosaur1RawLevel?: Nanosaur1LevelData;
  mightyMikeMapData?: MightyMikeMap;
  mightyMikeTileValues?: MightyMikeTileValue[];
  mightyMikeTileSet?: MightyMikeTileSet;
}
export function createBlankLevel(
  game: Game,
  options: BlankLevelOptions,
): Result<BlankLevelData, Error> {
  const validation = validateDimensions(game, options.width, options.height);
  if (!validation.valid) {
    return err(new Error(validation.message ?? "Invalid dimensions"));
  }
  const req = LEVEL_REQUIREMENTS[game];
  const defaultHeight =
    options.defaultTerrainHeight ?? req.defaultTerrainHeight;
  if (game === Game.NANOSAUR) {
    return createBlankNanosaurLevel(
      options.width,
      options.height,
      defaultHeight,
    );
  }
  if (game === Game.MIGHTY_MIKE) {
    return createBlankMightyMikeLevel(
      options.width,
      options.height,
      defaultHeight,
    );
  }
  const headerData = createBlankHeader(game, options.width, options.height);
  const terrainData = createBlankTerrain(
    game,
    options.width,
    options.height,
    defaultHeight,
  );
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
function createBlankHeader(
  game: Game,
  width: number,
  height: number,
): HeaderData {
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
    // For blank levels, we add numWaterPatches with value 0 for type compatibility
    const croMagHeader: StandardHeader & { numPaths: number } = {
      ...baseFields,
      ...standardExtension,
      numWaterPatches: 0,
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
  const usesSimplifiedHeader =
    game === Game.BUGDOM_2 ||
    game === Game.NANOSAUR_2 ||
    game === Game.BILLY_FRONTIER;
  const standardHeader: StandardHeader = {
    ...baseFields,
    ...standardExtension,
    numWaterPatches: 0,
    numTilePages: usesSimplifiedHeader ? 0 : standardExtension.numTilePages,
    numTiles: usesSimplifiedHeader ? 0 : standardExtension.numTiles,
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
  const heightmapTotal = (width + 1) * (height + 1);
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
        obj: new Array(heightmapTotal).fill(defaultHeight),
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
      obj: new Array(heightmapTotal).fill(defaultHeight + 100),
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
export function canCreateBlankLevel(): boolean {
  // All games support blank level creation
  return true;
}
export function getBlankLevelDescription(game: Game): string {
  const req = LEVEL_REQUIREMENTS[game];
  const features: string[] = ["terrain"];
  if (req.supportsRoof) features.push("roof layer");
  if (req.supportsFences) features.push("fences");
  if (req.supportsSplines) features.push("splines");
  if (req.supportsWater) features.push("water bodies");
  return `Creates a blank level with: ${features.join(", ")}`;
}
function createBlankNanosaurLevel(
  width: number,
  height: number,
  defaultHeight: number,
): Result<BlankLevelData, Error> {
  const headerData = createBlankHeader(Game.NANOSAUR, width, height);
  const terrainData = createBlankTerrain(
    Game.NANOSAUR,
    width,
    height,
    defaultHeight,
  );
  const itemData = createBlankItemData();
  const fenceData = null;
  const splineData = null;
  const liquidData = null;
  const blankLevel: Nanosaur1LevelData = buildBlankNanosaurRawLevel(
    width,
    height,
    defaultHeight,
  );
  terrainData._metadata = {
    ...terrainData._metadata,
    nanosaur1RawLevel: blankLevel,
  };
  return ok({
    headerData,
    terrainData,
    itemData,
    fenceData,
    splineData,
    liquidData,
    nanosaur1RawLevel: blankLevel,
  });
}
function createBlankMightyMikeLevel(
  width: number,
  height: number,
  defaultHeight: number,
): Result<BlankLevelData, Error> {
  const headerData = createBlankHeader(Game.MIGHTY_MIKE, width, height);
  const terrainData = createBlankTerrain(
    Game.MIGHTY_MIKE,
    width,
    height,
    defaultHeight,
  );
  const itemData = createBlankItemData();
  const fenceData = null;
  const splineData = null;
  const liquidData = null;
  const {
    blankMap,
    flatTileValues,
    blankTileSet,
  }: {
    blankMap: MightyMikeMap;
    flatTileValues: MightyMikeTileValue[];
    blankTileSet: MightyMikeTileSet;
  } = buildBlankMightyMikeData(width, height);
  terrainData._metadata = {
    ...terrainData._metadata,
    1000: {
      name: "Metadata",
      obj: {
        mightyMikeMapData: blankMap,
        mightyMikeTileValues: flatTileValues,
      },
      order: 100,
    },
  };
  return ok({
    headerData,
    terrainData,
    itemData,
    fenceData,
    splineData,
    liquidData,
    mightyMikeMapData: blankMap,
    mightyMikeTileValues: flatTileValues,
    mightyMikeTileSet: blankTileSet,
  });
}
