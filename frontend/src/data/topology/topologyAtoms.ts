import { atom } from "jotai";

export enum TopologyBrushMode {
  CIRCLE_BRUSH,
  SQUARE_BRUSH,
}

export enum TopologyValueMode {
  SET_VALUE, //Sets new Ycrd to fixed values
  DELTA_VALUE, //Moves Ycrd by delta
}

export const CurrentTopologyBrushMode = atom<TopologyBrushMode>(
  TopologyBrushMode.CIRCLE_BRUSH,
);
export const CurrentTopologyValueMode = atom<TopologyValueMode>(
  TopologyValueMode.SET_VALUE,
);

export const TopologyBrushRadius = atom<number>(1);

export const TopologyValue = atom<number>(0);
