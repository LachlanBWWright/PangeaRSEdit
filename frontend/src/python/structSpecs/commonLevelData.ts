/**
 * Common Level Data Types
 *
 * This file contains generic level data types that are shared across all games.
 * Game-specific extensions should be imported from their respective files
 * (e.g., ottoMaticSpecificData.ts, bugdomSpecificData.ts).
 *
 * These types replace the previous "OttoMaticLevelData" naming which was used
 * generically across all games.
 */

import { FenceType } from "../../data/fences/ottoFenceType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";

// ============================================================================
// COMMON HEADER TYPES
// ============================================================================

/**
 * Base header interface shared by all games.
 * Games may extend this with additional fields.
 */
export interface CommonHeader {
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
 * Full header format (Otto Matic, Cro-Mag Rally style)
 * Includes numTilePages, numTiles, numUniqueSupertiles, numWaterPatches, numCheckpoints
 */
export interface FullHeader extends CommonHeader {
  numTilePages: number;
  numTiles: number;
  numUniqueSupertiles: number;
  numWaterPatches: number;
  numCheckpoints: number;
}

/**
 * Simplified header format (Bugdom 2, Billy Frontier style)
 * No numTilePages or numTiles
 */
export interface SimplifiedHeader extends CommonHeader {
  numUniqueSupertiles: number;
  numWaterPatches: number;
  numCheckpoints: number;
}

/**
 * Cro-Mag Rally header - uses numPaths instead of numWaterPatches
 */
export interface CroMagHeader extends CommonHeader {
  numTilePages: number;
  numTiles: number;
  numUniqueSupertiles: number;
  numPaths: number;
  numCheckpoints: number;
}

// ============================================================================
// COMMON TILE AND TERRAIN TYPES
// ============================================================================

/**
 * Common tile attribute type
 */
export interface CommonTileAttribute {
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
  // Compatibility fields
  flags: number;
  p0: number;
  p1: number;
}

/**
 * Common supertile grid with isEmpty flag (Otto Matic style)
 */
export interface CommonSupertileGrid {
  padByte?: string;
  isEmpty: boolean;
  superTileId: number;
}

/**
 * Simplified supertile grid (-1 = empty, Bugdom 2 style)
 */
export interface SimplifiedSupertileGrid {
  superTileId: number; // -1 = empty
}

// ============================================================================
// COMMON ITEM TYPES
// ============================================================================

/**
 * Common terrain item (32-bit coordinates)
 */
export interface CommonItem<TItemType = number> {
  x: number; // uint32_t
  z: number; // uint32_t (y in file, but z in 3D space)
  type: TItemType; // uint16_t
  flags: number; // uint16_t
  p0: number; // Byte
  p1: number; // Byte
  p2: number; // Byte
  p3: number; // Byte
}

/**
 * Classic terrain item (16-bit coordinates, Bugdom 1, Nanosaur 1)
 */
export interface ClassicItem<TItemType = number> {
  x: number; // uint16_t
  z: number; // uint16_t (y in file)
  type: TItemType; // uint16_t
  flags: number; // uint16_t
  p0: number; // Byte
  p1: number; // Byte
  p2: number; // Byte
  p3: number; // Byte
}

// ============================================================================
// COMMON FENCE TYPES
// ============================================================================

/**
 * Common fence definition
 */
export interface CommonFence {
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
export type CommonFenceNub = [x: number, y: number];

// ============================================================================
// COMMON SPLINE TYPES
// ============================================================================

/**
 * Common spline nub
 */
export interface CommonSplineNub {
  x: number;
  z: number;
}

/**
 * Common spline point
 */
export interface CommonSplinePoint {
  x: number;
  z: number;
}

/**
 * Common spline item
 */
export interface CommonSplineItem<TSplineItemType = number> {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  placement: number;
  type: TSplineItemType;
}

/**
 * Common spline definition
 */
export interface CommonSpline {
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
  bbTop: number;
  numItems: number;
  numNubs: number;
  numPoints: number;
}

// ============================================================================
// COMMON LIQUID/WATER TYPES
// ============================================================================

/**
 * Common liquid/water body
 */
export interface CommonLiquid {
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
// COMMON CHECKPOINT TYPE
// ============================================================================

/**
 * Common checkpoint/line marker
 */
export interface CommonCheckpoint {
  unused: number;
  infoBits: number;
  x1: number;
  x2: number;
  z1: number;
  z2: number;
}

// ============================================================================
// COMMON DATA SECTION INTERFACES
// ============================================================================

/**
 * Level metadata
 */
export interface LevelMetadata {
  file_attributes: number;
  junk1: number;
  junk2: number;
}

/**
 * Header data section wrapper
 */
export interface HeaderData<THeader = FullHeader> {
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
      obj: CommonFence[];
      order: number;
    };
  };
  FnNb: Record<
    number,
    {
      name: "Fence Nub List";
      obj: CommonFenceNub[];
      order: number;
    }
  >;
}

/**
 * Spline data section
 */
export interface SplineData<TSplineItem = CommonSplineItem> {
  SpNb: Record<
    number,
    {
      name?: "Spline Nub List";
      obj: CommonSplineNub[];
      order?: number;
    }
  >;
  SpPt: Record<
    number,
    {
      name?: "Spline Point List";
      obj: CommonSplinePoint[];
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
      obj: CommonSpline[];
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
      obj: CommonLiquid[];
      order: number;
    };
  };
}

/**
 * Item data section
 */
export interface ItemData<TItem = CommonItem> {
  Itms: {
    1000: {
      name: "Terrain Items List";
      obj: TItem[];
      order: number;
    };
  };
}

/**
 * Terrain data section - includes all terrain-related data
 */
export interface TerrainData<
  TTileAttribute = CommonTileAttribute,
  TSupertileGrid = CommonSupertileGrid,
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
  // Xlat is only used in Bugdom 1 - maps tile indices to image indices
  Xlat?: {
    1000: {
      name: "Tile Index Translation Table";
      obj: Array<{ idx: number }>;
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
  // STgd is optional - Bugdom 1 doesn't have it (uses Layr + Xlat instead)
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
  };
  // Vcol (Vertex Colors) - 16-bit color values for each vertex
  // Only in Bugdom 1.
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
// COMBINED LEVEL DATA INTERFACE
// ============================================================================

/**
 * Common level data structure - the base interface for all games
 * This replaces the previous "ottoMaticLevel" as the generic type
 */
export interface CommonLevelData<
  THeader = FullHeader,
  TItem = CommonItem,
  TTileAttribute = CommonTileAttribute,
  TSupertileGrid = CommonSupertileGrid,
  TSplineItem = CommonSplineItem,
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
 * Check if a supertile grid has isEmpty field (Otto/CroMag style)
 */
export function hasIsEmptyField(
  grid: CommonSupertileGrid | SimplifiedSupertileGrid,
): grid is CommonSupertileGrid {
  return "isEmpty" in grid;
}

/**
 * Check if supertile is empty based on game type
 */
export function isSupertileEmpty(
  grid: CommonSupertileGrid | SimplifiedSupertileGrid,
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
  header: FullHeader | SimplifiedHeader,
): header is FullHeader {
  return "numTilePages" in header && "numTiles" in header;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const COMMON_LIQD_NUBS = 100;

// Re-export compatibility aliases for existing code
// These types match the previous ottoMaticLevelData.ts exports
export type ottoTileAttribute = CommonTileAttribute;
export type ottoFence = CommonFence;
export type ottoFenceNub = CommonFenceNub;
export type ottoHeader = FullHeader;
export type ottoItem = CommonItem;
export type ottoLiquid = CommonLiquid;
export type ottoSupertileGrid = CommonSupertileGrid;
export type ottoSplineItem = CommonSplineItem;
export type ottoSplineNub = CommonSplineNub;
export type ottoSplinePoint = CommonSplinePoint;
export type ottoSpline = CommonSpline;
export const OTTO_LIQD_NUBS = COMMON_LIQD_NUBS;
