import { atom } from "jotai";

export enum TileViews {
  Topology,
  Flags,
  ElectricFloor0,
  ElectricFloor1,
}

export const TileViewMode = atom<TileViews>(TileViews.Topology);

export enum TopologyBrushMode {
  CIRCLE_BRUSH,
  SQUARE_BRUSH,
}

export enum TopologyValueMode {
  SET_VALUE, //Sets new Ycrd to fixed values
  DELTA_VALUE, //Moves Ycrd by delta
  DELTA_WITH_DROPOFF,
}

export enum TopologyLayerEditMode {
  FLOOR = "floor",
  ROOF = "roof",
  BOTH = "both",
}

export enum TopologyDualEditMode {
  MIDPOINT = "midpoint",
  DIFFERENCE = "difference",
}

export enum TopologyHeightmapDisplayMode {
  AUTO = "auto",
  FLOOR = "floor",
  ROOF = "roof",
}

export const CurrentTopologyBrushMode = atom<TopologyBrushMode>(
  TopologyBrushMode.CIRCLE_BRUSH,
);
export const CurrentTopologyValueMode = atom<TopologyValueMode>(
  TopologyValueMode.SET_VALUE,
);

export const TopologyBrushRadius = atom<number>(1);

export const TopologyValue = atom<number>(0);

export const TopologyOpacity = atom<number>(1);

export const ShowRoofInTopology = atom<boolean>(false);
export const ShowAccessibilityOverlay = atom<boolean>(false);
export const CurrentTopologyLayerEditMode = atom<TopologyLayerEditMode>(
  TopologyLayerEditMode.FLOOR,
);
export const CurrentTopologyDualEditMode = atom<TopologyDualEditMode>(
  TopologyDualEditMode.MIDPOINT,
);
export const CurrentTopologyHeightmapDisplayMode =
  atom<TopologyHeightmapDisplayMode>(TopologyHeightmapDisplayMode.AUTO);

// Tile editing atoms
export const TileEditingEnabled = atom<boolean>(false);
export const TileBrushType = atom<"add" | "remove">("add");

// Constants for the tile attributes flags
export const TILE_ATTRIB_BLANK = 1;
export const TILE_ATTRIB_ELECTROCUTE_AREA0 = 1 << 1;
export const TILE_ATTRIB_ELECTROCUTE_AREA1 = 1 << 2;
