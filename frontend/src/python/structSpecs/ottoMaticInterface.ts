import { FenceType } from "../../data/fences/ottoFenceType";
import { ItemType } from "../../data/items/ottoItemType";

export type ottoMaticLevel = {
  Atrb: {};
  Fenc: {
    //List of contiguous fences
    1000: {
      name: "Fence List";
      obj: ottoFence[];
      order: number;
    };
  };
  FnNb: Record<
    number,
    {
      name: "Fence Nub List";
      order: number;
      obj: ottoFenceNubs[];
    }
  >;
  Hedr: {
    1000: {
      name: "Header";
      obj: ottoHeader;
      order: 0;
    };
  };
  ItCo: {
    1000: {
      /* Not used in the game */
      name: "Terrain Items Color Array";
      order: number;
      data: any;
    };
  };
  Itms: {
    1000: {
      name: "Terrain Items List";
      obj: ottoItem[];
      order: number;
    };
  };
  Layr: {};
  Liqd: {};
  STgd: {};
  SpIt: {};
  SpNb: {};
  SpPt: {};
  Spln: {};
  Ycrd: {};
  alis: {};
  _metadata: {};
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

export type ottoTileAttribute = {};

export type ottoFenceNubList = ottoFenceNubs[];

export type ottoFenceNubs = [x: number, y: number];

export type ottoHeader = {
  mapHeight: number;
  mapWidth: number;
  maxY: number;
  minY: number;
  numCheckpoints: number;
  numFences: number;
  numItems: number;
  numSplines: number;
  numTilePages: number;
  numTiles: number;
  numUniqueSupertiles: number;
  numWaterPatches: number;
  padding: string;
  tileSize: number;
  version: number;
};

export type ottoItcr = {};

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

export type ottoLayr = {};

export type ottoLiquid = {};

export type ottoSupertileGridMatrix = {};

export type ottoSplineItemType = {};

export type ottoSplineNubs = {};

export type ottoSpinePoints = {};

export type ottoSplineList = {};

export type ottoYCoordinnate = number;

export type ottoAlis = {};
