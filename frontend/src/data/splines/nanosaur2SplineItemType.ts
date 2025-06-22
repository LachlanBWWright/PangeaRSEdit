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

// Parameter descriptions for each spline item type
export const nanosaur2SplineItemTypeParams: Record<SplineItemType, ItemParams> =
  {
    [SplineItemType.Enemy_Raptor]: {
      flags: "Raptor enemy behavior flags",
      p0: "Unknown",
      p1: "Unknown",
      p2: "Unknown",
      p3: "Unused",
    },

    [SplineItemType.DustDevil]: {
      flags: "Dust devil behavior flags",
      p0: "Unused",
      p1: "Unused",
      p2: "Unused",
      p3: "Unused",
    },

    [SplineItemType.Enemy_Brach]: {
      flags: "Brach enemy behavior flags",
      p0: {
        type: "Integer",
        description: "Initial rotation (0-7, each step = 45 degrees)",
        codeSample: {
          code: "newObj->Rot.y = ((float)itemPtr->parm[0]) * (PI2/8.0f);",
          fileName: "Enemy_Brach.c",
          lineNumber: 99,
        },
      },
      p1: "Unknown",
      p2: "Unknown",
      p3: "Unused",
    },

    [SplineItemType.LaserOrb]: {
      flags: "Laser orb behavior flags",
      p0: "Unused",
      p1: "Unused",
      p2: "Unused",
      p3: "Unused",
    },

    [SplineItemType.Enemy_Ramphor]: {
      flags: "Ramphor enemy behavior flags",
      p0: {
        type: "Integer",
        description: "Flying height level",
        codeSample: {
          code: "long height = itemPtr->parm[0];\n// ...\nnewObj = MakeRamphor(x,z, RAMPHOR_ANIM_FLAP, height);",
          fileName: "Enemy_Ramphor.c",
          lineNumber: 85,
        },
      },
      p1: {
        type: "Integer",
        description: "Speed modifier (base speed 180 + parm[1] * 30)",
        codeSample: {
          code: "long speed = itemPtr->parm[1];\n// ...\nnewObj->SplineSpeed = 180 + speed * 30;",
          fileName: "Enemy_Ramphor.c",
          lineNumber: 86,
        },
      },
      p2: "Unknown",
      p3: "Unknown",
    },

    [SplineItemType.TimeDemoSpline]: {
      flags: "Time demo spline flags",
      p0: "Unused",
      p1: "Unused",
      p2: "Unused",
      p3: "Unused",
    },
  };

export type Nanosaur2SplineItemParams = ItemParams;
