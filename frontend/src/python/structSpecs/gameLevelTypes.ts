
import { FenceType } from "../../data/fences/ottoFenceType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";
export interface BaseTileAttribute {
  flags: number;
  p0: number;
  p1: number;
}
export interface BaseFence {
  fenceType: FenceType;
  numNubs: number;
  junkNubListPtr: number;
  bbTop: number;
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
}
export type FenceNub = [x: number, z: number];
export interface BaseSplinePoint {
  x: number;
  z: number;
}
export interface BaseSplineNub {
  x: number;
  z: number;
}
export interface BaseSplineItem<TSplineItemType = number> {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  placement: number;
  type: TSplineItemType;
}
export interface BaseSpline {
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
  bbTop: number;
  numItems: number;
  numNubs: number;
  numPoints: number;
}
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
export interface OttoMaticSupertileGrid {
  isEmpty: boolean;
  superTileId: number; // uint16_t
}
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
export interface BugdomTileAttribute {
  bits: number; // UInt16
  parm0: number; // short
  parm1: number; // Byte
  parm2: number; // Byte
  undefined: number; // short
  flags: number;
  p0: number;
  p1: number;
}
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
export interface Bugdom2SupertileGrid {
  superTileId: number; // int16_t (-1 = empty, EMPTY_SUPERTILE)
}
export interface Bugdom2Checkpoint {
  unused: number; // int16_t
  infoBits: number; // int16_t
  x1: number; // float
  x2: number; // float
  z1: number; // float
  z2: number; // float
}
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
export interface NanosaurItem {
  x: number; // UInt16
  y: number; // UInt16 (not z, using y for 2D position)
  type: number; // UInt16
  parm: [number, number, number, number]; // Byte[4]
  flags: number; // UInt16
  prevItemIdx: number; // SInt32
  nextItemIdx: number; // SInt32
}
export interface NanosaurTileAttribute {
  bits: number; // UInt16
  parm0: number; // short
  parm1: number; // Byte
  parm2: number; // Byte
  undefined: number; // short
}
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
export interface Nanosaur2Checkpoint {
  unused: number;
  infoBits: number;
  x1: number;
  x2: number;
  z1: number;
  z2: number;
}
export type CroMagHeader = OttoMaticHeader;
export type CroMagItem<TItemType = number> = OttoMaticItem<TItemType>;
export type CroMagSupertileGrid = OttoMaticSupertileGrid;
export type BillyFrontierHeader = Bugdom2Header;
export type BillyFrontierItem<TItemType = number> = OttoMaticItem<TItemType>;
export type BillyFrontierSupertileGrid = Bugdom2SupertileGrid;
export interface BillyFrontierCheckpoint {
  unused: number;
  infoBits: number;
  x1: number;
  x2: number;
  z1: number;
  z2: number;
}
export interface ResourceEntry<T> {
  name?: string;
  obj: T;
  order?: number;
  data?: string; // For raw hex data (Timg, etc.)
}
export interface HexResourceEntry {
  name?: string;
  data: string;
  order?: number;
}
export interface LevelMetadata {
  file_attributes: number;
  junk1: number;
  junk2: number;
}
export interface BaseLevelData {
  _metadata: LevelMetadata;
  alis: Record<number, HexResourceEntry>;
}
export interface HeaderSection<THeader> {
  Hedr: {
    1000: {
      name: "Header";
      obj: THeader;
      order: 0;
    };
  };
}
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
  Xlat?: {
    1000: ResourceEntry<{ idx: number }[]>;
  };
  Vcol?: Record<number, HexResourceEntry>;
}
export interface ItemSection<TItem> {
  Itms?: {
    1000: ResourceEntry<TItem[]>;
  };
}
export interface SplineSection<TSplineItem = BaseSplineItem> {
  Spln?: {
    1000: ResourceEntry<BaseSpline[]>;
  };
  SpNb?: Record<number, ResourceEntry<BaseSplineNub[]>>;
  SpPt?: Record<number, ResourceEntry<BaseSplinePoint[]>>;
  SpIt?: Record<number, ResourceEntry<TSplineItem[]>>;
}
export interface FenceSection {
  Fenc?: {
    1000: ResourceEntry<BaseFence[]>;
  };
  FnNb?: Record<number, ResourceEntry<FenceNub[]>>;
}
export interface LiquidSection {
  Liqd?: {
    1000: ResourceEntry<BaseLiquid[]>;
  };
}
export interface CheckpointSection<TCheckpoint = Bugdom2Checkpoint> {
  CkPt?: {
    1000: ResourceEntry<TCheckpoint[]>;
  };
}
export type OttoMaticLevelData = BaseLevelData &
  HeaderSection<OttoMaticHeader> &
  TerrainSection<BaseTileAttribute, OttoMaticSupertileGrid> &
  ItemSection<OttoMaticItem> &
  SplineSection &
  FenceSection &
  LiquidSection;
export type BugdomLevelData = BaseLevelData &
  HeaderSection<BugdomHeader> &
  TerrainSection<BugdomTileAttribute, OttoMaticSupertileGrid> &
  ItemSection<BugdomItem> &
  SplineSection &
  FenceSection &
  LiquidSection;
export type Bugdom2LevelData = BaseLevelData &
  HeaderSection<Bugdom2Header> &
  TerrainSection<BaseTileAttribute, Bugdom2SupertileGrid> &
  ItemSection<Bugdom2Item> &
  SplineSection &
  FenceSection &
  LiquidSection &
  CheckpointSection<Bugdom2Checkpoint>;
export type Nanosaur2LevelData = BaseLevelData &
  HeaderSection<Nanosaur2Header> &
  TerrainSection<BaseTileAttribute, OttoMaticSupertileGrid> &
  ItemSection<Nanosaur2Item> &
  SplineSection &
  FenceSection &
  LiquidSection &
  CheckpointSection<Nanosaur2Checkpoint>;
export type CroMagLevelData = BaseLevelData &
  HeaderSection<CroMagHeader> &
  TerrainSection<BaseTileAttribute, CroMagSupertileGrid> &
  ItemSection<CroMagItem> &
  SplineSection &
  FenceSection &
  LiquidSection;
export type BillyFrontierLevelData = BaseLevelData &
  HeaderSection<BillyFrontierHeader> &
  TerrainSection<BaseTileAttribute, BillyFrontierSupertileGrid> &
  ItemSection<BillyFrontierItem> &
  SplineSection &
  FenceSection &
  LiquidSection &
  CheckpointSection<BillyFrontierCheckpoint>;
export type AnyLevelData =
  | OttoMaticLevelData
  | BugdomLevelData
  | Bugdom2LevelData
  | Nanosaur2LevelData
  | CroMagLevelData
  | BillyFrontierLevelData;
export function hasIsEmptyField(
  grid: OttoMaticSupertileGrid | Bugdom2SupertileGrid,
): grid is OttoMaticSupertileGrid {
  return "isEmpty" in grid;
}
export function isSupertileEmpty(
  grid: OttoMaticSupertileGrid | Bugdom2SupertileGrid,
): boolean {
  if (hasIsEmptyField(grid)) {
    return grid.isEmpty;
  }
  return grid.superTileId === -1;
}
export function hasFullHeader(
  header: OttoMaticHeader | Bugdom2Header,
): header is OttoMaticHeader {
  return "numTilePages" in header && "numTiles" in header;
}
