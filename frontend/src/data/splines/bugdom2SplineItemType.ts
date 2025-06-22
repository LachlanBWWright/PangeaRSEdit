import { ItemParams } from "../items/itemParams";

export enum SplineItemType {
  PrimeEnemy_Gnome = 4, // 4: gnome
  PrimeEnemy_HouseFly = 10, // 10: housefly
  PrimeBumbleBee = 25, // 25: bumble bee
  PrimeEnemy_Flea = 38, // 38: flea
  PrimeEnemy_Tick = 39, // 39: tick
  PrimeSlotCar = 40, // 40: slot car
  PrimeEnemy_ToySoldier = 43, // 43: toy solider
  PrimeEnemy_Otto = 45, // 45: otto enemy
  PrimeEnemy_Dragonfly = 52, // 52: dragonfly
  PrimeVacuume = 58, // 58: vacuume
  PrimeMothPath = 60, // 60: moth enemy
  PrimeEnemy_ComputerBug = 61, // 61: computer bug enemy
  PrimeHanger = 63, // 63: hanger
  PrimeEnemy_Roach = 65, // 65: roach enemy
  PrimeEnemy_Ant = 68, // 68: ant enemy
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.PrimeEnemy_Gnome]: "Gnome",
  [SplineItemType.PrimeEnemy_HouseFly]: "House Fly",
  [SplineItemType.PrimeBumbleBee]: "Bumble Bee",
  [SplineItemType.PrimeEnemy_Flea]: "Flea",
  [SplineItemType.PrimeEnemy_Tick]: "Tick",
  [SplineItemType.PrimeSlotCar]: "Slot Car",
  [SplineItemType.PrimeEnemy_ToySoldier]: "Toy Soldier",
  [SplineItemType.PrimeEnemy_Otto]: "Otto",
  [SplineItemType.PrimeEnemy_Dragonfly]: "Dragonfly",
  [SplineItemType.PrimeVacuume]: "Vacuum",
  [SplineItemType.PrimeMothPath]: "Moth",
  [SplineItemType.PrimeEnemy_ComputerBug]: "Computer Bug",
  [SplineItemType.PrimeHanger]: "Hanger",
  [SplineItemType.PrimeEnemy_Roach]: "Roach",
  [SplineItemType.PrimeEnemy_Ant]: "Ant",
};

// Parameter descriptions for each spline item type
export const bugdom2SplineItemTypeParams: Record<SplineItemType, ItemParams> = {
  [SplineItemType.PrimeEnemy_Gnome]: {
    flags: "Gnome behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeEnemy_HouseFly]: {
    flags: "House Fly behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeBumbleBee]: {
    flags: "Bumble Bee behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeEnemy_Flea]: {
    flags: "Flea behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeEnemy_Tick]: {
    flags: "Tick behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeSlotCar]: {
    flags: "Slot car behavior flags",
    p0: {
      type: "Integer",
      description: "Car number: 0 or 1 (determines which slot car to use)",
      codeSample: {
        code: "carNum = itemPtr->parm[0];\n// ...\nGAME_ASSERT(carNum == 0 || carNum == 1);",
        fileName: "SlotCar.c",
        lineNumber: 91,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeEnemy_ToySoldier]: {
    flags: "Toy Soldier behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeEnemy_Otto]: {
    flags: "Otto enemy behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeEnemy_Dragonfly]: {
    flags: "Dragonfly behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeVacuume]: {
    flags: "Vacuum behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeMothPath]: {
    flags: "Moth path behavior flags",
    p0: {
      type: "Integer",
      description: "Path number for moth navigation system",
      codeSample: {
        code: 'int pathNum = itemPtr->parm[0];\n// ...\nif (pathNum >= MAX_MOTH_PATHS)\n    DoFatalAlert("PrimeMothPath: pathNum > MAX_MOTH_PATHS");\n// ...\ngMothPaths[pathNum] = splineNum;',
        fileName: "Enemy_Moth.c",
        lineNumber: 589,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeEnemy_ComputerBug]: {
    flags: "Computer Bug behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeHanger]: {
    flags: "Hanger behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeEnemy_Roach]: {
    flags: "Roach behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.PrimeEnemy_Ant]: {
    flags: "Ant behavior flags",
    p0: {
      type: "Integer",
      description: "Food type carried by ant",
      codeSample: {
        code: "int foodType = itemPtr->parm[0];\n// ...\nnewObj = MakeAnt(x,z, ANT_ANIM_WALKFOOD, foodType);",
        fileName: "Enemy_Ant.c",
        lineNumber: 548,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
};

export type Bugdom2SplineItemParams = ItemParams;
