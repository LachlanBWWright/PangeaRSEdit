import { ItemParams } from "./itemParams";

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

export type BugdomItemParams = ItemParams;

export const bugdomItemTypeParams: Record<ItemType, BugdomItemParams> = {
  [ItemType.StartCoords]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Starting aim/rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gMyStartAim = itemPtr[i].parm[0]; // get aim 0..7\ngCheckPointRot = (float)(gMyStartAim/2) * (PI2/4);",
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
        code: "newObj->KeyNum = theNut->NutParm1; // key ID# is stored here\ntype = keyTypes[gLevelType] + theNut->NutParm1; // NutParm1 has key ID #",
        fileName: "src/Items/Triggers.c",
        lineNumber: 1099,
      },
    },
    p2: {
      type: "Integer",
      description:
        "Detonator ID - for hive levels, specifies which detonator can blow up this nut",
      codeSample: {
        code: "id = itemPtr->parm[2]; // get detonator id\nnewObj->NutDetonatorID = id; // remember detonator ID",
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
            code: "canBlow = itemPtr->parm[3] & (1<<1); // see if can blow\nnewObj->DetonateNut = canBlow; // remember if get detonated",
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
    p0: "Unknown",
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
        code: "rockThrower = itemPtr->parm[0] == 1; // see if rock thrower\nnewObj->RockThrower = rockThrower;",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
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
          description: "Put underground flag",
          codeSample: {
            code: "putUnderGround = itemPtr->parm[3] & (1<<1); // get underground flag",
            fileName: "src/Items/Liquids.c",
            lineNumber: 281,
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Reed]: {
    flags: "Unknown",
    p0: "Unknown",
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
            code: "Boolean isMetal = itemPtr->parm[0] & 1;\ngNewObjectDefinition.type = HIVE_MObjType_BrickPlatform + (int)isMetal;",
            fileName: "src/Items/Triggers.c",
            lineNumber: 444,
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
            code: "Boolean isSmall = itemPtr->parm[3] & (1<<1);",
            fileName: "src/Items/Triggers.c",
            lineNumber: 445,
          },
        },
      ],
    },
  },
  [ItemType.HoneyPatch]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Firecracker]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Firecracker type (for hive: ID#, for night: cherry bomb type)",
      codeSample: {
        code: "id = itemPtr->parm[0]; // get ID # (hive)\n// or\ngNewObjectDefinition.type = NIGHT_MObjType_CherryBomb + itemPtr->parm[0]; // (night)",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.HiveDoor]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
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
        code: "int checkpointNum = itemPtr->parm[0];\ndroplet->CheckPointNum = itemPtr->parm[0]; // save checkpoint #",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
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
        code: "Byte rot = itemPtr->parm[0];\ngNewObjectDefinition.rot = rot * (PI/2);",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
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
        code: "if (!gDetonatorBlown[itemPtr->parm[1]]) // see if detonator has been triggered\n  return(false);",
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
            code: "if (itemPtr->parm[3] & 1) // see if we care\n  if (!gDetonatorBlown[itemPtr->parm[1]]) // see if detonator has been triggered",
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
        code: "if (!gDetonatorBlown[itemPtr->parm[0]]) // see if detonator has been triggered\n  return(false);",
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
            code: "if (itemPtr->parm[3] & 1) // see if we care\n  if (!gDetonatorBlown[itemPtr->parm[0]]) // see if detonator has been triggered",
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
        code: "if (itemPtr->parm[0] != 0) // queen is at base #0\n  return(false);",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.LavaPatch]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BentAntPipe]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.HorizAntPipe]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
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
        code: "if (itemPtr->parm[3]) // if any bits set then this isnt the real King\n  return(false);",
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
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Rotation flag",
          codeSample: {
            code: "if (itemPtr->parm[3] & 1) // get rotation",
            fileName: "src/Items/Traps.c",
            lineNumber: 531,
          },
        },
      ],
    },
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
