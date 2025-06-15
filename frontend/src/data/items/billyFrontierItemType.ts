import { ItemParams } from "./itemParams";

export enum ItemType {
  StartCoords, // My Start Coords
  Dueler, // 1: dueler
  Building, // 2: building
  HeadStone, // 3: headstone
  Plant, // 4: plant
  DuelRockWall, // 5: rockwall
  Coffin, // 6: coffin
  FrogMan_Shootout, // 7: frogman enemy
  Bandito_Shootout, // 8: bandito shootout
  Barrel, // 9: barrel
  WoodCrate, // 10: wood crate
  HayBale, // 11: hay bale
  ShootoutSaloon, // 12: shooutout saloon
  ShootoutAlley, // 13: shootout alley
  Post, // 14: post
  Flame, // 15: flames
  Smoker, // 16: smoker
  SceneryKangaCow, // 17: kanga cow
  Table, // 18: table
  Chair, // 19: chair
  StampedeKanga, // 20: stampede kanga
  Boost, // 21: boost
  StampedeCamera, // 22: stampede camera
  Wallker, // 23: walker
  DeadTree, // 24: dead tree
  Rock, // 25: canyon rock
  ElectricFence, // 26: electric fence
  Tumbleweed, // 27: tumbleweed
  TremorGrave, // 28: swamp grave
  TeePee, // 29: tee pee
  SwampCabin, // 30: swamp cabin
  TremorAlien_Shootout, // 31: tremor alien
  FreeLifePOW, // 32: free life POW
  SpearSkull, // 33: spear skull
  StampedeKangarex, // 34: stampede kangarex
  Shorty_Shootout, // 35: shorty shootout
  Peso, // 36: peso
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "My Start Coords",
  [ItemType.Dueler]: "Dueler",
  [ItemType.Building]: "Building",
  [ItemType.HeadStone]: "HeadStone",
  [ItemType.Plant]: "Plant",
  [ItemType.DuelRockWall]: "DuelRockWall",
  [ItemType.Coffin]: "Coffin",
  [ItemType.FrogMan_Shootout]: "FrogMan_Shootout",
  [ItemType.Bandito_Shootout]: "Bandito_Shootout",
  [ItemType.Barrel]: "Barrel",
  [ItemType.WoodCrate]: "WoodCrate",
  [ItemType.HayBale]: "HayBale",
  [ItemType.ShootoutSaloon]: "ShootoutSaloon",
  [ItemType.ShootoutAlley]: "ShootoutAlley",
  [ItemType.Post]: "Post",
  [ItemType.Flame]: "Flame",
  [ItemType.Smoker]: "Smoker",
  [ItemType.SceneryKangaCow]: "SceneryKangaCow",
  [ItemType.Table]: "Table",
  [ItemType.Chair]: "Chair",
  [ItemType.StampedeKanga]: "StampedeKanga",
  [ItemType.Boost]: "Boost",
  [ItemType.StampedeCamera]: "StampedeCamera",
  [ItemType.Wallker]: "Wallker",
  [ItemType.DeadTree]: "DeadTree",
  [ItemType.Rock]: "Rock",
  [ItemType.ElectricFence]: "ElectricFence",
  [ItemType.Tumbleweed]: "Tumbleweed",
  [ItemType.TremorGrave]: "TremorGrave",
  [ItemType.TeePee]: "TeePee",
  [ItemType.SwampCabin]: "SwampCabin",
  [ItemType.TremorAlien_Shootout]: "TremorAlien_Shootout",
  [ItemType.FreeLifePOW]: "FreeLifePOW",
  [ItemType.SpearSkull]: "SpearSkull",
  [ItemType.StampedeKangarex]: "StampedeKangarex",
  [ItemType.Shorty_Shootout]: "Shorty_Shootout",
  [ItemType.Peso]: "Peso",
};

export type BillyFrontierItemParams = ItemParams;

export const billyFrontierItemTypeParams: Record<
  ItemType,
  BillyFrontierItemParams
> = {
  [ItemType.StartCoords]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Starting rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gPlayerInfo.startRotY = (float)itemPtr[i].parm[0] * (PI2/8.0f);",
        fileName: "Source/Terrain/Terrain2.c",
        lineNumber: 248,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Dueler]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Dueler type (enemy character variant)",
      codeSample: {
        code: "short duelerType = itemPtr->parm[0];",
        fileName: "Source/System/Areas/Duel.c",
        lineNumber: 388,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "float rot = (float)itemPtr->parm[1] * (PI2/8);",
        fileName: "Source/System/Areas/Duel.c",
        lineNumber: 389,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Building]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Building type (Saloon, etc.)",
      codeSample: {
        code: "gNewObjectDefinition.type = BUILDING_ObjType_Saloon + itemPtr->parm[0];",
        fileName: "Source/Items/Items.c",
        lineNumber: 137,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI2/4);",
        fileName: "Source/Items/Items.c",
        lineNumber: 149,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.HeadStone]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Headstone type (variant)",
      codeSample: {
        code: "gNewObjectDefinition.type = TOWN_ObjType_Headstone1 + itemPtr->parm[0];",
        fileName: "Source/Items/Items.c",
        lineNumber: 194,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI2/8);",
        fileName: "Source/Items/Items.c",
        lineNumber: 202,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Plant]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Plant type (Cactus in town, MushroomTree in swamp)",
      codeSample: {
        code: "gNewObjectDefinition.type = TOWN_ObjType_Cactus + itemPtr->parm[0];\n// or SWAMP_ObjType_MushroomTree + itemPtr->parm[0];",
        fileName: "Source/Items/Items.c",
        lineNumber: 226,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.DuelRockWall]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Coffin]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Coffin type (variant)",
      codeSample: {
        code: "gNewObjectDefinition.type = TOWN_ObjType_Coffin + itemPtr->parm[0];",
        fileName: "Source/Items/Items.c",
        lineNumber: 267,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI2/8);",
        fileName: "Source/Items/Items.c",
        lineNumber: 275,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.FrogMan_Shootout]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Stop point (target position for enemy movement)",
      codeSample: {
        code: "short stopPoint = itemPtr->parm[0];\nnewObj->StopPoint = stopPoint;",
        fileName: "Source/Enemy/Enemy_FrogMan.c",
        lineNumber: 62,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "float rot = (float)itemPtr->parm[1] * (PI2/8);",
        fileName: "Source/Enemy/Enemy_FrogMan.c",
        lineNumber: 63,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Bandito_Shootout]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Stop point (target position for enemy movement)",
      codeSample: {
        code: "short stopPoint = itemPtr->parm[0];\nnewObj->StopPoint = stopPoint;",
        fileName: "Source/Enemy/Enemy_Bandito.c",
        lineNumber: 233,
      },
    },
    p1: {
      type: "Integer",
      description: "Action type (0=duck down, 1=duck left, 2=duck right)",
      codeSample: {
        code: "short actionType = itemPtr->parm[1];\nnewObj->ActionType = actionType;",
        fileName: "Source/Enemy/Enemy_Bandito.c",
        lineNumber: 234,
      },
    },
    p2: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "float rot = (float)itemPtr->parm[2] * (PI2/8);",
        fileName: "Source/Enemy/Enemy_Bandito.c",
        lineNumber: 235,
      },
    },
    p3: "Unknown",
  },
  [ItemType.Barrel]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Barrel type (0=regular barrel, 1=TNT barrel)",
      codeSample: {
        code: "gNewObjectDefinition.type = GLOBAL_ObjType_Barrel + itemPtr->parm[0];\nif (itemPtr->parm[0] == 1) newObj->What = WHAT_TNT;",
        fileName: "Source/Items/Items.c",
        lineNumber: 296,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.WoodCrate]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Crate type (0-1=wood, 2+=metal, cannot be busted)",
      codeSample: {
        code: "int type = itemPtr->parm[0];\nif (type >= 2) newObj->HitByBulletCallback = nil;",
        fileName: "Source/Items/Items.c",
        lineNumber: 328,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI2/8);",
        fileName: "Source/Items/Items.c",
        lineNumber: 338,
      },
    },
    p2: {
      type: "Integer",
      description:
        "Contents (0=empty, 1=shield POW, 2=ammo POW, 3=peso POW, 4=free life POW)",
      codeSample: {
        code: "newObj->Kind = itemPtr->parm[2]; // what kind of contents are in this crate",
        fileName: "Source/Items/Items.c",
        lineNumber: 349,
      },
    },
    p3: "Unknown",
  },
  [ItemType.HayBale]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.ShootoutSaloon]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.ShootoutAlley]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Post]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Post type (0=wood fence post)",
      codeSample: {
        code: "int type = itemPtr->parm[0];\nswitch(type) {\n  case 0: // wood fence post\n    gNewObjectDefinition.type = GLOBAL_ObjType_WoodPost;\n}",
        fileName: "Source/Items/Items.c",
        lineNumber: 955,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI2/8);",
        fileName: "Source/Items/Items.c",
        lineNumber: 970,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Flame]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Smoker]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Smoke kind/type",
      codeSample: {
        code: "newObj = MakeSmoker(x,z, itemPtr->parm[0]);\nnewObj->Kind = kind; // save smoke kind",
        fileName: "Source/Effects/Particles.c",
        lineNumber: 1490,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SceneryKangaCow]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Table]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/8);",
        fileName: "Source/Items/Items.c",
        lineNumber: 1124,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Chair]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/8);",
        fileName: "Source/Items/Items.c",
        lineNumber: 1154,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.StampedeKanga]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Boost]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.StampedeCamera]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Wallker]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.DeadTree]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Rock]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.ElectricFence]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Tumbleweed]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TremorGrave]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/8);",
        fileName: "Source/Enemy/Enemy_TremorGhost.c",
        lineNumber: 70,
      },
    },
    p1: {
      type: "Integer",
      description: "Stop point (target position for ghost movement)",
      codeSample: {
        code: "short stopPoint = itemPtr->parm[1];\nnewObj->StopPoint = stopPoint;",
        fileName: "Source/Enemy/Enemy_TremorGhost.c",
        lineNumber: 61,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TeePee]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SwampCabin]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TremorAlien_Shootout]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Stop point (target position for enemy movement)",
      codeSample: {
        code: "short stopPoint = itemPtr->parm[0];\nnewObj->StopPoint = stopPoint;",
        fileName: "Source/Enemy/Enemy_TremorAlien.c",
        lineNumber: 132,
      },
    },
    p1: "Unknown",
    p2: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "float rot = (float)itemPtr->parm[2] * (PI2/8);",
        fileName: "Source/Enemy/Enemy_TremorAlien.c",
        lineNumber: 133,
      },
    },
    p3: "Unknown",
  },
  [ItemType.FreeLifePOW]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SpearSkull]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.StampedeKangarex]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Shorty_Shootout]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Stop point (target position for enemy movement)",
      codeSample: {
        code: "short stopPoint = itemPtr->parm[0];\nnewObj->StopPoint = stopPoint;",
        fileName: "Source/Enemy/Enemy_Shorty.c",
        lineNumber: 239,
      },
    },
    p1: {
      type: "Integer",
      description: "Action type (0=duck down, 1=duck left, 2=duck right)",
      codeSample: {
        code: "short actionType = itemPtr->parm[1];\nnewObj->ActionType = actionType;",
        fileName: "Source/Enemy/Enemy_Shorty.c",
        lineNumber: 240,
      },
    },
    p2: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "float rot = (float)itemPtr->parm[2] * (PI2/8);",
        fileName: "Source/Enemy/Enemy_Shorty.c",
        lineNumber: 241,
      },
    },
    p3: "Unknown",
  },
  [ItemType.Peso]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
};
