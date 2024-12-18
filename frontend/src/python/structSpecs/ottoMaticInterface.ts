import { FenceType } from "../../data/fences/ottoFenceType";
import { ItemType } from "../../data/items/ottoItemType";
import { SplineItemType } from "../../data/splines/ottoSplineItemType";
import { WaterBodyType } from "../../data/water/ottoWaterItemType";

export const OTTO_SUPERTILE_TEXMAP_SIZE = 128; //128x128 pixels
//SUPERTILE_SIZE from Otto source code
export const OTTO_SUPERTILE_SIZE = 8; //e.g. 1 supertile is 8x8 tiles
//OREMAP_FILE_SIZE from Otto source code (1 tile is 16 units wide)
export const OTTO_TILE_SIZE = 16;

export type ottoMaticLevel = {
  Atrb: {
    1000: {
      name: "Tile Attribute Data";
      obj: ottoTileAttribute[];
      order: number;
    };
  };
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
      obj: ottoFenceNub[];
      order: number;
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
      /* Not used in the game, internal OreoTerrain item */
      name: "Terrain Items Color Array";
      data: string;
      order: number;
    };
  };
  Itms: {
    1000: {
      name: "Terrain Items List";
      obj: ottoItem[];
      order: number;
    };
  };
  Layr: {
    1000: {
      name: "Terrain Layer Matrix";
      obj: number[]; //Ints
      order: number;
    };
  };
  Liqd: {
    1000: {
      name: "Water List";
      obj: ottoLiquid[];
      order: number;
    };
  };
  STgd: {
    1000: {
      name: "SuperTile Grid";
      obj: ottoSupertileGrid[];
      order: number;
    };
  };
  SpIt: Record<
    number,
    {
      name?: "Spline Item List";
      obj: ottoSplineItem[];
      order?: number;
    }
  >;
  SpNb: Record<
    number,
    {
      name?: "Spline Nub List";
      obj: ottoSplineNub[];
      order?: number;
    }
  >;
  SpPt: Record<
    number,
    {
      name?: "Spline Point List";
      obj: ottoSplinePoint[];
      order?: number;
    }
  >;
  Spln: {
    1000: {
      name: "Spline List";
      obj: ottoSpline[];
      order: number;
    };
  };
  YCrd: {
    1000: {
      name: "Floor&Ceiling Y Coords";
      obj: number[]; //Floats
      order: number;
    };
  };
  alis: Record<
    /* Appeas in skeleton unpacking code, doesn't seem to be used for .ter files */
    number,
    {
      name: "Texture Page Picture Alias";
      data: string;
      order: number;
    }
  >;
  _metadata: {
    file_attributes: number;
    junk1: number;
    junk2: number;
  };
};
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
