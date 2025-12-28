/**
 * Game-specific level data types based on thorough analysis of Pangea game source code.
 *
 * Key differences between games:
 * - TerrainItemEntryType: u32 coords (most games) vs u16 coords (Bugdom 1, Nanosaur 1)
 * - Header format: Full with numTilePages/numTiles (Otto) vs simplified (Bugdom 2/Billy)
 * - SupertileGridType: isEmpty+id (Otto) vs signed id only (Bugdom 2/Billy, -1 = empty)
 * - Nanosaur 1: Uses proprietary binary format (not resource fork)
 *
 * Nullable data (can be retroactively added):
 * - Splines (SpNb, SpPt, SpIt, Spln)
 * - Fences (Fenc, FnNb)
 * - Liquids/Water (Liqd)
 * - Checkpoints (CkPt) - only in Bugdom 2, Nanosaur 2, Billy Frontier
 */

import { FenceType } from "../../data/fences/ottoFenceType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";

// ============================================================================
// COMMON BASE TYPES (shared across games)
// ============================================================================

/** Base tile attribute type - same for all games */
export interface BaseTileAttribute {
  flags: number;
  p0: number;
  p1: number;
}

/** Base fence type - same for all games */
export interface BaseFence {
  fenceType: FenceType;
  numNubs: number;
  junkNubListPtr: number;
  bbTop: number;
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
}

/** Fence nub coordinates */
export type FenceNub = [x: number, z: number];

/** Base spline point type */
export interface BaseSplinePoint {
  x: number;
  z: number;
}

/** Base spline nub type */
export interface BaseSplineNub {
  x: number;
  z: number;
}

/** Base spline item type */
export interface BaseSplineItem<TSplineItemType = number> {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  placement: number;
  type: TSplineItemType;
}

/** Base spline definition */
export interface BaseSpline {
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
  bbTop: number;
  numItems: number;
  numNubs: number;
  numPoints: number;
}

/** Base liquid/water type */
export interface BaseLiquid {
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
// OTTO MATIC TYPES (baseline/reference implementation)
// ============================================================================

/**
 * Otto Matic header - full format with numTilePages and numTiles
 * Source: games/ottomatic/src/System/File.c - PlayfieldHeaderType
 */
export interface OttoMaticHeader {
  version: number;
  numItems: number;
  mapWidth: number;
  mapHeight: number;
  numTilePages: number;
  numTiles: number;
  tileSize: number;
  minY: number;
  maxY: number;
  numSplines: number;
  numFences: number;
  numUniqueSupertiles: number;
  numWaterPatches: number;
  numCheckpoints: number;
}

/**
 * Otto Matic terrain item - 32-bit coordinates
 * Source: games/ottomatic/src/Headers/structs.h - TerrainItemEntryType
 */
export interface OttoMaticItem<TItemType = number> {
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
 * Otto Matic supertile grid - includes isEmpty flag
 * Source: games/ottomatic/src/Headers/terrain.h - SuperTileGridType
 */
export interface OttoMaticSupertileGrid {
  isEmpty: boolean;
  superTileId: number; // uint16_t
}

// ============================================================================
// BUGDOM 1 TYPES (classic format)
// ============================================================================

/**
 * Bugdom 1 header - older format with int types
 * Source: games/bugdom/src/Headers/terrain.h - no explicit header struct in file
 * Note: Uses integer types instead of unsigned, different field layout
 */
export interface BugdomHeader {
  version: number; // int
  numItems: number; // int
  mapWidth: number; // int
  mapHeight: number; // int
  numTilePages: number; // int
  numTiles: number; // int
  tileSize: number; // float
  minY: number; // float
  maxY: number; // float
  numSplines: number; // int
  numFences: number; // int
}

/**
 * Bugdom 1 terrain item - 16-bit coordinates
 * Source: games/bugdom/src/Headers/structs.h - TerrainItemEntryType
 */
export interface BugdomItem<TItemType = number> {
  x: number; // uint16_t
  z: number; // uint16_t (y in file)
  type: TItemType; // uint16_t
  flags: number; // uint16_t
  p0: number; // Byte
  p1: number; // Byte
  p2: number; // Byte
  p3: number; // Byte
}

/**
 * Bugdom 1 tile attribute - extended format with parm0/parm1/parm2
 * Source: games/bugdom/src/Headers/terrain.h - TileAttribType
 */
export interface BugdomTileAttribute {
  bits: number; // UInt16
  parm0: number; // short
  parm1: number; // Byte
  parm2: number; // Byte
  undefined: number; // short
  // Also provide base interface fields for compatibility
  flags: number;
  p0: number;
  p1: number;
}

// ============================================================================
// BUGDOM 2 TYPES (simplified format)
// ============================================================================

/**
 * Bugdom 2 header - simplified format without numTilePages/numTiles
 * Source: games/bugdom2/Source/Headers/structs.h
 */
export interface Bugdom2Header {
  version: number;
  numItems: number;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  minY: number;
  maxY: number;
  numSplines: number;
  numFences: number;
  numUniqueSupertiles: number;
  numWaterPatches: number;
  numCheckpoints: number;
}

/**
 * Bugdom 2 terrain item - 32-bit coordinates
 * Source: games/bugdom2/Source/Headers/structs.h - TerrainItemEntryType
 */
export interface Bugdom2Item<TItemType = number> {
  x: number; // uint32_t
  z: number; // uint32_t (y in file)
  type: TItemType; // uint16_t
  flags: number; // uint16_t
  p0: number; // Byte
  p1: number; // Byte
  p2: number; // Byte
  p3: number; // Byte
}

/**
 * Bugdom 2 supertile grid - signed short, -1 = empty
 * Source: games/bugdom2/Source/Headers/terrain.h
 */
export interface Bugdom2SupertileGrid {
  superTileId: number; // int16_t (-1 = empty, EMPTY_SUPERTILE)
}

/**
 * Bugdom 2 checkpoint/line marker
 * Source: games/bugdom2/Source/Headers/terrain.h - LineMarkerDefType
 */
export interface Bugdom2Checkpoint {
  unused: number; // int16_t
  infoBits: number; // int16_t
  x1: number; // float
  x2: number; // float
  z1: number; // float
  z2: number; // float
}

// ============================================================================
// NANOSAUR 1 TYPES (proprietary binary format)
// ============================================================================

/**
 * Nanosaur 1 header - proprietary binary format
 * Source: games/nanosaur/src/System/Terrain.c
 * Note: This is parsed from a .ter file, not a resource fork
 */
export interface NanosaurHeader {
  textureLayerOffset: number;
  heightmapLayerOffset: number;
  pathLayerOffset: number;
  objectListOffset: number;
  unknown1: number;
  heightmapTilesOffset: number;
  unknown2: number;
  width: number;
  depth: number;
  textureAttribOffset: number;
  tileAnimDataOffset: number;
}

/**
 * Nanosaur 1 terrain item - 16-bit coords with linked list pointers
 * Source: games/nanosaur/src/Headers/structs.h - TerrainItemEntryType
 * Note: Includes linked list pointers for spatial indexing
 */
export interface NanosaurItem {
  x: number; // UInt16
  y: number; // UInt16 (not z, using y for 2D position)
  type: number; // UInt16
  parm: [number, number, number, number]; // Byte[4]
  flags: number; // UInt16
  prevItemIdx: number; // SInt32
  nextItemIdx: number; // SInt32
}

/**
 * Nanosaur 1 tile attribute - extended format
 * Source: games/nanosaur/src/Headers/terrain.h - TileAttribType
 */
export interface NanosaurTileAttribute {
  bits: number; // UInt16
  parm0: number; // short
  parm1: number; // Byte
  parm2: number; // Byte
  undefined: number; // short
}

// ============================================================================
// NANOSAUR 2 TYPES
// ============================================================================

/**
 * Nanosaur 2 header - simplified format without numTilePages/numTiles
 * Source: games/nanosaur2/Source/System/File.c - PlayfieldHeaderType
 * Note: Same as Bugdom 2 format
 */
export interface Nanosaur2Header {
  version: number;
  numItems: number;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  minY: number;
  maxY: number;
  numSplines: number;
  numFences: number;
  numUniqueSupertiles: number;
  numWaterPatches: number;
  numCheckpoints: number;
}

/**
 * Nanosaur 2 terrain item - 32-bit coordinates with terrainY
 * Source: games/nanosaur2/Source/Headers/structs.h - TerrainItemEntryType
 * Note: Has additional terrainY field calculated at runtime
 */
export interface Nanosaur2Item<TItemType = number> {
  x: number; // uint32_t
  z: number; // uint32_t (y in file)
  type: TItemType; // uint16_t
  flags: number; // uint16_t
  p0: number; // Byte
  p1: number; // Byte
  p2: number; // Byte
  p3: number; // Byte
}

/**
 * Nanosaur 2 checkpoint/line marker
 * Source: games/nanosaur2/Source/Headers/terrain.h - LineMarkerDefType
 */
export interface Nanosaur2Checkpoint {
  unused: number;
  infoBits: number;
  x1: number;
  x2: number;
  z1: number;
  z2: number;
}

// ============================================================================
// CRO-MAG RALLY TYPES
// ============================================================================

/**
 * Cro-Mag Rally header - same as Otto Matic
 * Source: games/cromagrally/Source/Headers/structs.h
 */
export type CroMagHeader = OttoMaticHeader;

/**
 * Cro-Mag Rally terrain item - 32-bit coordinates
 * Source: games/cromagrally/Source/Headers/structs.h - TerrainItemEntryType
 */
export type CroMagItem<TItemType = number> = OttoMaticItem<TItemType>;

/**
 * Cro-Mag Rally supertile grid - same as Otto Matic
 */
export type CroMagSupertileGrid = OttoMaticSupertileGrid;

// ============================================================================
// BILLY FRONTIER TYPES
// ============================================================================

/**
 * Billy Frontier header - same as Bugdom 2 (simplified)
 * Source: games/billyfrontier/Source/Headers/structs.h
 */
export type BillyFrontierHeader = Bugdom2Header;

/**
 * Billy Frontier terrain item - 32-bit coordinates
 * Source: games/billyfrontier/Source/Headers/structs.h - TerrainItemEntryType
 */
export type BillyFrontierItem<TItemType = number> = OttoMaticItem<TItemType>;

/**
 * Billy Frontier supertile grid - signed short, -1 = empty
 * Same as Bugdom 2
 */
export type BillyFrontierSupertileGrid = Bugdom2SupertileGrid;

/**
 * Billy Frontier checkpoint/line marker
 * Source: games/billyfrontier/Source/Headers/terrain.h - LineMarkerDefType
 */
export interface BillyFrontierCheckpoint {
  unused: number;
  infoBits: number;
  x1: number;
  x2: number;
  z1: number;
  z2: number;
}

// ============================================================================
// LEVEL DATA CONTAINER TYPES
// ============================================================================

/**
 * Base resource entry wrapper
 */
export interface ResourceEntry<T> {
  name?: string;
  obj: T;
  order?: number;
  data?: string; // For raw hex data (Timg, etc.)
}

/**
 * Resource entry with just hex data (no parsed obj)
 */
export interface HexResourceEntry {
  name?: string;
  data: string;
  order?: number;
}

/**
 * Metadata common to all level files
 */
export interface LevelMetadata {
  file_attributes: number;
  junk1: number;
  junk2: number;
}

/**
 * Base level data structure - common elements
 */
export interface BaseLevelData {
  _metadata: LevelMetadata;
  alis: Record<number, HexResourceEntry>;
}

/**
 * Header data section
 */
export interface HeaderSection<THeader> {
  Hedr: {
    1000: {
      name: "Header";
      obj: THeader;
      order: 0;
    };
  };
}

/**
 * Terrain data section
 */
export interface TerrainSection<
  TTileAttrib = BaseTileAttribute,
  TSupertileGrid = OttoMaticSupertileGrid,
> {
  Atrb: {
    1000: ResourceEntry<TTileAttrib[]>;
  };
  Layr?: {
    1000: ResourceEntry<number[]>;
  };
  YCrd: {
    1000: ResourceEntry<number[]>;
  };
  STgd?: {
    1000: ResourceEntry<TSupertileGrid[]>;
  };
  Timg?: {
    1000: HexResourceEntry;
  };
  ItCo: {
    1000: HexResourceEntry;
  };
  // Bugdom 1 specific - tile index translation table
  Xlat?: {
    1000: ResourceEntry<Array<{ idx: number }>>;
  };
  // Bugdom 1 specific - vertex colors
  Vcol?: Record<number, HexResourceEntry>;
}

/**
 * Item data section
 */
export interface ItemSection<TItem> {
  Itms?: {
    1000: ResourceEntry<TItem[]>;
  };
}

/**
 * Spline data section (optional/nullable)
 */
export interface SplineSection<TSplineItem = BaseSplineItem> {
  Spln?: {
    1000: ResourceEntry<BaseSpline[]>;
  };
  SpNb?: Record<number, ResourceEntry<BaseSplineNub[]>>;
  SpPt?: Record<number, ResourceEntry<BaseSplinePoint[]>>;
  SpIt?: Record<number, ResourceEntry<TSplineItem[]>>;
}

/**
 * Fence data section (optional/nullable)
 */
export interface FenceSection {
  Fenc?: {
    1000: ResourceEntry<BaseFence[]>;
  };
  FnNb?: Record<number, ResourceEntry<FenceNub[]>>;
}

/**
 * Liquid/water data section (optional/nullable)
 */
export interface LiquidSection {
  Liqd?: {
    1000: ResourceEntry<BaseLiquid[]>;
  };
}

/**
 * Checkpoint data section (optional, only in Bugdom 2/Nanosaur 2/Billy Frontier)
 */
export interface CheckpointSection<TCheckpoint = Bugdom2Checkpoint> {
  CkPt?: {
    1000: ResourceEntry<TCheckpoint[]>;
  };
}

// ============================================================================
// FULL LEVEL DATA TYPES FOR EACH GAME
// ============================================================================

/**
 * Otto Matic level data - full format
 */
export type OttoMaticLevelData = BaseLevelData &
  HeaderSection<OttoMaticHeader> &
  TerrainSection<BaseTileAttribute, OttoMaticSupertileGrid> &
  ItemSection<OttoMaticItem> &
  SplineSection &
  FenceSection &
  LiquidSection;

/**
 * Bugdom 1 level data - classic format
 */
export type BugdomLevelData = BaseLevelData &
  HeaderSection<BugdomHeader> &
  TerrainSection<BugdomTileAttribute, OttoMaticSupertileGrid> &
  ItemSection<BugdomItem> &
  SplineSection &
  FenceSection &
  LiquidSection;

/**
 * Bugdom 2 level data - simplified format with checkpoints
 */
export type Bugdom2LevelData = BaseLevelData &
  HeaderSection<Bugdom2Header> &
  TerrainSection<BaseTileAttribute, Bugdom2SupertileGrid> &
  ItemSection<Bugdom2Item> &
  SplineSection &
  FenceSection &
  LiquidSection &
  CheckpointSection<Bugdom2Checkpoint>;

/**
 * Nanosaur 2 level data
 */
export type Nanosaur2LevelData = BaseLevelData &
  HeaderSection<Nanosaur2Header> &
  TerrainSection<BaseTileAttribute, OttoMaticSupertileGrid> &
  ItemSection<Nanosaur2Item> &
  SplineSection &
  FenceSection &
  LiquidSection &
  CheckpointSection<Nanosaur2Checkpoint>;

/**
 * Cro-Mag Rally level data - same as Otto Matic
 */
export type CroMagLevelData = BaseLevelData &
  HeaderSection<CroMagHeader> &
  TerrainSection<BaseTileAttribute, CroMagSupertileGrid> &
  ItemSection<CroMagItem> &
  SplineSection &
  FenceSection &
  LiquidSection;

/**
 * Billy Frontier level data - simplified format with checkpoints
 */
export type BillyFrontierLevelData = BaseLevelData &
  HeaderSection<BillyFrontierHeader> &
  TerrainSection<BaseTileAttribute, BillyFrontierSupertileGrid> &
  ItemSection<BillyFrontierItem> &
  SplineSection &
  FenceSection &
  LiquidSection &
  CheckpointSection<BillyFrontierCheckpoint>;

// ============================================================================
// UNION TYPE FOR ANY LEVEL DATA
// ============================================================================

/**
 * Union type for level data from any supported game
 */
export type AnyLevelData =
  | OttoMaticLevelData
  | BugdomLevelData
  | Bugdom2LevelData
  | Nanosaur2LevelData
  | CroMagLevelData
  | BillyFrontierLevelData;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a supertile grid has isEmpty field (Otto/CroMag style)
 */
export function hasIsEmptyField(
  grid: OttoMaticSupertileGrid | Bugdom2SupertileGrid,
): grid is OttoMaticSupertileGrid {
  return "isEmpty" in grid;
}

/**
 * Check if supertile is empty based on game type
 */
export function isSupertileEmpty(
  grid: OttoMaticSupertileGrid | Bugdom2SupertileGrid,
): boolean {
  if (hasIsEmptyField(grid)) {
    return grid.isEmpty;
  }
  return grid.superTileId === -1;
}

/**
 * Check if header has numTilePages/numTiles (Otto style)
 */
export function hasFullHeader(
  header: OttoMaticHeader | Bugdom2Header,
): header is OttoMaticHeader {
  return "numTilePages" in header && "numTiles" in header;
}
