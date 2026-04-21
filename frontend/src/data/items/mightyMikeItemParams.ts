import { ItemParams, ItemParamsSource, defineItemParams } from "./itemParams";

const unknown: ItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

const mightyMikeItemParamsSource: Partial<Record<number, ItemParamsSource>> = {
  // Item 15: Health Powerup
  15: {
    flags: "Unknown",
    p0: {
      type: "Integer",
        description: "Initial animation frame (passed to MakeNewShape as frameNum)",
        codeSample: {
          code: "newObj = MakeNewShape(group, type, itemPtr->parm[0], ...);",
          fileName: "src/Misc/Bonus.c",
          lineNumber: 388,
        },
      },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  // Item 19: Key
  19: {
    flags: "Unknown",
    p0: {
      type: "Integer",
        description: "Key frame (initial animation frame passed to MakeNewShape)",
        codeSample: {
          code: "newObj = MakeNewShape(group, type, itemPtr->parm[0], ...);",
          fileName: "src/Misc/Bonus.c",
          lineNumber: 453,
        },
      },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  // Item 33: Weapon Powerup
  33: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Weapon type (0=SuctionCup, 1=Cake, 2=Oozie, 3=RBand, 4=Toothpaste, 5=Tracer, 6=PixieDust, 7=Rock, 8=FireHose, 9=ElephantGun, 10=Pie, 11=DoubleShot, 12=TripleShot, 13=Flamethrower, 14=RocketGun)",
      codeSample: {
        code: "newObj = MakeNewShape(GroupNum_WeaponPOWs, ObjType_WeaponPOWs, itemPtr->parm[0], ...);\nnewObj->Kind = itemPtr->parm[0];",
        fileName: "src/MeAndMo/Weapon.c",
        lineNumber: 174,
      },
    },
    p1: {
      type: "Integer",
      description: "Temporary flag (1=disappears after GAME_FPS*6 seconds, 0=permanent)",
      codeSample: {
        code: "if (itemPtr->parm[1]) newObj->Special1 = GAME_FPS*6; else newObj->Special1 = 0xf0000L;",
        fileName: "src/MeAndMo/Weapon.c",
        lineNumber: 176,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },

  // Item 34: Misc Powerup
  34: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Misc powerup type (0=Nuke, 1=Freeze, 2=Shield, 3=RingShot, 4=Speed, 5=FreeDude)",
      codeSample: {
        code: "newObj = MakeNewShape(GroupNum_MiscPOWs, ObjType_MiscPOWs, itemPtr->parm[0], ...);\nnewObj->Kind = itemPtr->parm[0];",
        fileName: "src/Misc/Bonus.c",
        lineNumber: 555,
      },
    },
    p1: {
      type: "Integer",
      description: "Temporary flag (1=disappears after GAME_FPS*6 seconds, 0=permanent)",
      codeSample: {
        code: "if (itemPtr->parm[1]) newObj->Special1 = GAME_FPS*6; else newObj->Special1 = 0xf0000L;",
        fileName: "src/Misc/Bonus.c",
        lineNumber: 557,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },

  // Item 55: Key Color
  55: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
};

export const mightyMikeItemParams: Partial<Record<number, ItemParams>> =
  defineItemParams("mightymike", mightyMikeItemParamsSource);

/** Get param descriptions for a Mighty Mike item type, falling back to unknown. */
export function getMightyMikeItemParams(itemType: number): ItemParams {
  return mightyMikeItemParams[itemType] ?? unknown;
}
