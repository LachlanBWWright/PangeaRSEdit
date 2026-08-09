import { ItemParams, ItemParamsSource, defineItemParams } from "./itemParams";

const unknown: ItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

const mightyMikeItemParamsSource: Partial<Record<number, ItemParamsSource>> = {
  0: {
    flags: "Unknown",
    p0: {
      type: "TypeSelector",
      description: "Caveman behavior (0=walker, 1=rock thrower, 2=clubber)",
      options: { 0: "Walker", 1: "Rock thrower", 2: "Clubber" },
      codeSample: {
        code: "switch(itemPtr->parm[0])",
        fileName: "src/Enemies/Jurassic/Enemy_CaveMan.c",
        lineNumber: 71,
      },
    },
    p1: {
      type: "Integer",
      description: "Initial aim direction for clubber cavemen",
      codeSample: {
        code: "newObj->AimFlag = itemPtr->parm[1];",
        fileName: "src/Enemies/Jurassic/Enemy_CaveMan.c",
        lineNumber: 125,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  4: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Initial triceratops animation and aim direction",
      codeSample: {
        code: "animNum = itemPtr->parm[0];",
        fileName: "src/Enemies/Jurassic/Enemy_Triceratops.c",
        lineNumber: 52,
      },
    },
    p1: {
      type: "Integer",
      description: "Movement distance in tiles",
      codeSample: {
        code: "newObj->TriceratopsDist = itemPtr->parm[1]*TILE_SIZE;",
        fileName: "src/Enemies/Jurassic/Enemy_Triceratops.c",
        lineNumber: 77,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  13: {
    flags: "Unknown",
    p0: {
      type: "TypeSelector",
      description: "Clown behavior",
      options: { 0: "Walker", 1: "Pie thrower" },
      codeSample: {
        code: "switch(itemPtr->parm[0])",
        fileName: "src/Enemies/Clown/Enemy_Clown.c",
        lineNumber: 67,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  // Item 15: Health Powerup
  15: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Initial animation frame (passed to MakeNewShape as frameNum)",
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

  17: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Destination marker flag; destination markers are not rendered",
      codeSample: {
        code: "if (itemPtr->parm[0] == 1)",
        fileName: "src/Misc/Triggers.c",
        lineNumber: 133,
      },
    },
    p1: {
      type: "Integer",
      description: "Matching teleporter identifier",
      codeSample: {
        code: "newObj->TeleportNum = itemPtr->parm[1];",
        fileName: "src/Misc/Triggers.c",
        lineNumber: 164,
      },
    },
    p2: {
      type: "Integer",
      description: "Custom horizontal trigger half-size",
      codeSample: {
        code: "newObj->LeftOff = -itemPtr->parm[2];",
        fileName: "src/Misc/Triggers.c",
        lineNumber: 152,
      },
    },
    p3: {
      type: "Integer",
      description: "Custom vertical trigger half-size",
      codeSample: {
        code: "newObj->TopOff = -itemPtr->parm[3];",
        fileName: "src/Misc/Triggers.c",
        lineNumber: 150,
      },
    },
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

  20: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Key required to open the clown door",
      codeSample: {
        code: "newObj->KeyNeeded = itemPtr->parm[0];",
        fileName: "src/Misc/Triggers.c",
        lineNumber: 246,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  21: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Moving-platform speed in 16.16 fixed-point units",
      codeSample: {
        code: "newObj->CandyMPlatSpeed = (long)itemPtr->parm[0]<<16;",
        fileName: "src/Misc/Traps.c",
        lineNumber: 361,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  22: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Key required to open the candy door",
      codeSample: {
        code: "newObj->KeyNeeded = itemPtr->parm[0];",
        fileName: "src/Misc/Triggers.c",
        lineNumber: 286,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  31: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Key required to open the Jurassic door",
      codeSample: {
        code: "newObj->KeyNeeded = itemPtr->parm[0];",
        fileName: "src/Misc/Triggers.c",
        lineNumber: 326,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  32: {
    flags: "Unknown",
    p0: {
      type: "TypeSelector",
      description: "Caramel enemy behavior",
      options: { 0: "Walking", 1: "Stationary" },
      codeSample: {
        code: "if (itemPtr->parm[0] == 0)",
        fileName: "src/Enemies/Candy/Enemy_Carmel.c",
        lineNumber: 68,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
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
      description:
        "Temporary flag (1=disappears after GAME_FPS*6 seconds, 0=permanent)",
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
      description:
        "Temporary flag (1=disappears after GAME_FPS*6 seconds, 0=permanent)",
      codeSample: {
        code: "if (itemPtr->parm[1]) newObj->Special1 = GAME_FPS*6; else newObj->Special1 = 0xf0000L;",
        fileName: "src/Misc/Bonus.c",
        lineNumber: 557,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },

  44: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Key required to open the fairy door",
      codeSample: {
        code: "newObj->KeyNeeded = itemPtr->parm[0];",
        fileName: "src/Misc/Triggers.c",
        lineNumber: 444,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  45: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Battery aim animation (8 chooses the best aim automatically)",
      codeSample: {
        code: "if ((animNum = itemPtr->parm[0]) == 8)",
        fileName: "src/Enemies/Bargain/Enemy_Battery.c",
        lineNumber: 60,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  46: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Initial poison-apple sprite frame",
      codeSample: {
        code: "newObj = MakeNewShape(GroupNum_FairyHealth,ObjType_FairyHealth,itemPtr->parm[0],",
        fileName: "src/Misc/Traps.c",
        lineNumber: 548,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  52: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Key required to open the bargain door",
      codeSample: {
        code: "newObj->KeyNeeded = itemPtr->parm[0];",
        fileName: "src/Misc/Triggers.c",
        lineNumber: 365,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  54: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Hydrant spray direction",
      codeSample: {
        code: "newObj->HydrantDirection = itemPtr->parm[0];",
        fileName: "src/Misc/Traps.c",
        lineNumber: 581,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  // Item 55: Key Color
  55: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Key-color subtype/frame passed directly to the key-color shape.",
      codeSample: {
        code: "newObj = MakeNewShape(GroupNum_KeyColor,ObjType_KeyColor,itemPtr->parm[0],",
        fileName: "src/Misc/MiscAnims.c",
        lineNumber: 247,
      },
    },
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
