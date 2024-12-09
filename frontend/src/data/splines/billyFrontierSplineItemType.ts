export enum SplineItemType {
  PrimeStampedeKangaCow = 20, // 20:
  PrimeStampedeCamera = 22, // 22:	stampede camera
  PrimeWalker = 23, // 23: walker
  PrimeTumbleweed = 27, // 27: tumbleweed
  PrimeTremorAlien = 31, // 31:	tremor alien
  PrimeStampedeKangaRex = 34, // 34: kanga rex
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.PrimeStampedeKangaCow]: "Stampede Kanga Cow",
  [SplineItemType.PrimeStampedeCamera]: "Stampede Camera",
  [SplineItemType.PrimeWalker]: "Walker",
  [SplineItemType.PrimeTumbleweed]: "Tumbleweed",
  [SplineItemType.PrimeTremorAlien]: "Tremor Alien",
  [SplineItemType.PrimeStampedeKangaRex]: "Stampede Kanga Rex",
};
