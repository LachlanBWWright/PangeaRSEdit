import { ItemParams } from "./itemParams";

export enum ItemType {
  StartCoords, // My Start Coords
  Cactus, // 1
  WaterPatch, // 2
  Sign, // 3 Signs
  Tree, // 4
  POW, // 5
  FinishLine, // 6
  Vase, // 7
  Rickshaw, // 8
  FlagPole, // 9 Flagpole
  Waterfall, // 10 waterfall
  Token, // 11 token (arrowhead, etc.)
  StickyTiresPOW, // 12
  SuspensionPOW, // 13
  EasterHead, // 14
  DustDevil, // 15
  SnoMan, // 16
  CampFire, // 17
  Yeti, // 18 Yeti
  LavaGenerator, // 19 Lava Generator
  Pillar, // 20 pillar
  Pylon, // 21 pylon
  Boat, // 22 solar boat
  CamelSpline, // 23 camel - SPLINE
  Statue, // 24 statue
  Sphinx, // 25 sphinx head
  TeamTorch, // 26 team torch
  TeamBase, // 27 team base
  BubbleGenerator, // 28
  InvisibilityPOW, // 29
  Rock, // 30 rock
  BrontoNeck, // 31 brontosaur neck
  RockOverhang, // 32 rock overhang
  Vine, // 33 Vine
  AztecHead, // 34 Aztec Head
  BeetleSpline, // 35 beetle- spline
  CastleTower, // 36 castle tower
  Catapult, // 37 catapult
  Gong, // 38 Gong
  House, // 39 Houses
  Cauldron, // 40 Cauldron
  Well, // 41 Well
  Volcano, // 42 volcano
  Clock, // 43 crete clock
  Goddess, // 44 Goddess
  StoneHenge, // 45 stone henge
  Coliseum, // 46 Coliseum
  Stump, // 47 Stump
  Baracade, // 48 Baracade
  VikingFlag, // 49 Viking Flag
  TorchPot, // 50 Torchpot
  Cannon, // 51 Cannon
  Clam, // 52 Clam
  SharkSpline, // 53 Shark - spline
  TrollSpline, // 54 troll - spline
  WeaponsRack, // 55 weapons rack
  Capsule, // 56 Capsule
  SeaMine, // 57 Sea Mine
  PteradactylSpline, // 58 Pteradactyl - spline
  Dragon, // 59 Chinese Dragon
  TarPatch, // 60 Tar Patch
  MummySpline, // 61 Mummy -spline
  TotemPole, // 62 Totem Pole
  Druid, // 63 Druid
  PolarBearSpline, // 64 Polar Bear - spline
  Flower, // 65 flower
  VikingSpline, // 66 Viking - spline
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "My Start Coords",
  [ItemType.Cactus]: "Cactus",
  [ItemType.WaterPatch]: "WaterPatch",
  [ItemType.Sign]: "Sign",
  [ItemType.Tree]: "Tree",
  [ItemType.POW]: "POW",
  [ItemType.FinishLine]: "FinishLine",
  [ItemType.Vase]: "Vase",
  [ItemType.Rickshaw]: "Rickshaw",
  [ItemType.FlagPole]: "FlagPole",
  [ItemType.Waterfall]: "Waterfall",
  [ItemType.Token]: "Token",
  [ItemType.StickyTiresPOW]: "StickyTiresPOW",
  [ItemType.SuspensionPOW]: "SuspensionPOW",
  [ItemType.EasterHead]: "EasterHead",
  [ItemType.DustDevil]: "DustDevil",
  [ItemType.SnoMan]: "SnoMan",
  [ItemType.CampFire]: "CampFire",
  [ItemType.Yeti]: "Yeti",
  [ItemType.LavaGenerator]: "LavaGenerator",
  [ItemType.Pillar]: "Pillar",
  [ItemType.Pylon]: "Pylon",
  [ItemType.Boat]: "Boat",
  [ItemType.CamelSpline]: "CamelSpline",
  [ItemType.Statue]: "Statue",
  [ItemType.Sphinx]: "Sphinx",
  [ItemType.TeamTorch]: "TeamTorch",
  [ItemType.TeamBase]: "TeamBase",
  [ItemType.BubbleGenerator]: "BubbleGenerator",
  [ItemType.InvisibilityPOW]: "InvisibilityPOW",
  [ItemType.Rock]: "Rock",
  [ItemType.BrontoNeck]: "BrontoNeck",
  [ItemType.RockOverhang]: "RockOverhang",
  [ItemType.Vine]: "Vine",
  [ItemType.AztecHead]: "AztecHead",
  [ItemType.BeetleSpline]: "BeetleSpline",
  [ItemType.CastleTower]: "CastleTower",
  [ItemType.Catapult]: "Catapult",
  [ItemType.Gong]: "Gong",
  [ItemType.House]: "House",
  [ItemType.Cauldron]: "Cauldron",
  [ItemType.Well]: "Well",
  [ItemType.Volcano]: "Volcano",
  [ItemType.Clock]: "Clock",
  [ItemType.Goddess]: "Goddess",
  [ItemType.StoneHenge]: "StoneHenge",
  [ItemType.Coliseum]: "Coliseum",
  [ItemType.Stump]: "Stump",
  [ItemType.Baracade]: "Baracade",
  [ItemType.VikingFlag]: "VikingFlag",
  [ItemType.TorchPot]: "TorchPot",
  [ItemType.Cannon]: "Cannon",
  [ItemType.Clam]: "Clam",
  [ItemType.SharkSpline]: "SharkSpline",
  [ItemType.TrollSpline]: "TrollSpline",
  [ItemType.WeaponsRack]: "WeaponsRack",
  [ItemType.Capsule]: "Capsule",
  [ItemType.SeaMine]: "SeaMine",
  [ItemType.PteradactylSpline]: "PteradactylSpline",
  [ItemType.Dragon]: "Dragon",
  [ItemType.TarPatch]: "TarPatch",
  [ItemType.MummySpline]: "MummySpline",
  [ItemType.TotemPole]: "TotemPole",
  [ItemType.Druid]: "Druid",
  [ItemType.PolarBearSpline]: "PolarBearSpline",
  [ItemType.Flower]: "Flower",
  [ItemType.VikingSpline]: "VikingSpline",
};

export type CroMagItemParams = ItemParams;

const croMagDefaultParams: CroMagItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

export const croMagItemTypeParams: Record<ItemType, CroMagItemParams> = {
  [ItemType.StartCoords]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Player number",
      codeSample: {
        code: "p = itemPtr[i].parm[0]; // player # is in parm 0",
        fileName: "Source/Terrain/Terrain2.c",
        lineNumber: 246,
      },
    },
    p1: {
      type: "Integer",
      description: "Starting rotation (0-15, where each unit = 22.5°)",
      codeSample: {
        code: "gPlayerInfo[p].startRotY = PI2 * ((float)itemPtr[i].parm[1] * (1.0f/16.0f));",
        fileName: "Source/Terrain/Terrain2.c",
        lineNumber: 253,
      },
    },
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Capture the flag mode flag",
          codeSample: {
            code: "if (gGameMode ==GAME_MODE_CAPTUREFLAG) {\n    if (!(itemPtr[i].parm[3] & 1))\n        continue;\n}",
            fileName: "Source/Terrain/Terrain2.c",
            lineNumber: 234,
          },
        },
      ],
    },
  },
  [ItemType.Cactus]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Cactus type (0-1)",
      codeSample: {
        code: "short cactusType = itemPtr->parm[0];\nif (cactusType > 1) cactusType = 1;\ngNewObjectDefinition.type = DESERT_ObjType_Cactus + cactusType;",
        fileName: "Source/Items/Triggers.c",
        lineNumber: 775,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Integer",
      description: "Non-solid flag (0 = solid, 1 = non-solid)",
      codeSample: {
        code: "Boolean notSolid = itemPtr->parm[3];\nif (!notSolid) {\n    /* set collision */\n}",
        fileName: "Source/Items/Triggers.c",
        lineNumber: 774,
      },
    },
  },
  [ItemType.WaterPatch]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Water type/level index",
      codeSample: {
        code: "y = gWaterHeights[gTrackNum][itemPtr->parm[0]];",
        fileName: "Source/Terrain/Liquids.c",
        lineNumber: 115,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Use fixed height (based on track and type)",
          codeSample: {
            code: "if (itemPtr->parm[3] & 1) {\n    y = gWaterHeights[gTrackNum][itemPtr->parm[0]];\n} else {\n    y = GetTerrainY(x,z) + 100.0f;\n}",
            fileName: "Source/Terrain/Liquids.c",
            lineNumber: 113,
          },
        },
      ],
    },
  },
  [ItemType.Sign]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Sign type (Fire, Ice, etc.)",
      codeSample: {
        code: ".type = GLOBAL_ObjType_Sign_Fire + itemPtr->parm[0],",
        fileName: "Source/Items/Items.c",
        lineNumber: 796,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: ".rot = PI2 * ((float)itemPtr->parm[1] * (1.0f/8.0f)),",
        fileName: "Source/Items/Items.c",
        lineNumber: 801,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Tree]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Tree type (0-3, varies by track)",
      codeSample: {
        code: "if (itemPtr->parm[0] >= 4) return false;\n.type = types[gTrackNum][itemPtr->parm[0]],",
        fileName: "Source/Items/Items.c",
        lineNumber: 330,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Solid collision",
          codeSample: {
            code: "Boolean isSolid = itemPtr->parm[3] & 1;",
            fileName: "Source/Items/Items.c",
            lineNumber: 325,
          },
        },
        {
          index: 1,
          description: "Bump up position (+500 units)",
          codeSample: {
            code: "if (itemPtr->parm[3] & (1<<1)) def.coord.y += 500.0f;",
            fileName: "Source/Items/Items.c",
            lineNumber: 354,
          },
        },
      ],
    },
  },
  [ItemType.POW]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "POW type (bone, oil slick, etc.)",
      codeSample: {
        code: "powType = itemPtr->parm[0];\n.type = GLOBAL_ObjType_BonePOW + powType,",
        fileName: "Source/Items/Triggers.c",
        lineNumber: 202,
      },
    },
    p1: {
      type: "Integer",
      description: "Height offset multiplier (×400 units)",
      codeSample: {
        code: "heightOff = (float)itemPtr->parm[1] * 400.0f;\nwhere.y = GetTerrainY(x,z) + heightOff;",
        fileName: "Source/Items/Triggers.c",
        lineNumber: 203,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.FinishLine]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Vase]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: ".rot = (float)(itemPtr->parm[0]) / 8.0f * PI2,",
        fileName: "Source/Items/Triggers.c",
        lineNumber: 1454,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Rickshaw]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.FlagPole]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Waterfall]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Token]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.StickyTiresPOW]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SuspensionPOW]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.EasterHead]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.DustDevil]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SnoMan]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.CampFire]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Yeti]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.LavaGenerator]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Pillar]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Pylon]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Boat]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.CamelSpline]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Statue]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Statue type (varies by track: bull statue, cat statue, etc.)",
      codeSample: {
        code: ".type = types[gTrackNum][itemPtr->parm[0]],",
        fileName: "Source/Items/Items.c",
        lineNumber: 715,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: ".rot = itemPtr->parm[1] * (PI/4),",
        fileName: "Source/Items/Items.c",
        lineNumber: 722,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Sphinx]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TeamTorch]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TeamBase]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BubbleGenerator]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.InvisibilityPOW]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Rock]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Rock type (0 = grey rock, 1+ = other types)",
      codeSample: {
        code: ".type = GLOBAL_ObjType_GreyRock + itemPtr->parm[0],",
        fileName: "Source/Items/Items.c",
        lineNumber: 976,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BrontoNeck]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.RockOverhang]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Vine]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.AztecHead]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BeetleSpline]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.CastleTower]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Catapult]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Gong]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.House]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "House type (varies by track: hut, cabin, dome, etc.)",
      codeSample: {
        code: "short type = itemPtr->parm[0];\n.type = info[gTrackNum].type[type],",
        fileName: "Source/Items/Items.c",
        lineNumber: 1288,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: ".rot = PI2 * ((float)itemPtr->parm[1] * (1.0f/8.0f)),",
        fileName: "Source/Items/Items.c",
        lineNumber: 1295,
      },
    },
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Non-solid (no collision)",
          codeSample: {
            code: "Boolean notSolid = itemPtr->parm[3] & 1;",
            fileName: "Source/Items/Items.c",
            lineNumber: 1286,
          },
        },
      ],
    },
  },
  [ItemType.Cauldron]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Well]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Volcano]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Clock]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Goddess]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.StoneHenge]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Coliseum]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Stump]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Baracade]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.VikingFlag]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TorchPot]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Cannon]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Clam]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SharkSpline]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TrollSpline]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.WeaponsRack]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Capsule]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SeaMine]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.PteradactylSpline]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Dragon]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TarPatch]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.MummySpline]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TotemPole]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Druid]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.PolarBearSpline]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Flower]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.VikingSpline]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
};
