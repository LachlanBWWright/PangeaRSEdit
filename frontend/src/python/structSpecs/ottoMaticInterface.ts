import { FenceType } from "../../data/fences/ottoFenceType";
import { ItemType } from "../../data/items/ottoItemType";
import { SplineItemType } from "../../data/splines/ottoSplineItemType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";
import type {
  HeaderData,
  FenceData,
  SplineData,
  LiquidData,
  ItemData,
  TerrainData,
} from "./ottoMaticLevelData";

export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface ottoMaticLevel
  extends HeaderData,
    Partial<FenceData>,
    Partial<SplineData>,
    Partial<LiquidData>,
    Partial<ItemData>,
    TerrainData {}

export type ottoTileAttribute = {
  flags: number;
  p0: number;
  p1: number;
};

export type ottoFence = {
  fenceType: FenceType;
  numNubs: number;
  junkNubListPtr: number;
  bbTop: number;
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
};

export type ottoFenceNub = [x: number, y: number];

export type ottoHeader = {
  version: number;
  numItems: number;

  mapWidth: number;
  mapHeight: number;
  numTilePages: number; //Not used by Otto source code
  numTiles: number; //Not used by Otto source code
  tileSize: number; //Used for scaling the Ycrds
  minY: number;
  maxY: number;

  numSplines: number;
  numFences: number;
  numUniqueSupertiles: number;
  numWaterPatches: number;
  numCheckpoints: number;
};

export type ottoItem = {
  /* u32 bit  */
  x: number;
  z: number;
  /* u16 bit */
  type: ItemType;
  flags: number;
  /* u8 bit */
  p0: number;
  p1: number;
  p2: number;
  p3: number;
};

export const OTTO_LIQD_NUBS = 100;
export type ottoLiquid = {
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

  nubs: [
    number,
    number,
  ][] /* 100 nubs, requires packing-unpacking from rsrcdump json */;
};

export type ottoSupertileGrid = {
  padByte: string; //TODO: Should be removed
  isEmpty: boolean;
  superTileId: number;
};

export type ottoSplineItem = {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  placement: number;
  type: SplineItemType;
};

export type ottoSplineNub = {
  x: number;
  z: number;
};

export type ottoSplinePoint = {
  //These are actually floats
  x: number;
  z: number;
};

export type ottoSpline = {
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
  bbTop: number;
  numItems: number;
  numNubs: number;
  numPoints: number;
};
