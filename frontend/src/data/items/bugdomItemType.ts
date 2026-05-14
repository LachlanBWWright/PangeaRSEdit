import { ItemParams, ItemParamsSource, defineItemParams } from "./itemParams";

export enum ItemType {
  StartCoords, // My Start Coords
  LadyBugBonus, // 1: LadyBug Bonus
  Nut, // 2: Nut
  Enemy_BoxerFly, // 3: ENEMY: BOXERFLY
  Rock, // 4: Rock
  Clover, // 5: Clover
  Grass, // 6: Grass
  Weed, // 7: Weed
  SlugEnemy, // 8: Slug enemy
  Enemy_Ant, // 9: Ant
  SunFlower, // 10: Sunflower
  Cosmo, // 11: Cosmo
  Poppy, // 12: Poppy
  WallEnd, // 13: Wall End
  WaterPatch, // 14: Water Patch
  Enemy_FireAnt, // 15: FireAnt
  WaterBug, // 16: WaterBug
  Tree, // 17: Tree (flight level)
  DragonFly, // 18: Dragonfly
  CatTail, // 19: Cat Tail
  DuckWeed, // 20: Duck Weed
  LilyFlower, // 21: Lily Flower
  LilyPad, // 22: Lily Pad
  PondGrass, // 23: Pond Grass
  Reed, // 24: Reed
  Enemy_PondFish, // 25: Pond Fish Enemy
  HoneycombPlatform, // 26: Honeycomb platform
  HoneyPatch, // 27: Honey Patch
  Firecracker, // 28: Firecracker
  Detonator, // 29: Detonator
  HiveDoor, // 30: Hive Door
  Enemy_Mosquito, // 31: Mosquito Enemy
  Checkpoint, // 32: Checkpoint
  LawnDoor, // 33: Lawn Door
  Dock, // 34: Dock
  Foot, // 35: Foot
  Enemy_Spider, // 36: ENEMY: SPIDER
  Enemy_Caterpiller, // 37: ENEMY: CATERPILLER
  FireFly, // 38: Firefly
  ExitLog, // 39: Exit Log
  RootSwing, // 40: Root swing
  Thorn, // 41: Thorn Bush
  FireFlyTargetLocation, // 42: FireFly Target Location
  FireWall, // 43: Fire Wall
  WaterValve, // 44: Water Valve
  HoneyTube, // 45: Honey Tube
  Enemy_Larva, // 46: ENEMY: LARVA
  Enemy_FlyingBee, // 47: ENEMY: FLYING BEE
  Enemy_WorkerBee, // 48: ENEMY: WORKER BEE
  Enemy_QueenBee, // 49: ENEMY: QUEEN BEE
  RockLedge, // 50: Rock Ledge
  Stump, // 51: Stump
  RollingBoulder, // 52: Rolling Boulder
  Enemy_Roach, // 53: ENEMY: ROACH
  Enemy_Skippy, // 54: ENEMY: SKIPPY
  SlimePatch, // 55: Slime Patch
  LavaPatch, // 56: Lava Patch
  BentAntPipe, // 57: Bent Ant Pipe
  HorizAntPipe, // 58: Horiz Ant Pipe
  Enemy_KingAnt, // 59: ENEMY: KING ANT
  Faucet, // 60: Water Faucet
  WoodPost, // 61: Wooden Post
  FloorSpike, // 62: Floor Spike
  KingWaterPipe, // 63: King Water Pipe
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "My Start Coords",
  [ItemType.LadyBugBonus]: "LadyBug Bonus",
  [ItemType.Nut]: "Nut",
  [ItemType.Enemy_BoxerFly]: "ENEMY: BOXERFLY",
  [ItemType.Rock]: "Rock",
  [ItemType.Clover]: "Clover",
  [ItemType.Grass]: "Grass",
  [ItemType.Weed]: "Weed",
  [ItemType.SlugEnemy]: "Slug enemy",
  [ItemType.Enemy_Ant]: "Ant",
  [ItemType.SunFlower]: "Sunflower",
  [ItemType.Cosmo]: "Cosmo",
  [ItemType.Poppy]: "Poppy",
  [ItemType.WallEnd]: "Wall End",
  [ItemType.WaterPatch]: "Water Patch",
  [ItemType.Enemy_FireAnt]: "FireAnt",
  [ItemType.WaterBug]: "WaterBug",
  [ItemType.Tree]: "Tree (flight level)",
  [ItemType.DragonFly]: "Dragonfly",
  [ItemType.CatTail]: "Cat Tail",
  [ItemType.DuckWeed]: "Duck Weed",
  [ItemType.LilyFlower]: "Lily Flower",
  [ItemType.LilyPad]: "Lily Pad",
  [ItemType.PondGrass]: "Pond Grass",
  [ItemType.Reed]: "Reed",
  [ItemType.Enemy_PondFish]: "Pond Fish Enemy",
  [ItemType.HoneycombPlatform]: "Honeycomb platform",
  [ItemType.HoneyPatch]: "Honey Patch",
  [ItemType.Firecracker]: "Firecracker",
  [ItemType.Detonator]: "Detonator",
  [ItemType.HiveDoor]: "Hive Door",
  [ItemType.Enemy_Mosquito]: "Mosquito Enemy",
  [ItemType.Checkpoint]: "Checkpoint",
  [ItemType.LawnDoor]: "Lawn Door",
  [ItemType.Dock]: "Dock",
  [ItemType.Foot]: "Foot",
  [ItemType.Enemy_Spider]: "ENEMY: SPIDER",
  [ItemType.Enemy_Caterpiller]: "ENEMY: CATERPILLER",
  [ItemType.FireFly]: "Firefly",
  [ItemType.ExitLog]: "Exit Log",
  [ItemType.RootSwing]: "Root swing",
  [ItemType.Thorn]: "Thorn Bush",
  [ItemType.FireFlyTargetLocation]: "FireFly Target Location",
  [ItemType.FireWall]: "Fire Wall",
  [ItemType.WaterValve]: "Water Valve",
  [ItemType.HoneyTube]: "Honey Tube",
  [ItemType.Enemy_Larva]: "ENEMY: LARVA",
  [ItemType.Enemy_FlyingBee]: "ENEMY: FLYING BEE",
  [ItemType.Enemy_WorkerBee]: "ENEMY: WORKER BEE",
  [ItemType.Enemy_QueenBee]: "ENEMY: QUEEN BEE",
  [ItemType.RockLedge]: "Rock Ledge",
  [ItemType.Stump]: "Stump",
  [ItemType.RollingBoulder]: "Rolling Boulder",
  [ItemType.Enemy_Roach]: "ENEMY: ROACH",
  [ItemType.Enemy_Skippy]: "ENEMY: SKIPPY",
  [ItemType.SlimePatch]: "Slime Patch",
  [ItemType.LavaPatch]: "Lava Patch",
  [ItemType.BentAntPipe]: "Bent Ant Pipe",
  [ItemType.HorizAntPipe]: "Horiz Ant Pipe",
  [ItemType.Enemy_KingAnt]: "ENEMY: KING ANT",
  [ItemType.Faucet]: "Water Faucet",
  [ItemType.WoodPost]: "Wooden Post",
  [ItemType.FloorSpike]: "Floor Spike",
  [ItemType.KingWaterPipe]: "King Water Pipe",
};

type BugdomItemParamsSource = ItemParamsSource;
export type BugdomItemParams = ItemParams;

const bugdomItemTypeParamsSource: Record<ItemType, BugdomItemParamsSource> = {
  [ItemType.StartCoords]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Starting aim/rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gMyStartAim = itemPtr[i].parm[0];\t\t\t\t\t\t\t\t// get aim 0..7",
        fileName: "src/Terrain/Terrain2.c",
        lineNumber: 213,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.LadyBugBonus]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Nut]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Nut contents - what's inside when broken (0=BallTime, 1=Key, 2=Money, 3=Health, 4=FreeLife, 5=Buddy, 6=GreenClover, 7=GoldClover, 8=BlueClover, 9=Shield, 10=Tick)",
      codeSample: {
        code: "contents = itemPtr->parm[0]; // get contents type from enum",
        fileName: "src/Items/Triggers.c",
        lineNumber: 235,
      },
    },
    p1: {
      type: "Integer",
      description:
        "Content-specific parameter - for keys: specifies which key ID (0-3), for other content types: unused",
      codeSample: {
        code: "newObj->KeyNum = theNut->NutParm1;\t\t\t// key ID# is in here",
        fileName: "src/Items/Triggers.c",
        lineNumber: 1099,
      },
    },
    p2: {
      type: "Integer",
      description:
        "Detonator ID - for hive levels, specifies which detonator can blow up this nut",
      codeSample: {
        code: "id = itemPtr->parm[2];\t\t\t\t\t// get detonator id",
        fileName: "src/Items/Triggers.c",
        lineNumber: 236,
      },
    },
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description:
            "Regenerate nut - nut will respawn after being broken (except on Beach level)",
          codeSample: {
            code: "newObj->RegenerateNut = itemPtr->parm[3] & 1; // see if regenerate this",
            fileName: "src/Items/Triggers.c",
            lineNumber: 276,
          },
        },
        {
          index: 1,
          description:
            "Can blow up - nut can be detonated by explosives (for hive levels)",
          codeSample: {
            code: "canBlow = itemPtr->parm[3] & (1<<1);\t// see if can blow",
            fileName: "src/Items/Triggers.c",
            lineNumber: 237,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_BoxerFly]: {
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
      description:
        "Rock type/variant (varies by level: flat rock, rock1, etc.)",
      codeSample: {
        code: "gNewObjectDefinition.type = NIGHT_MObjType_FlatRock + itemPtr->parm[0];\n// or LAWN2_MObjType_Rock1 + itemPtr->parm[0];\n// or FOREST_MObjType_FlatRock + itemPtr->parm[0];",
        fileName: "src/Items/Items2.c",
        lineNumber: 690,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Clover]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Clover type (0-1, different variants)",
      codeSample: {
        code: 'n = itemPtr->parm[0];\nif (n > 1) DoFatalAlert("AddClover: illegal clover type");\ngNewObjectDefinition.type = LAWN2_MObjType_Clover + n;',
        fileName: "src/Items/Items.c",
        lineNumber: 158,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Grass]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Grass variant (0-1); the active model file changes by level, but parm[0] selects the mesh within that level's grass set",
      codeSample: {
        code: "switch(gLevelType)\n{\n\tcase LEVEL_TYPE_LAWN:\n\t\tgNewObjectDefinition.type = LAWN2_MObjType_Grass + n;\n\t\tbreak;\n\tcase LEVEL_TYPE_FOREST:\n\t\tgNewObjectDefinition.type = FOREST_MObjType_Grass + n;\n\t\tbreak;\n\tcase LEVEL_TYPE_NIGHT:\n\t\tgNewObjectDefinition.type = NIGHT_MObjType_Grass + n;\n\t\tbreak;\n}",
        fileName: "src/Items/Items.c",
        lineNumber: 207,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Weed]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SlugEnemy]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Ant]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Ant type (0=normal, 1=rock thrower)",
      codeSample: {
        code: "rockThrower = itemPtr->parm[0] == 1;					// see if rock thrower",
        fileName: "src/Enemies/Enemy_Ant.c",
        lineNumber: 149,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Aggressive behavior",
          codeSample: {
            code: "newObj->Aggressive = itemPtr->parm[3] & 1; // see if aggressive",
            fileName: "src/Enemies/Enemy_Ant.c",
            lineNumber: 155,
          },
        },
      ],
    },
  },
  [ItemType.SunFlower]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Cosmo]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Poppy]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.WallEnd]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.WaterPatch]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Width in tiles (0 = default of 4 tiles)",
      codeSample: {
        code: "width = itemPtr->parm[0];",
        fileName: "src/Items/Liquids.c",
        lineNumber: 339,
      },
    },
    p1: {
      type: "Integer",
      description: "Depth in tiles (0 = default of 4 tiles)",
      codeSample: {
        code: "depth = itemPtr->parm[1];",
        fileName: "src/Items/Liquids.c",
        lineNumber: 340,
      },
    },
    p2: {
      type: "Integer",
      description: "Y offset (×4 world units) or Y table index when p3 bit 2 is set",
      codeSample: {
        code: "y = GetTerrainHeightAtCoord(x,z,FLOOR)+yOff;\t\t// get y coord of patch",
        fileName: "src/Items/Liquids.c",
        lineNumber: 333,
      },
    },
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Tesselate flag",
          codeSample: {
            code: "tesselateFlag = itemPtr->parm[3] & 1; // get tesselate flag",
            fileName: "src/Items/Liquids.c",
            lineNumber: 280,
          },
        },
        {
          index: 1,
          description: "Put underground flag (Anthill level)",
          codeSample: {
            code: "putUnderGround = itemPtr->parm[3] & (1<<1); // get underground flag",
            fileName: "src/Items/Liquids.c",
            lineNumber: 281,
          },
        },
        {
          index: 2,
          description: "Use indexed Y mode (p2 is table index instead of offset)",
          codeSample: {
            code: "y = yTable[itemPtr->parm[2]];\t\t\t\t\t// get y from table\t\t",
            fileName: "src/Items/Liquids.c",
            lineNumber: 321,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_FireAnt]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add flag (ignore other conditions)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) // see if always add",
            fileName: "src/Enemies/Enemy_FireAnt.c",
            lineNumber: 96,
          },
        },
      ],
    },
  },
  [ItemType.WaterBug]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Initial aim (0-15, counter-clockwise).",
      codeSample: {
        code: "newObj->Rot.y = (float)itemPtr->parm[0] * (PI2/16.0f);",
        fileName: "src/Ride/WaterBug.c",
        lineNumber: 86,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Tree]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.DragonFly]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Initial aim (0-15, clockwise).",
      codeSample: {
        code: "newObj->Rot.y = (float)itemPtr->parm[0] * -(PI2/16.0f);",
        fileName: "src/Ride/DragonFly.c",
        lineNumber: 102,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.CatTail]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.DuckWeed]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.LilyFlower]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.LilyPad]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.PondGrass]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Pond grass variant (0-2)",
      codeSample: {
        code: 'if (itemPtr->parm[0] > 2)\n\tDoFatalAlert("AddPondGrass:parm[0] out of range!");\ngNewObjectDefinition.type = POND_MObjType_PondGrass + itemPtr->parm[0];',
        fileName: "src/Items/Items.c",
        lineNumber: 956,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Reed]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Reed variant (0-1)",
      codeSample: {
        code: 'if (itemPtr->parm[0] > 1)\n\tDoFatalAlert("AddReed:parm[0] out of range!");\ngNewObjectDefinition.type = POND_MObjType_Reed + itemPtr->parm[0];',
        fileName: "src/Items/Items.c",
        lineNumber: 994,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_PondFish]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.HoneycombPlatform]: {
    flags: "Unknown",
    p0: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Is metal platform (vs brick)",
          codeSample: {
            code: "Boolean\t\t\tisMetal = itemPtr->parm[0] & 1;",
            fileName: "src/Items/Triggers.c",
            lineNumber: 443,
          },
        },
      ],
    },
    p1: {
      type: "Integer",
      description: "Height level (0 = default height of 11)",
      codeSample: {
        code: "if (itemPtr->parm[1] == 0)\n  h = 11;\nelse\n  h = itemPtr->parm[1];",
        fileName: "src/Items/Triggers.c",
        lineNumber: 447,
      },
    },
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 1,
          description: "Is small platform",
          codeSample: {
            code: "Boolean\t\t\tisSmall = itemPtr->parm[3] & (1<<1);",
            fileName: "src/Items/Triggers.c",
            lineNumber: 444,
          },
        },
      ],
    },
  },
  [ItemType.HoneyPatch]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Width in tiles (0 = default of 4 tiles)",
      codeSample: {
        code: "width = itemPtr->parm[0];\t\t\t\t\t\t\t\t// get width & depth of water patch",
        fileName: "src/Items/Liquids.c",
        lineNumber: 839,
      },
    },
    p1: {
      type: "Integer",
      description: "Depth in tiles (0 = default of 4 tiles)",
      codeSample: {
        code: "depth = itemPtr->parm[1];",
        fileName: "src/Items/Liquids.c",
        lineNumber: 840,
      },
    },
    p2: {
      type: "Integer",
      description: "Y offset (×10 world units) or Y table index when p3 bit 0 is set",
      codeSample: {
        code: "y = GetTerrainHeightAtCoord(x,z,FLOOR)+yOff;\t\t// get y coord of patch",
        fileName: "src/Items/Liquids.c",
        lineNumber: 836,
      },
    },
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Use indexed Y mode (p2 is table index instead of offset)",
          codeSample: {
            code: "y = gLiquidYTable[kind][itemPtr->parm[2]];\t\t\t// get y from table",
            fileName: "src/Items/Liquids.c",
            lineNumber: 828,
          },
        },
      ],
    },
  },
  [ItemType.Firecracker]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Firecracker type (for hive: ID#, for night: cherry bomb type)",
      codeSample: {
        code: "id = itemPtr->parm[0];							// get ID #",
        fileName: "src/Items/Items2.c",
        lineNumber: 80,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Detonator]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Detonator ID used by linked nuts and hive doors.",
      codeSample: {
        code: "newObj->DetonatorID = itemPtr->parm[0];",
        fileName: "src/Items/Triggers.c",
        lineNumber: 646,
      },
    },
    p1: {
      type: "Integer",
      description: "Detonator color (0=green, 1=orange, 2=purple, 3=red, 4=teal).",
      codeSample: {
        code: "gNewObjectDefinition.type = HIVE_MObjType_DetonatorGreen + itemPtr->parm[1];",
        fileName: "src/Items/Triggers.c",
        lineNumber: 641,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.HiveDoor]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Detonator ID that opens this hive door.",
      codeSample: {
        code: "newObj->DetonatorID = itemPtr->parm[0];",
        fileName: "src/Items/Items2.c",
        lineNumber: 286,
      },
    },
    p1: {
      type: "Integer",
      description: "Door orientation (0-3, where each unit = 90°).",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI/2);",
        fileName: "src/Items/Items2.c",
        lineNumber: 282,
      },
    },
    p2: {
      type: "Integer",
      description: "Door color (0=green, 1=orange, 2=purple, 3=red, 4=teal).",
      codeSample: {
        code: "gNewObjectDefinition.type = HIVE_MObjType_HiveDoor_Green + itemPtr->parm[2];",
        fileName: "src/Items/Items2.c",
        lineNumber: 280,
      },
    },
    p3: "Unused",
  },
  [ItemType.Enemy_Mosquito]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Checkpoint]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Checkpoint number",
      codeSample: {
        code: "int		checkpointNum = itemPtr->parm[0];",
        fileName: "src/Items/Triggers2.c",
        lineNumber: 69,
      },
    },
    p1: {
      type: "Integer",
      description:
        "Player rotation when respawning (0-3, where each unit = 90°)",
      codeSample: {
        code: "droplet->PlayerRot = (float)itemPtr->parm[1] * (PI2/4);",
        fileName: "src/Items/Triggers2.c",
        lineNumber: 129,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.LawnDoor]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Key ID / door color index.",
      codeSample: {
        code: "gNewObjectDefinition.type = LAWN1_MObjType_Door_Green + itemPtr->parm[0];",
        fileName: "src/Items/Triggers.c",
        lineNumber: 774,
      },
    },
    p1: {
      type: "Integer",
      description: "Door orientation (0-3, where each unit = 90°).",
      codeSample: {
        code: "Byte aim = itemPtr->parm[1];",
        fileName: "src/Items/Triggers.c",
        lineNumber: 762,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Dock]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Foot]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Spider]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Caterpiller]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.FireFly]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Target ID number (which FireFly target location to fly to)",
      codeSample: {
        code: "newObj->FireFlyTargetID = itemPtr->parm[0]; // get target ID #",
        fileName: "src/Enemies/Enemy_FireFly.c",
        lineNumber: 129,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.ExitLog]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "Byte		rot = itemPtr->parm[0];",
        fileName: "src/Items/Triggers2.c",
        lineNumber: 245,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.RootSwing]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Root orientation (0-8, where each unit = 40°).",
      codeSample: {
        code: "r = itemPtr->parm[0] * (PI2/9.0f);",
        fileName: "src/Items/Items2.c",
        lineNumber: 549,
      },
    },
    p1: {
      type: "Integer",
      description: "Animation sync offset (0-3).",
      codeSample: {
        code: "newObj->SwingIndex = itemPtr->parm[1] * (PI2/4);",
        fileName: "src/Items/Items2.c",
        lineNumber: 575,
      },
    },
    p2: {
      type: "Integer",
      description: "Additional scale factor; final scale is 1.4 + p2*0.3.",
      codeSample: {
        code: "gNewObjectDefinition.scale = 1.4f + ((float)itemPtr->parm[2] * .3f);",
        fileName: "src/Items/Items2.c",
        lineNumber: 559,
      },
    },
    p3: "Unused",
  },
  [ItemType.Thorn]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.FireFlyTargetLocation]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.FireWall]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Linked valve ID.",
      codeSample: {
        code: "newObj->ValveID = itemPtr->parm[0];",
        fileName: "src/Items/Traps.c",
        lineNumber: 757,
      },
    },
    p1: {
      type: "Integer",
      description: "Axis/orientation selector (0=-, 1=\\\\, 2=|).",
      codeSample: {
        code: "newObj->FireWallType = itemPtr->parm[1];",
        fileName: "src/Items/Traps.c",
        lineNumber: 758,
      },
    },
    p2: {
      type: "Integer",
      description: "Width in tiles (0 uses the source default width).",
      codeSample: {
        code: "newObj->FireWallWidth = itemPtr->parm[2];",
        fileName: "src/Items/Traps.c",
        lineNumber: 759,
      },
    },
    p3: "Unused",
  },
  [ItemType.WaterValve]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.HoneyTube]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Tube type (0=bent, 1=remapped to straight, 2=straight, 3=taper).",
      codeSample: {
        code: "if (type == 1)\n\ttype = 2;",
        fileName: "src/Items/Items2.c",
        lineNumber: 774,
      },
    },
    p1: {
      type: "Integer",
      description: "Tube orientation (0-3, where each unit = 90°).",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI/2);",
        fileName: "src/Items/Items2.c",
        lineNumber: 792,
      },
    },
    p2: {
      type: "Integer",
      description: "Tube size factor; final scale is 3 * (1 + p2*0.5).",
      codeSample: {
        code: "gNewObjectDefinition.scale = 3.0f * (1.0f + itemPtr->parm[2] * .5f);",
        fileName: "src/Items/Items2.c",
        lineNumber: 781,
      },
    },
    p3: "Unused",
  },
  [ItemType.Enemy_Larva]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_FlyingBee]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Height offset (0=default 600 units, other values = value × 100 units)",
      codeSample: {
        code: "if (itemPtr->parm[0] == 0)\n  newObj->Coord.y += 600.0f; // raise off ground\nelse\n  newObj->Coord.y += (float)itemPtr->parm[0] * 100.0f;",
        fileName: "src/Enemies/Enemy_Bee_Flying.c",
        lineNumber: 117,
      },
    },
    p1: {
      type: "Integer",
      description: "Detonator ID (for hive levels with keyed enemies)",
      codeSample: {
        code: "if (!gDetonatorBlown[itemPtr->parm[1]])						// see if detonator has been triggered",
        fileName: "src/Enemies/Enemy_Bee_Flying.c",
        lineNumber: 99,
      },
    },
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Keyed to detonator (for hive levels)",
          codeSample: {
            code: "if (itemPtr->parm[3] & 1)										// see if we care",
            fileName: "src/Enemies/Enemy_Bee_Flying.c",
            lineNumber: 97,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_WorkerBee]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Detonator ID (for hive levels with keyed enemies)",
      codeSample: {
        code: "if (!gDetonatorBlown[itemPtr->parm[0]])									// see if detonator has been triggered",
        fileName: "src/Enemies/Enemy_WorkerBee.c",
        lineNumber: 105,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Keyed to detonator",
          codeSample: {
            code: "if (itemPtr->parm[3] & 1)										// see if we care",
            fileName: "src/Enemies/Enemy_WorkerBee.c",
            lineNumber: 103,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_QueenBee]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Queen bee base number (queen is at base #0)",
      codeSample: {
        code: "if (itemPtr->parm[0] != 0)			// queen is at base #0",
        fileName: "src/Enemies/Enemy_QueenBee.c",
        lineNumber: 114,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.RockLedge]: {
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
  [ItemType.RollingBoulder]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Roach]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add flag (ignore other conditions)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) // see if always add",
            fileName: "src/Enemies/Enemy_Roach.c",
            lineNumber: 90,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_Skippy]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SlimePatch]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Width in tiles (0 = default of 4 tiles)",
      codeSample: {
        code: "width = itemPtr->parm[0];								// get width & depth of water patch",
        fileName: "src/Items/Liquids.c",
        lineNumber: 839,
      },
    },
    p1: {
      type: "Integer",
      description: "Depth in tiles (0 = default of 4 tiles)",
      codeSample: {
        code: "depth = itemPtr->parm[1];",
        fileName: "src/Items/Liquids.c",
        lineNumber: 840,
      },
    },
    p2: {
      type: "Integer",
      description: "Y offset (×10 world units) or Y table index when p3 bit 0 is set",
      codeSample: {
        code: "y = GetTerrainHeightAtCoord(x,z,FLOOR)+yOff;		// get y coord of patch",
        fileName: "src/Items/Liquids.c",
        lineNumber: 836,
      },
    },
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Use indexed Y mode (p2 is table index instead of offset)",
          codeSample: {
            code: "y = gLiquidYTable[kind][itemPtr->parm[2]];			// get y from table",
            fileName: "src/Items/Liquids.c",
            lineNumber: 828,
          },
        },
      ],
    },
  },
  [ItemType.LavaPatch]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Width in tiles (0 = default of 4 tiles)",
      codeSample: {
        code: "width = itemPtr->parm[0];								// get width & depth of water patch",
        fileName: "src/Items/Liquids.c",
        lineNumber: 839,
      },
    },
    p1: {
      type: "Integer",
      description: "Depth in tiles (0 = default of 4 tiles)",
      codeSample: {
        code: "depth = itemPtr->parm[1];",
        fileName: "src/Items/Liquids.c",
        lineNumber: 840,
      },
    },
    p2: {
      type: "Integer",
      description: "Y offset (×10 world units) or Y table index when p3 bit 0 is set",
      codeSample: {
        code: "y = GetTerrainHeightAtCoord(x,z,FLOOR)+yOff;		// get y coord of patch",
        fileName: "src/Items/Liquids.c",
        lineNumber: 836,
      },
    },
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Use indexed Y mode (p2 is table index instead of offset)",
          codeSample: {
            code: "y = gLiquidYTable[kind][itemPtr->parm[2]];			// get y from table",
            fileName: "src/Items/Liquids.c",
            lineNumber: 828,
          },
        },
      ],
    },
  },
  [ItemType.BentAntPipe]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Pipe rotation (counter-clockwise quarter turns).",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI/2);",
        fileName: "src/Items/Items.c",
        lineNumber: 1049,
      },
    },
    p1: {
      type: "Integer",
      description: "Linked valve ID for spew logic.",
      codeSample: {
        code: "newObj->ValveID = itemPtr->parm[1];",
        fileName: "src/Items/Items.c",
        lineNumber: 1068,
      },
    },
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Spew only when the linked valve is open.",
          codeSample: {
            code: "newObj->SpewWater = itemPtr->parm[3] & (1<<0);",
            fileName: "src/Items/Items.c",
            lineNumber: 1069,
          },
        },
        {
          index: 1,
          description: "Always spew water.",
          codeSample: {
            code: "newObj->AlwaysSpew = itemPtr->parm[3] & (1<<1);",
            fileName: "src/Items/Items.c",
            lineNumber: 1070,
          },
        },
      ],
    },
  },
  [ItemType.HorizAntPipe]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Pipe rotation (counter-clockwise quarter turns).",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI/2);",
        fileName: "src/Items/Items.c",
        lineNumber: 1107,
      },
    },
    p1: {
      type: "Integer",
      description: "Height step; raises the pipe by p1*10 units.",
      codeSample: {
        code: "gNewObjectDefinition.coord.y += (float)itemPtr->parm[1] * 10.0f;",
        fileName: "src/Items/Items.c",
        lineNumber: 1113,
      },
    },
    p2: {
      type: "Integer",
      description: "Linked valve ID for spew logic.",
      codeSample: {
        code: "newObj->ValveID = itemPtr->parm[2];",
        fileName: "src/Items/Items.c",
        lineNumber: 1130,
      },
    },
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Spew only when the linked valve is open.",
          codeSample: {
            code: "newObj->SpewWater = itemPtr->parm[3] & (1<<0);",
            fileName: "src/Items/Items.c",
            lineNumber: 1131,
          },
        },
        {
          index: 1,
          description: "Always spew water.",
          codeSample: {
            code: "newObj->AlwaysSpew = itemPtr->parm[3] & (1<<1);",
            fileName: "src/Items/Items.c",
            lineNumber: 1132,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_KingAnt]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Integer",
      description:
        "King Ant type flag (if any bits set, this isn't the real King)",
      codeSample: {
        code: "if (itemPtr->parm[3])			// if any bits set then this isnt the real Queen",
        fileName: "src/Enemies/Enemy_KingAnt.c",
        lineNumber: 106,
      },
    },
  },
  [ItemType.Faucet]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.WoodPost]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.FloorSpike]: {
    flags: "Unknown",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.KingWaterPipe]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Pipe ID number",
      codeSample: {
        code: "newObj->PipeID = itemPtr->parm[0]; // get pipe ID#",
        fileName: "src/Items/Triggers2.c",
        lineNumber: 477,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
};

export const bugdomItemTypeParams = defineItemParams(
  "bugdom",
  bugdomItemTypeParamsSource,
);
