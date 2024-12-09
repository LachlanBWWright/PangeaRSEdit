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
