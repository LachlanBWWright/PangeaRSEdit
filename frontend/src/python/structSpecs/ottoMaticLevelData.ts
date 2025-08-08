import { FenceType } from "../../data/fences/ottoFenceType";
import { ItemType } from "../../data/items/ottoItemType";
import { SplineItemType } from "../../data/splines/ottoSplineItemType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";

// Header data interface
export interface HeaderData {
  Hedr: {
    1000: {
      name: "Header";
      obj: ottoHeader;
      order: 0;
    };
  };
}

// Fence data interfaces
export interface FenceData {
  Fenc: {
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
}

// Spline data interfaces
export interface SplineData {
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
  SpIt: Record<
    number,
    {
      name?: "Spline Item List";
      obj: ottoSplineItem[];
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
}

// Liquid/Water data interface
export interface LiquidData {
  Liqd: {
    1000: {
      name: "Water List";
      obj: ottoLiquid[];
      order: number;
    };
  };
}

// Item data interface (excluding spline items which are in SplineData)
export interface ItemData {
  Itms: {
    1000: {
      name: "Terrain Items List";
      obj: ottoItem[];
      order: number;
    };
  };
}

// Type definitions for individual data types (imported from the main interface)
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
};

export type ottoItem = {
  x: number;
  z: number;
  type: ItemType;
  flags: number;
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

  nubs: [number, number][];
};

export type ottoSupertileGrid = {
  padByte: string;
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

// Terrain and tile data interface - the "other data" that doesn't fit into main atomic types
export interface TerrainData {
  Atrb: {
    1000: {
      name: "Tile Attribute Data";
      obj: ottoTileAttribute[];
      order: number;
    };
  };
  Timg: {
    1000: {
      name: "Extracted Tile Image Data 32x32/16bit";
      data: string;
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
  Layr: {
    1000: {
      name: "Terrain Layer Matrix";
      obj: number[];
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
  YCrd: {
    1000: {
      name: "Floor&Ceiling Y Coords";
      obj: number[];
      order: number;
    };
  };
  alis: Record<
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