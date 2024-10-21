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
  Hedr: {};
  ItCo: {};
  Itms: {};
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
  fenceType: number;
  numNumbs: number;
  junkNubListPtr: number;
  bbTop: number;
  bbBottom: number;
  bbLeft: number;
  bbRight: number;
};

export type ottoTileAttribute = {};

export type ottoFenceNubList = ottoFenceNubs[];
export type ottoFenceNubs = [x: number, y: number];

export type ottoHeader = {};

export type ottoItcr = {};

export type ottoItems = {};

export type ottoLayr = {};

export type ottoLiquid = {};

export type ottoSupertileGridMatrix = {};

export type ottoSplineItemType = {};

export type ottoSplineNubs = {};

export type ottoSpinePoints = {};

export type ottoSplineList = {};

export type ottoYCoordinnate = number;

export type ottoAlis = {};
