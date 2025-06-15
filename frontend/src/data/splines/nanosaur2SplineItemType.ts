import { ItemParams } from "../items/itemParams";

export enum SplineItemType {
  Enemy_Raptor = 15, // 15:  raptor enemy
  DustDevil = 16, // 16:
  Enemy_Brach = 26, // 26:  brach
  LaserOrb = 32, // 32: laser orb
  Enemy_Ramphor = 48, // 48
  TimeDemoSpline = 49, // 49
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.Enemy_Raptor]: "Raptor Enemy",
  [SplineItemType.DustDevil]: "Dust Devil",
  [SplineItemType.Enemy_Brach]: "Brach Enemy",
  [SplineItemType.LaserOrb]: "Laser Orb",
  [SplineItemType.Enemy_Ramphor]: "Ramphor Enemy",
  [SplineItemType.TimeDemoSpline]: "Time Demo Spline",
};

// Default parameter description for spline items that haven't been researched yet
const defaultParams: ItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

// Parameter descriptions for each spline item type
export const nanosaur2SplineItemTypeParams: Record<SplineItemType, ItemParams> =
  {
    [SplineItemType.Enemy_Raptor]: defaultParams,
    [SplineItemType.DustDevil]: defaultParams,
    [SplineItemType.Enemy_Brach]: defaultParams,
    [SplineItemType.LaserOrb]: defaultParams,
    [SplineItemType.Enemy_Ramphor]: defaultParams,
    [SplineItemType.TimeDemoSpline]: defaultParams,
  };
