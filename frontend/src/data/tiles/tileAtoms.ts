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

export const CurrentTopologyBrushMode = atom<TopologyBrushMode>(
  TopologyBrushMode.CIRCLE_BRUSH,
);
export const CurrentTopologyValueMode = atom<TopologyValueMode>(
  TopologyValueMode.SET_VALUE,
);

export const TopologyBrushRadius = atom<number>(1);

export const TopologyValue = atom<number>(0);

export const TopologyOpacity = atom<number>(1);
