import { FenceType } from "../../data/fences/FenceType";
import { ItemType } from "../../data/items/TerrainItemType";
import { SplineItemType } from "../../data/splines/SplineItemType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";

export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface pangeaLevel {
  Atrb: {
    1000: {
      name: "Tile Attribute Data";
      obj: TileAttribute[];
      order: number;
    };
  };
  Fenc: {
    //List of contiguous fences
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
  Timg: {
    1000: {
      name: "Extracted Tile Image Data 32x32/16bit";
      data: string;
      order: number;
    };
  };
  Hedr: {
    1000: {
      name: "Header";
      obj: StandardHeader;
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
      obj: TerrainItem[];
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
      obj: Liquid[];
      order: number;
    };
  };

  STgd: {
    1000: {
      name: "SuperTile Grid";
      obj: SupertileGridEntry[];
      order: number;
    };
  };
  SpIt: Record<
    number,
    {
      name?: "Spline Item List";
      obj: SplineItem[];
      order?: number;
    }
  >;
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
  Spln: {
    1000: {
      name: "Spline List";
      obj: Spline[];
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
}

export type TileAttribute = {
  flags: number;
  p0: number;
  p1: number;
};

export type Fence = {
  fenceType: FenceType;
  numNubs: number;
  junkNubListPtr: number;
  bbTop: number;
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
};

export type FenceNub = [x: number, y: number];

export type StandardHeader = {
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

export type TerrainItem = {
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

export const LIQUID_NUBS_COUNT = 100;
export type Liquid = {
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

export type SupertileGridEntry = {
  padByte: string; //TODO: Should be removed
  isEmpty: boolean;
  superTileId: number;
};

export type SplineItem = {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  placement: number;
  type: SplineItemType;
};

export type SplineNub = {
  x: number;
  z: number;
};

export type SplinePoint = {
  //These are actually floats
  x: number;
  z: number;
};

export type Spline = {
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
  bbTop: number;
  numItems: number;
  numNubs: number;
  numPoints: number;
};
