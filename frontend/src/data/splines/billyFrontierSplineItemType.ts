import { ItemParams } from "../items/itemParams";

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

// Parameter descriptions for each spline item type
export const billyFrontierSplineItemTypeParams: Record<
  SplineItemType,
  ItemParams
> = {
  [SplineItemType.PrimeStampedeKangaCow]: {
    flags: "Stampede Kanga Cow behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeStampedeCamera]: {
    flags: "Stampede camera behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeWalker]: {
    flags: "Walker enemy behavior flags",
    p0: "Unused",
    p1: {
      type: "Integer",
      description: "Stop point number for walker to patrol to",
      codeSample: {
        code: "newObj->StopPoint = itemPtr->parm[1];    // remember stop point #",
        fileName: "Enemy_Walker.c",
        lineNumber: 111,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeTumbleweed]: {
    flags: "Tumbleweed behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeTremorAlien]: {
    flags: "Tremor Alien behavior flags",
    p0: {
      type: "Integer",
      description: "Stop point number for enemy spawning/grouping",
      codeSample: {
        code: "short stopPoint = itemPtr->parm[0];\n// ...\ngNumEnemiesThisStopPoint[stopPoint]++;    // inc sp count",
        fileName: "Enemy_TremorAlien.c",
        lineNumber: 427,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeStampedeKangaRex]: {
    flags: "Stampede Kanga Rex behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
};

export type BillyFrontierSplineItemParams = ItemParams;
