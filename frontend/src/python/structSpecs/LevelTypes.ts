/**
 * Common Level Data Types
 *
 * These are generic level data structures shared across ALL Pangea games.
 * Game-specific variations should be created in separate files.
 */

import { FenceType } from "../../data/fences/ottoFenceType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";

// ============================================================================
// HEADER TYPES
// ============================================================================

/**
 * Base header interface - fields common to ALL games
 */
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

/**
 * Standard header - used by Otto Matic, Bugdom 2, Nanosaur 2, Billy Frontier
 */
export interface StandardHeader extends BaseHeader {
  numTilePages: number;
  numTiles: number;
  numUniqueSupertiles: number;
  numWaterPatches: number;
  numCheckpoints: number;
}

/**
 * Cro-Mag header - uses numPaths instead of numWaterPatches
 */
export interface CroMagHeader extends BaseHeader {
  numTilePages: number;
  numTiles: number;
  numUniqueSupertiles: number;
  numPaths: number;
  numCheckpoints: number;
}

// ============================================================================
// TILE AND TERRAIN TYPES
// ============================================================================

/**
 * Tile attribute - flags and parameters for each tile
 */
export interface TileAttribute {
  flags: number;
  p0: number;
  p1: number;
}

/**
 * Extended tile attribute (Bugdom 1, Nanosaur 1 style)
 */
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

/**
 * Supertile grid entry with isEmpty flag
 */
export interface SupertileGridEntry {
  padByte?: string;
  isEmpty: boolean;
  superTileId: number;
}

/**
 * Simplified supertile grid entry (-1 = empty)
 */
export interface SimplifiedSupertileGridEntry {
  superTileId: number;
}

// ============================================================================
// ITEM TYPES
// ============================================================================

/**
 * Terrain item - generic type parameter for item type enum
 */
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

// ============================================================================
// FENCE TYPES
// ============================================================================

/**
 * Fence definition
 */
export interface Fence {
  fenceType: FenceType;
  numNubs: number;
  junkNubListPtr: number;
  bbTop: number;
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
}

/**
 * Fence nub coordinates
 */
export type FenceNub = [x: number, y: number];

// ============================================================================
// SPLINE TYPES
// ============================================================================

/**
 * Spline nub
 */
export interface SplineNub {
  x: number;
  z: number;
}

/**
 * Spline point
 */
export interface SplinePoint {
  x: number;
  z: number;
}

/**
 * Spline item - generic type parameter for item type enum
 */
export interface SplineItem<TSplineItemType = number> {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  placement: number;
  type: TSplineItemType;
}

/**
 * Spline definition
 */
export interface Spline {
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
  bbTop: number;
  numItems: number;
  numNubs: number;
  numPoints: number;
}

// ============================================================================
// WATER/LIQUID TYPES
// ============================================================================

export const LIQUID_NUBS_COUNT = 100;

/**
 * Liquid/water body
 */
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

// ============================================================================
// CHECKPOINT TYPE
// ============================================================================

/**
 * Checkpoint/line marker
 */
export interface Checkpoint {
  unused: number;
  infoBits: number;
  x1: number;
  x2: number;
  z1: number;
  z2: number;
}

// ============================================================================
// DATA SECTION INTERFACES (Resource format wrappers)
// ============================================================================

/**
 * Level metadata from resource fork
 */
export interface LevelMetadata {
  file_attributes: number;
  junk1: number;
  junk2: number;
  nanosaur1RawLevel?: unknown;
  terrainTiles?: unknown;
  mightyMikeMapData?: unknown;
  [key: string]: unknown;
}

/**
 * Header data section wrapper
 */
export interface HeaderData<THeader = StandardHeader> {
  Hedr: {
    1000: {
      name: "Header";
      obj: THeader;
      order: 0;
    };
  };
}

/**
 * Fence data section
 */
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

/**
 * Spline data section
 */
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

/**
 * Liquid/Water data section
 */
export interface LiquidData {
  Liqd: {
    1000: {
      name: "Water List";
      obj: Liquid[];
      order: number;
    };
  };
}

/**
 * Item data section
 */
export interface ItemData<TItem = TerrainItem> {
  Itms: {
    1000: {
      name: "Terrain Items List";
      obj: TItem[];
      order: number;
    };
  };
}

/**
 * Terrain data section - tiles, coordinates, textures
 */
export interface TerrainData<
  TTileAttribute = TileAttribute,
  TSupertileGrid = SupertileGridEntry,
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
}

// ============================================================================
// COMPLETE LEVEL DATA INTERFACE
// ============================================================================

/**
 * Complete level data structure - combines all sections
 */
export interface LevelData<
  THeader = StandardHeader,
  TItem = TerrainItem,
  TTileAttribute = TileAttribute,
  TSupertileGrid = SupertileGridEntry,
  TSplineItem = SplineItem,
> extends HeaderData<THeader>,
    Partial<FenceData>,
    Partial<SplineData<TSplineItem>>,
    Partial<LiquidData>,
    Partial<ItemData<TItem>>,
    TerrainData<TTileAttribute, TSupertileGrid> {}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if supertile grid entry has isEmpty field
 */
export function hasIsEmptyField(
  grid: SupertileGridEntry | SimplifiedSupertileGridEntry
): grid is SupertileGridEntry {
  return "isEmpty" in grid;
}

/**
 * Check if supertile is empty based on entry type
 */
export function isSupertileEmpty(
  grid: SupertileGridEntry | SimplifiedSupertileGridEntry
): boolean {
  if (hasIsEmptyField(grid)) {
    return grid.isEmpty;
  }
  return grid.superTileId === -1;
}

/**
 * Check if header has numTilePages/numTiles (full format)
 */
export function hasFullHeader(
  header: StandardHeader | BaseHeader
): header is StandardHeader {
  return "numTilePages" in header && "numTiles" in header;
}
