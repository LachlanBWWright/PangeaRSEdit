import { ItemParams } from "../items/itemParams";

export enum SplineItemType {
  Yeti = 18, // 18: Yeti
  Camel = 23, // 23: Camel
  Beetle = 35, // 35: Beetle
  Shark = 53, // 53: Shark
  Troll = 54, // 54: Troll
  Pteradactyl = 58, // 58: Pteradactyl
  Mummy = 61, // 61: Mummy
  PolarBear = 64, // 64: Polar Bear
  Viking = 66, // 66: Viking
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.Yeti]: "Yeti",
  [SplineItemType.Camel]: "Camel",
  [SplineItemType.Beetle]: "Beetle",
  [SplineItemType.Shark]: "Shark",
  [SplineItemType.Troll]: "Troll",
  [SplineItemType.Pteradactyl]: "Pteradactyl",
  [SplineItemType.Mummy]: "Mummy",
  [SplineItemType.PolarBear]: "Polar Bear",
  [SplineItemType.Viking]: "Viking",
};

// Parameter descriptions for each spline item type
export const croMagSplineItemTypeParams: Record<SplineItemType, ItemParams> = {
  [SplineItemType.Yeti]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Camel]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Beetle]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Shark]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Troll]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Pteradactyl]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Mummy]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PolarBear]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Viking]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
};

export type CroMagSplineItemParams = ItemParams;
