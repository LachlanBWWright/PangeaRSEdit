import {
  ItemParams,
  ItemParamsSource,
  ParamDescriptionSource,
  defineItemParams,
} from "./itemParams";

function sourceInteger(
  description: string,
  fileName: string,
  lineNumber: number,
  code: string,
): ParamDescriptionSource {
  return {
    type: "Integer",
    description,
    codeSample: { code, fileName, lineNumber },
  };
}

function sourceFlag(
  description: string,
  fileName: string,
  lineNumber: number,
  code: string,
): ParamDescriptionSource {
  return {
    type: "Bit Flags",
    flags: [{
      index: 0,
      description,
      codeSample: { code, fileName, lineNumber },
    }],
  };
}

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

type CroMagItemParamsSource = ItemParamsSource;
export type CroMagItemParams = ItemParams;

const croMagItemTypeParamsSource: Record<ItemType, CroMagItemParamsSource> = {
  [ItemType.StartCoords]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Player number",
      codeSample: {
        code: "p = itemPtr[i].parm[0]; // player # is in parm 0",
        fileName: "Source/Terrain/Terrain2.c",
        lineNumber: 248,
      },
    },
    p1: {
      type: "Integer",
      description: "Starting rotation (0-15, where each unit = 22.5°)",
      codeSample: {
        code: "gPlayerInfo[p].startRotY = PI2 * ((float)itemPtr[i].parm[1] * (1.0f/16.0f));",
        fileName: "Source/Terrain/Terrain2.c",
        lineNumber: 255,
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
            code: "if (gGameMode ==GAME_MODE_CAPTUREFLAG)\n{\n\tif (!(itemPtr[i].parm[3] & 1))\n\t\tcontinue;\n}\nelse\n{\n\tif (itemPtr[i].parm[3] & 1)\n\t\tcontinue;\n}",
            fileName: "Source/Terrain/Terrain2.c",
            lineNumber: 236,
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
        code: "short	cactusType = itemPtr->parm[0];			// get cactus type",
        fileName: "Source/Items/Triggers.c",
        lineNumber: 776,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Integer",
      description: "Non-solid flag (0 = solid, 1 = non-solid)",
      codeSample: {
        code: "Boolean	notSolid = itemPtr->parm[3];",
        fileName: "Source/Items/Triggers.c",
        lineNumber: 775,
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
        lineNumber: 118,
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
            code: "if (itemPtr->parm[3] & 1)\t\t\t\t\t\t// see if use fixed height",
            fileName: "Source/Terrain/Liquids.c",
            lineNumber: 116,
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
        lineNumber: 797,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: ".rot = PI2 * ((float)itemPtr->parm[1] * (1.0f/8.0f)),",
        fileName: "Source/Items/Items.c",
        lineNumber: 804,
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
        code: ".type 		= types[gTrackNum][itemPtr->parm[0]],",
        fileName: "Source/Items/Items.c",
        lineNumber: 342,
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
              lineNumber: 329,
          },
        },
        {
          index: 1,
          description: "Bump up position (+500 units)",
          codeSample: {
            code: "if (itemPtr->parm[3] & (1<<1))",
            fileName: "Source/Items/Items.c",
              lineNumber: 353,
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
        code: "powType = itemPtr->parm[0];								// get POW type",
        fileName: "Source/Items/Triggers.c",
        lineNumber: 203,
      },
    },
    p1: {
      type: "Integer",
      description: "Height offset multiplier (×400 units)",
      codeSample: {
        code: "heightOff = (float)itemPtr->parm[1] * 400.0f;",
        fileName: "Source/Items/Triggers.c",
        lineNumber: 204,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.FinishLine]: {
    flags: "Unknown",
    p0: sourceInteger("Finish-line rotation", "Source/Items/Items.c", 139, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
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
        lineNumber: 1456,
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
    p0: sourceInteger("Flag-pole rotation", "Source/Items/Items.c", 1452, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Waterfall]: {
    flags: "Unknown",
    p0: sourceInteger("Waterfall rotation (0-15)", "Source/Terrain/Liquids.c", 238, "rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/16.0f));"),
    p1: sourceInteger("Waterfall scale increment", "Source/Terrain/Liquids.c", 239, "scale = 2.0f + ((float)itemPtr->parm[1] * .3f);"),
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
    p0: sourceInteger("Easter-head rotation", "Source/Items/Items.c", 425, ".rot = (float)itemPtr->parm[0] / 8.0f * PI2,"),
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
    p0: sourceInteger("Snowman rotation", "Source/Items/Triggers.c", 926, ".rot = (float)(itemPtr->parm[0]) / 8.0f * PI2,"),
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
    p0: sourceInteger("Pillar model variant", "Source/Items/Items.c", 547, "short type = itemPtr->parm[0];"),
    p1: "Unknown",
    p2: "Unknown",
    p3: sourceFlag("Disable solid collision", "Source/Items/Items.c", 546, "Boolean notSolid = itemPtr->parm[3] & 1;"),
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
    p0: sourceInteger("Water-height table index", "Source/Items/Items.c", 639, "def.coord.y = gWaterHeights[gTrackNum][itemPtr->parm[0]];"),
    p1: sourceInteger("Boat rotation", "Source/Items/Items.c", 631, ".rot = PI2 * ((float)itemPtr->parm[1] * (1.0f/8.0f)),"),
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
        lineNumber: 719,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: ".rot = itemPtr->parm[1] * (PI/4),",
        fileName: "Source/Items/Items.c",
        lineNumber: 725,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Sphinx]: {
    flags: "Unknown",
    p0: sourceInteger("Sphinx rotation in quarter turns", "Source/Items/Items.c", 765, ".rot = itemPtr->parm[0] * (PI/2),"),
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TeamTorch]: {
    flags: "Unknown",
    p0: sourceInteger("Torch team", "Source/Items/Triggers.c", 1184, "newObj->TorchTeam = itemPtr->parm[0];"),
    p1: "Unused",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TeamBase]: {
    flags: "Unknown",
    p0: sourceInteger("Team-base color/team", "Source/Items/Triggers.c", 1341, ".type = GLOBAL_ObjType_TeamBaseRed + itemPtr->parm[0],"),
    p1: "Unused",
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
        lineNumber: 977,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BrontoNeck]: {
    flags: "Unknown",
    p0: sourceInteger("Brontosaurus-neck rotation", "Source/Items/Items.c", 1020, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.RockOverhang]: {
    flags: "Unknown",
    p0: sourceInteger("Rock-overhang rotation", "Source/Items/Items.c", 1062, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
    p1: sourceInteger("Rock-overhang model variant", "Source/Items/Items.c", 1069, "def.type = DESERT_ObjType_RockOverhang + itemPtr->parm[1];"),
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Vine]: {
    flags: "Unknown",
    p0: sourceInteger("Vine rotation", "Source/Items/Items.c", 396, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.AztecHead]: {
    flags: "Unknown",
    p0: sourceInteger("Aztec-head rotation", "Source/Items/Items.c", 1143, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
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
    p0: sourceInteger("Castle-tower model variant", "Source/Items/Items.c", 1174, ".type = EUROPE_ObjType_CastleTower + itemPtr->parm[0],"),
    p1: "Unused",
    p2: "Unknown",
    p3: sourceFlag("Enable solid collision", "Source/Items/Items.c", 1169, "Boolean isSolid = itemPtr->parm[3] & 1;"),
  },
  [ItemType.Catapult]: {
    flags: "Unknown",
    p0: sourceInteger("Catapult rotation", "Source/Items/Traps.c", 613, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Gong]: {
    flags: "Unknown",
    p0: sourceInteger("Gong rotation in quarter turns", "Source/Items/Triggers.c", 1675, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/4.0f)),"),
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
        code: "short type = itemPtr->parm[0];",
        fileName: "Source/Items/Items.c",
        lineNumber: 1290,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: ".rot = PI2 * ((float)itemPtr->parm[1] * (1.0f/8.0f)),",
        fileName: "Source/Items/Items.c",
        lineNumber: 1298,
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
              lineNumber: 1289,
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
    p0: sourceInteger("Stonehenge model variant", "Source/Items/Items.c", 1484, "short type = itemPtr->parm[0];"),
    p1: sourceInteger("Stonehenge rotation (0-63)", "Source/Items/Items.c", 1494, ".rot = PI2 * ((float)itemPtr->parm[1] * (1.0f/64.0f)),"),
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
    p0: sourceInteger("Barricade model variant", "Source/Items/Items.c", 941, ".type = SCANDINAVIA_ObjType_Baracade1 + itemPtr->parm[0],"),
    p1: sourceInteger("Barricade rotation", "Source/Items/Items.c", 946, ".rot = PI2 * ((float)itemPtr->parm[1] * (1.0f/4.0f)),"),
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.VikingFlag]: {
    flags: "Unknown",
    p0: sourceInteger("Viking-flag rotation", "Source/Items/Items.c", 879, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
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
    p0: sourceInteger("Cannon rotation", "Source/Items/Traps.c", 1074, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
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
    p0: sourceInteger("Weapons-rack rotation in quarter turns", "Source/Items/Items.c", 912, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/4.0f)),"),
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
    p0: sourceInteger("Sea-mine height offset", "Source/Items/Triggers.c", 1849, ".coord.y = GetTerrainY(x,z) + 300.0f + (float)itemPtr->parm[0] * 15.0f,"),
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
    p0: sourceInteger("Dragon rotation", "Source/Items/Traps.c", 1848, ".rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),"),
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TarPatch]: {
    flags: "Unknown",
    p0: sourceInteger("Tar-patch scale increment", "Source/Terrain/Liquids.c", 342, ".scale = 1.0 + (float)(itemPtr->parm[0]) * .5f"),
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

export const croMagItemTypeParams = defineItemParams(
  "cromag",
  croMagItemTypeParamsSource,
);
