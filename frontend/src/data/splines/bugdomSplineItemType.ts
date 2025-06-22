import { ItemParams } from "../items/itemParams";

export enum SplineItemType {
  Enemy_BoxerFly, // 3: ENEMY: BOXERFLY
  Enemy_Slug, // 8: Slug enemy
  Enemy_Ant, // 9: Fireant enemy
  HoneycombPlatform, // 26: Honeycomb platform
  Enemy_Mosquito, // 31: Mosquito Enemy
  Foot, // 35: Foot
  Enemy_Spider, // 36: ENEMY: SPIDER
  Enemy_Caterpiller, // 37: ENEMY: CATERPILLER
  Enemy_Larva, // 46: ENEMY: LARVA
  Enemy_WorkerBee, // 48: ENEMY: WORKER BEE
  Enemy_Roach, // 53: ENEMY: ROACH
  Enemy_Skippy, // 54: ENEMY: SKIPPY
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.Enemy_BoxerFly]: "ENEMY: BOXERFLY",
  [SplineItemType.Enemy_Slug]: "Slug enemy",
  [SplineItemType.Enemy_Ant]: "Fireant enemy",
  [SplineItemType.HoneycombPlatform]: "Honeycomb platform",
  [SplineItemType.Enemy_Mosquito]: "Mosquito Enemy",
  [SplineItemType.Foot]: "Foot",
  [SplineItemType.Enemy_Spider]: "ENEMY: SPIDER",
  [SplineItemType.Enemy_Caterpiller]: "ENEMY: CATERPILLER",
  [SplineItemType.Enemy_Larva]: "ENEMY: LARVA",
  [SplineItemType.Enemy_WorkerBee]: "ENEMY: WORKER BEE",
  [SplineItemType.Enemy_Roach]: "ENEMY: ROACH",
  [SplineItemType.Enemy_Skippy]: "ENEMY: SKIPPY",
};

// Parameter descriptions for each spline item type
export const bugdomSplineItemTypeParams: Record<SplineItemType, ItemParams> = {
  [SplineItemType.Enemy_BoxerFly]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Enemy_Slug]: {
    flags: "Spline item flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Enemy_Ant]: {
    flags: "Ant behavior flags",
    p0: {
      type: "Integer",
      description: "Ant type: 0=Normal ant, 1=Rock throwing ant",
      codeSample: {
        code: "rockThrower = itemPtr->parm[0] == 1;    // see if rock thrower\n// ...\nnewObj->RockThrower = rockThrower;",
        fileName: "Enemy_Ant.c",
        lineNumber: 149,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Aggressive behavior flag",
          codeSample: {
            code: "newObj->Aggressive = itemPtr->parm[3] & 1;    // see if aggressive",
            fileName: "Enemy_Ant.c",
            lineNumber: 155,
          },
        },
      ],
    },
  },

  [SplineItemType.HoneycombPlatform]: {
    flags: "Platform behavior flags",
    p0: "Unused",
    p1: {
      type: "Integer",
      description:
        "Platform height level (0=default height of 11, otherwise use value)",
      codeSample: {
        code: "if (itemPtr->parm[1] == 0)\n    h = 11;\nelse\n    h = itemPtr->parm[1];\n// ...\ngNewObjectDefinition.coord.y = (h * -50.0f);",
        fileName: "Items2.c",
        lineNumber: 872,
      },
    },
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 1,
          description: "Small platform size flag",
          codeSample: {
            code: "Boolean isSmall = itemPtr->parm[3] & (1<<1);\n// ...\nif (isSmall)\n    gNewObjectDefinition.scale = HONEYCOMB_PLATFORM_SCALE2;",
            fileName: "Items2.c",
            lineNumber: 867,
          },
        },
        {
          index: 2,
          description: "Zigzag movement flag",
          codeSample: {
            code: "Boolean zigzag = itemPtr->parm[3] & (1<<2);\n// ...\nnewObj->ZigZag = zigzag;",
            fileName: "Items2.c",
            lineNumber: 868,
          },
        },
      ],
    },
  },

  [SplineItemType.Enemy_Mosquito]: {
    flags: "Mosquito behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Foot]: {
    flags: "Foot behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Enemy_Spider]: {
    flags: "Spider behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Enemy_Caterpiller]: {
    flags: "Caterpillar behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Enemy_Larva]: {
    flags: "Larva behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Enemy_WorkerBee]: {
    flags: "Worker bee behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Enemy_Roach]: {
    flags: "Roach behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.Enemy_Skippy]: {
    flags: "Skippy behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
};

export type BugdomSplineItemParams = ItemParams;
