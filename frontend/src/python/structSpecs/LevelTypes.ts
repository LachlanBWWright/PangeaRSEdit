
import { FenceType } from "../../data/fences/ottoFenceType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";

// HEADER TYPES

export interface BaseHeader {
  version: number;
  numItems: number;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  minY: number;
  maxY: number;
  numSplines: number;
  numFences: number;
}

export interface StandardHeader extends BaseHeader {
  numTilePages: number;
  numTiles: number;
  numUniqueSupertiles: number;
  numWaterPatches: number;
  numCheckpoints: number;
}

export interface CroMagHeader extends BaseHeader {
  numTilePages: number;
  numTiles: number;
  numUniqueSupertiles: number;
  numPaths: number;
  numCheckpoints: number;
}

// TILE AND TERRAIN TYPES

export interface TileAttribute {
  flags: number;
  p0: number;
  p1: number;
}

export interface ExtendedTileAttribute {
  bits: number;
  parm0: number;
  parm1: number;
  parm2: number;
  undefined: number;
  flags: number;
  p0: number;
  p1: number;
}

export interface SupertileGridEntry {
  padByte?: string;
  isEmpty: boolean;
  superTileId: number;
}

export interface SimplifiedSupertileGridEntry {
  superTileId: number;
}

// ITEM TYPES

export interface TerrainItem<TItemType = number> {
  x: number;
  z: number;
  type: TItemType;
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

// FENCE TYPES

export interface Fence {
  fenceType: FenceType;
  numNubs: number;
  junkNubListPtr: number;
  bbTop: number;
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
}

export type FenceNub = [x: number, y: number];

// SPLINE TYPES

export interface SplineNub {
  x: number;
  z: number;
}

export interface SplinePoint {
  x: number;
  z: number;
}

export interface SplineItem<TSplineItemType = number> {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  placement: number;
  type: TSplineItemType;
}

export interface Spline {
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
  bbTop: number;
  numItems: number;
  numNubs: number;
  numPoints: number;
}

// WATER/LIQUID TYPES

export const LIQUID_NUBS_COUNT = 100;

export interface Liquid {
  bBoxBottom: number;
  bBoxLeft: number;
  bBoxRight: number;
  bBoxTop: number;
  flags: number;
  height: number;
  hotSpotX: number;
  hotSpotZ: number;
  numNubs: number;
  reserved: number;
  type: WaterBodyType;
  nubs: [number, number][];
}

// CHECKPOINT TYPE

export interface Checkpoint {
  unused: number;
  infoBits: number;
  x1: number;
  x2: number;
  z1: number;
  z2: number;
}

// DATA SECTION INTERFACES (Resource format wrappers)

export interface LevelMetadata {
  file_attributes: number;
  junk1: number;
  junk2: number;
  nanosaur1RawLevel?: unknown;
  nanosaur1RawBytes?: ArrayBuffer;
  terrainTiles?: unknown;
  mightyMikeMapData?: unknown;
  [key: string]: unknown;
}

export interface HeaderData<THeader = StandardHeader> {
  Hedr: {
    1000: {
      name: "Header";
      obj: THeader;
      order: 0;
    };
  };
}

export interface FenceData {
  Fenc: {
    1000: {
      name: "Fence List";
      obj: Fence[];
      order: number;
    };
  };
  FnNb: Record<
    number,
    {
      name: "Fence Nub List";
      obj: FenceNub[];
      order: number;
    }
  >;
}

export interface SplineData<TSplineItem = SplineItem> {
  SpNb: Record<
    number,
    {
      name?: "Spline Nub List";
      obj: SplineNub[];
      order?: number;
    }
  >;
  SpPt: Record<
    number,
    {
      name?: "Spline Point List";
      obj: SplinePoint[];
      order?: number;
    }
  >;
  SpIt: Record<
    number,
    {
      name?: "Spline Item List";
      obj: TSplineItem[];
      order?: number;
    }
  >;
  Spln: {
    1000: {
      name: "Spline List";
      obj: Spline[];
      order: number;
    };
  };
}

export interface LiquidData {
  Liqd: {
    1000: {
      name: "Water List";
      obj: Liquid[];
      order: number;
    };
  };
}

export interface ItemData<TItem = TerrainItem> {
  Itms: {
    1000: {
      name: "Terrain Items List";
      obj: TItem[];
      order: number;
    };
  };
}

export interface TerrainData<
  TTileAttribute = TileAttribute,
  TSupertileGrid = SupertileGridEntry | SimplifiedSupertileGridEntry,
> {
  Atrb: {
    1000: {
      name: "Tile Attribute Data";
      obj: TTileAttribute[];
      order: number;
    };
  };
  Timg?: {
    1000: {
      name: "Extracted Tile Image Data 32x32/16bit";
      data: string;
      order: number;
    };
  };
  Xlat?: {
    1000: {
      name: "Tile Index Translation Table";
      obj: { idx: number }[];
      order: number;
    };
  };
  ItCo: {
    1000: {
      name: "Terrain Items Color Array";
      data: string;
      order: number;
    };
  };
  Layr?: {
    1000: {
      name: "Terrain Layer Matrix";
      obj: number[];
      order: number;
    };
    1001?: {
      name: "Roof Terrain Layer Matrix";
      obj: number[];
      order: number;
    };
  };
  STgd?: {
    1000: {
      name: "SuperTile Grid";
      obj: TSupertileGrid[];
      order: number;
    };
  };
  YCrd: {
    1000: {
      name: "Floor&Ceiling Y Coords";
      obj: number[];
      order: number;
    };
    1001?: {
      name: "Roof Y Coords";
      obj: number[];
      order: number;
    };
  };
  Vcol?: Record<
    number,
    {
      name: "Floor&Ceiling Vertex Colors";
      data: string;
      order: number;
    }
  >;
  alis: Record<
    number,
    {
      name: "Texture Page Picture Alias";
      data: string;
      order: number;
    }
  >;
  _metadata: LevelMetadata;
    tileset?: unknown;
}

// COMPLETE LEVEL DATA INTERFACE

export interface LevelData<
  THeader = StandardHeader,
  TItem = TerrainItem,
  TTileAttribute = TileAttribute,
  TSupertileGrid = SupertileGridEntry | SimplifiedSupertileGridEntry,
  TSplineItem = SplineItem,
> extends HeaderData<THeader>,
    Partial<FenceData>,
    Partial<SplineData<TSplineItem>>,
    Partial<LiquidData>,
    Partial<ItemData<TItem>>,
    TerrainData<TTileAttribute, TSupertileGrid> {}

// TYPE GUARDS

export function hasIsEmptyField(
  grid: SupertileGridEntry | SimplifiedSupertileGridEntry
): grid is SupertileGridEntry {
  return "isEmpty" in grid;
}

export function isSupertileEmpty(
  grid: SupertileGridEntry | SimplifiedSupertileGridEntry
): boolean {
  if (hasIsEmptyField(grid)) {
    return grid.isEmpty;
  }
  return grid.superTileId === -1;
}

export function createBlankSupertileEntry(
  emptyTileIdx: number,
): SupertileGridEntry | SimplifiedSupertileGridEntry {
  if (emptyTileIdx < 0) {
    return { superTileId: emptyTileIdx };
  }
  return { isEmpty: true, superTileId: 0 };
}

export function hasFullHeader(
  header: StandardHeader | BaseHeader
): header is StandardHeader {
  return "numTilePages" in header && "numTiles" in header;
}
