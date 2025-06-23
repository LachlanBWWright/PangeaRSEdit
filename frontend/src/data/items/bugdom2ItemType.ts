import { ItemParams } from "./itemParams";

export enum ItemType {
  StartCoords, // My Start Coords
  Snail, // snail
  SprinklerHead, // sprinkler head
  Butterfly, // butterfly pow
  Enemy_Gnome, // gnome
  Daisy, // daisy
  Grass, // grass
  SnailShell, // snail shell
  Tulip, // tulip
  Acorn, // acorn
  Enemy_HouseFly, // 10: housefly
  Scarecrow, // 11: scarecrow
  Enemy_EvilPlant, // 12: evil plant
  Door, // 13: lawn door
  RideBall, // 14: ride ball
  BowlingMarble, // 15: bowling marble
  BowlingPins, // 16: bowling pins
  Brick, // 17: brick
  Post, // 18: post
  Chipmunk, // 19: chipmunk
  ShrubRoot, // 20: shrub root
  Pebble, // 21: pebble
  SnakeGenerator, // 22: snake generator
  PoolCoping, // 23: pool coping
  PoolLeaf, // 24: pool leaf
  NilAdd, // 25: ??????
  SquishBerry, // 26: squish berry
  DogHouse, // 27: dog house
  Windmill, // 28: windmill
  Rose, // 29: rose
  TulipPot, // 30: tulip pot
  BeachBall, // 31: beach ball
  ChlorineFloat, // 32: chlorine float
  PoolRingFloat, // 33: pool ring float
  DrainPipe, // 34: drain pipe
  POW, // 35: powerup
  Firecracker, // 36: firecracker
  GlassBottle, // 37: glass bottle
  Enemy_Flea, // 38: flea enemy
  Enemy_Tick, // 39: tick enemy
  SlotCar, // 40: slot car
  LetterBlock, // 41: letter block
  MouseTrap, // 42: mouse trap
  Enemy_ToySoldier, // 43: toy solider
  FinishLine, // 44: finish line
  Enemy_Otto, // 45: otto enemy
  Puzzle, // 46: puzzle
  LegoWall, // 47: lego wall
  FlashLight, // 48: flashlight
  DCell, // 49: d-cell
  Crayon, // 50: crayon
  AntHill, // 51: ant hill
  Enemy_Dragonfly, // 52: dragonfly
  Cloud, // 53: cloud
  Enemy_Frog, // 54: frog
  CardboardBox, // 55: box
  Trampoline, // 56: trampoline
  MothBall, // 57: moth ball
  Vaccum, // 58: vacuume
  ClosetWall, // 59: pci card
  Enemy_Moth, // 60: moth
  Enemy_ComputerBug, // 61: computer bug
  SiliconPart, // 62: silicon part
  NilAdd2,
  BookStack, // 64: book stack
  Enemy_Roach, // 65: roach enemy
  ShoeBox, // 66: shoe box
  PictureFrame, // 67: picture frame
  Enemy_Ant, // 68: ant enemy
  Enemy_PondFish, // 69: fish enemy
  LilyPad, // 70: lily pad
  CatTail, // 71: cat tail
  Bubbler, // 72: bubbler
  PlatformFlower, // 73: platform flower
  FishingLure, // 74: fishing lure
  Silverware, // 75: silvereware
  PicnicBasket, // 76: picnic basket
  Kindling, // 77: kindling
  BeeHive, // 78: bee hive
  SodaCan, // 79: soda can
  Veggie, // 80: veggies
  Jar, // 81: jar
  TinCan, // 82: tin can
  Detergent, // 83: detergent
  BoxWall, // 84: box wall
  GliderPart, // 85: glider part
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "Start Coords",
  [ItemType.Snail]: "Snail",
  [ItemType.SprinklerHead]: "Sprinkler Head",
  [ItemType.Butterfly]: "Butterfly",
  [ItemType.Enemy_Gnome]: "Gnome",
  [ItemType.Daisy]: "Daisy",
  [ItemType.Grass]: "Grass",
  [ItemType.SnailShell]: "Snail Shell",
  [ItemType.Tulip]: "Tulip",
  [ItemType.Acorn]: "Acorn",
  [ItemType.Enemy_HouseFly]: "House Fly",
  [ItemType.Scarecrow]: "Scarecrow",
  [ItemType.Enemy_EvilPlant]: "Evil Plant",
  [ItemType.Door]: "Lawn Door",
  [ItemType.RideBall]: "Ride Ball",
  [ItemType.BowlingMarble]: "Bowling Marble",
  [ItemType.BowlingPins]: "Bowling Pins",
  [ItemType.Brick]: "Brick",
  [ItemType.Post]: "Post",
  [ItemType.Chipmunk]: "Chipmunk",
  [ItemType.ShrubRoot]: "Shrub Root",
  [ItemType.Pebble]: "Pebble",
  [ItemType.SnakeGenerator]: "Snake Generator",
  [ItemType.PoolCoping]: "Pool Coping",
  [ItemType.PoolLeaf]: "Pool Leaf",
  [ItemType.NilAdd]: "Nil Add",
  [ItemType.SquishBerry]: "Squish Berry",
  [ItemType.DogHouse]: "Dog House",
  [ItemType.Windmill]: "Windmill",
  [ItemType.Rose]: "Rose",
  [ItemType.TulipPot]: "Tulip Pot",
  [ItemType.BeachBall]: "Beach Ball",
  [ItemType.ChlorineFloat]: "Chlorine Float",
  [ItemType.PoolRingFloat]: "Pool Ring Float",
  [ItemType.DrainPipe]: "Drain Pipe",
  [ItemType.POW]: "Powerup",
  [ItemType.Firecracker]: "Firecracker",
  [ItemType.GlassBottle]: "Glass Bottle",
  [ItemType.Enemy_Flea]: "Flea Enemy",
  [ItemType.Enemy_Tick]: "Tick Enemy",
  [ItemType.SlotCar]: "Slot Car",
  [ItemType.LetterBlock]: "Letter Block",
  [ItemType.MouseTrap]: "Mouse Trap",
  [ItemType.Enemy_ToySoldier]: "Toy Soldier",
  [ItemType.FinishLine]: "Finish Line",
  [ItemType.Enemy_Otto]: "Otto Enemy",
  [ItemType.Puzzle]: "Puzzle",
  [ItemType.LegoWall]: "Lego Wall",
  [ItemType.FlashLight]: "Flashlight",
  [ItemType.DCell]: "D-cell",
  [ItemType.Crayon]: "Crayon",
  [ItemType.AntHill]: "Ant Hill",
  [ItemType.Enemy_Dragonfly]: "Dragonfly Enemy",
  [ItemType.Cloud]: "Cloud",
  [ItemType.Enemy_Frog]: "Frog Enemy",
  [ItemType.CardboardBox]: "Cardboard Box",
  [ItemType.Trampoline]: "Trampoline",
  [ItemType.MothBall]: "Moth Ball",
  [ItemType.Vaccum]: "Vacuum",
  [ItemType.ClosetWall]: "PCI Card",
  [ItemType.Enemy_Moth]: "Moth Enemy",
  [ItemType.Enemy_ComputerBug]: "Computer Bug Enemy",
  [ItemType.SiliconPart]: "Silicon Part",
  [ItemType.NilAdd2]: "Nil Add 2",
  [ItemType.BookStack]: "Book Stack",
  [ItemType.Enemy_Roach]: "Roach Enemy",
  [ItemType.ShoeBox]: "Shoe Box",
  [ItemType.PictureFrame]: "Picture Frame",
  [ItemType.Enemy_Ant]: "Ant Enemy",
  [ItemType.Enemy_PondFish]: "Pond Fish Enemy",
  [ItemType.LilyPad]: "Lily Pad",
  [ItemType.CatTail]: "Cat Tail",
  [ItemType.Bubbler]: "Bubbler",
  [ItemType.PlatformFlower]: "Platform Flower",
  [ItemType.FishingLure]: "Fishing Lure",
  [ItemType.Silverware]: "Silverware",
  [ItemType.PicnicBasket]: "Picnic Basket",
  [ItemType.Kindling]: "Kindling",
  [ItemType.BeeHive]: "Bee Hive",
  [ItemType.SodaCan]: "Soda Can",
  [ItemType.Veggie]: "Veggie",
  [ItemType.Jar]: "Jar",
  [ItemType.TinCan]: "Tin Can",
  [ItemType.Detergent]: "Detergent",
  [ItemType.BoxWall]: "Box Wall",
  [ItemType.GliderPart]: "Glider Part",
};

export type Bugdom2ItemParams = ItemParams;

const bugdom2DefaultParams: Bugdom2ItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

export const bugdom2ItemTypeParams: Record<ItemType, Bugdom2ItemParams> = {
  [ItemType.StartCoords]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Starting rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gPlayerInfo.startRotY = (float)itemPtr[i].parm[0] * (PI2/8.0f);	// calc starting rotation aim",
        fileName: "Source/Terrain/Terrain2.c",
        lineNumber: 242,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Snail]: {
    flags: "ITEM_FLAGS_USER1: Task completed (head attached)",
    p0: {
      type: "Integer",
      description: "Snail kind (0-19)",
      codeSample: {
        code: "int snailKind = itemPtr->parm[0];\nif (snailKind > 19) return(true);",
        fileName: "Source/Items/Snails.c",
        lineNumber: 86,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "snail = MakeSnail(SNAIL_SLOT, x, z, snailKind, itemPtr->parm[2], itemPtr->parm[1], taskCompleted);\ngNewObjectDefinition.rot = (float)rot * (PI2/8);",
        fileName: "Source/Items/Snails.c",
        lineNumber: 95,
      },
    },
    p2: {
      type: "Integer",
      description: "Key color (if applicable)",
      codeSample: {
        code: "snail = MakeSnail(SNAIL_SLOT, x, z, snailKind, itemPtr->parm[2], itemPtr->parm[1], taskCompleted);\nsnail->KeyColor = keyColor;",
        fileName: "Source/Items/Snails.c",
        lineNumber: 95,
      },
    },
    p3: "Unknown",
  },
  [ItemType.SprinklerHead]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Sprinkler rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = itemPtr->parm[0] * (PI/2);",
        fileName: "Source/Items/Traps.c",
        lineNumber: 121,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Butterfly]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "POW kind (0-12)",
      codeSample: {
        code: "pow = MakePOW(itemPtr->parm[0], &where);",
        fileName: "Source/Items/Powerups.c",
        lineNumber: 585,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Regenerating POW",
          codeSample: {
            code: "body->Regenerate = itemPtr->parm[3] & 1; // see if regenerating kind",
            fileName: "Source/Items/Powerups.c",
            lineNumber: 88,
          },
        },
        {
          index: 1,
          description: "Place up high (garbage level)",
          codeSample: {
            code: "Boolean upHigh = itemPtr->parm[3] & (1<<1);\nif (upHigh) yOff = 1100.0f; else yOff = 150.0f;",
            fileName: "Source/Items/Powerups.c",
            lineNumber: 54,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_Gnome]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add (ignore max enemy limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) {\n    if (gNumEnemyOfKind[ENEMY_KIND_GNOME] >= MAX_GNOMES)\n        return(false);\n}",
            fileName: "Source/Enemies/Enemy_Gnome.c",
            lineNumber: 94,
          },
        },
      ],
    },
  },
  [ItemType.Daisy]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Daisy type (0-2)",
      codeSample: {
        code: "gNewObjectDefinition.type = FOLIAGE_ObjType_Daisy1 + itemPtr->parm[0];",
        fileName: "Source/Items/Items.c",
        lineNumber: 181,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Grass]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Grass type (0-2)",
      codeSample: {
        code: "gNewObjectDefinition.type = FOLIAGE_ObjType_Grass1 + itemPtr->parm[0];",
        fileName: "Source/Items/Items.c",
        lineNumber: 299,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.SnailShell]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Shell rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI/2);",
        fileName: "Source/Items/Snails.c",
        lineNumber: 677,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Tulip]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Tulip type (0-2)",
      codeSample: {
        code: "gNewObjectDefinition.type = FOLIAGE_ObjType_Tulip1 + itemPtr->parm[0];",
        fileName: "Source/Items/Items.c",
        lineNumber: 234,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Acorn]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Acorn type (0-2: green, blue, or gold)",
      codeSample: {
        code: "int type = itemPtr->parm[0];\nif (type > 2) return(true);\nnewObj->CloverType = type;",
        fileName: "Source/Items/Pickups.c",
        lineNumber: 288,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_HouseFly]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Always add (ignore max enemy limit)" }],
    },
  },
  [ItemType.Scarecrow]: {
    flags: "ITEM_FLAGS_USER1: Task completed (head attached)",
    p0: {
      type: "Integer",
      description: "Scarecrow part (0 = body, 1 = head separately)",
      codeSample: {
        code: "if (itemPtr->parm[0] == 0) {\n    /* MAIN BODY */\n    gNewObjectDefinition.type = GARDEN_ObjType_ScarecrowBody;",
        fileName: "Source/Items/Snails.c",
        lineNumber: 809,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_EvilPlant]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Door]: {
    flags: "ITEM_FLAGS_USER1: Door is open",
    p0: {
      type: "Integer",
      description: "Door rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "if (isOpen)\n    gNewObjectDefinition.rot = itemPtr->parm[0] * PI/2 + PI/2;\nelse\n    gNewObjectDefinition.rot = itemPtr->parm[0] * PI/2;",
        fileName: "Source/Items/Items.c",
        lineNumber: 424,
      },
    },
    p1: {
      type: "Integer",
      description: "Door color",
      codeSample: {
        code: "int doorColor = itemPtr->parm[1];\ngNewObjectDefinition.type = ... + doorColor;",
        fileName: "Source/Items/Items.c",
        lineNumber: 364,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.RideBall]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Ball rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/8.0f);",
        fileName: "Source/Player/RideBall.c",
        lineNumber: 64,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BowlingMarble]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BowlingPins]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Pin arrangement rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "OGLMatrix3x3_SetRotate(&m, (float)itemPtr->parm[0] * (PI2/8));",
        fileName: "Source/Items/Snails.c",
        lineNumber: 1333,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Brick]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Brick rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * PI/2;",
        fileName: "Source/Items/Items.c",
        lineNumber: 530,
      },
    },
    p1: {
      type: "Integer",
      description: "Brick type (varies by level)",
      codeSample: {
        code: "gNewObjectDefinition.type = GARDEN_ObjType_Brick; // or SIDEWALK_ObjType_Brick depending on level",
        fileName: "Source/Items/Items.c",
        lineNumber: 517,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Post]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Post type (varies by level: brick/block/grass etc.)",
      codeSample: {
        code: "int type = itemPtr->parm[0];\ngNewObjectDefinition.type = GARDEN_ObjType_Post_Brick + type;",
        fileName: "Source/Items/Items.c",
        lineNumber: 561,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Chipmunk]: {
    flags: "ITEM_FLAGS_USER1: Task completed (inactive)",
    p0: {
      type: "Integer",
      description: "Chipmunk rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * PI2/8;",
        fileName: "Source/Items/Chipmunk.c",
        lineNumber: 130,
      },
    },
    p1: {
      type: "Integer",
      description: "Chipmunk kind (see CHIPMUNK_KIND_* constants)",
      codeSample: {
        code: "int kind = itemPtr->parm[1];\nnewObj->Kind = kind;",
        fileName: "Source/Items/Chipmunk.c",
        lineNumber: 81,
      },
    },
    p2: {
      type: "Integer",
      description: "Checkpoint number (if kind == CHIPMUNK_KIND_CHECKPOINT)",
      codeSample: {
        code: "if (kind == CHIPMUNK_KIND_CHECKPOINT)\n    newObj->CheckPointNum = itemPtr->parm[2];",
        fileName: "Source/Items/Chipmunk.c",
        lineNumber: 134,
      },
    },
    p3: "Unknown",
  },
  [ItemType.ShrubRoot]: {
    flags: "Unknown",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Pebble]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Stone type",
      codeSample: {
        code: "gNewObjectDefinition.type = GARDEN_ObjType_LargeStone + itemPtr->parm[0];",
        fileName: "Source/Items/Items.c",
        lineNumber: 678,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.SnakeGenerator]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Unused",
      codeSample: {
        code: "Boolean AddSnakeGenerator(TerrainItemEntryType *itemPtr, float x, float z)",
        fileName: "Source/Enemies/Enemy_Snake.c",
        lineNumber: 161,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.PoolCoping]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Pool coping rotation (0-3)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/4.0f);",
        fileName: "Source/Items/Items.c",
        lineNumber: 728,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Is corner piece",
          codeSample: {
            code: "Boolean isCorner = itemPtr->parm[3] & 1;",
            fileName: "Source/Items/Items.c",
            lineNumber: 721,
          },
        },
      ],
    },
  },
  [ItemType.PoolLeaf]: {
    flags: "Unknown",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Has key",
          codeSample: {
            code: "if (itemPtr->parm[3] & 1) { /* PUT KEY ON LEAF */ }",
            fileName: "Source/Items/Items.c",
            lineNumber: 783,
          },
        },
      ],
    },
  },
  [ItemType.NilAdd]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SquishBerry]: {
    flags: "ITEM_FLAGS_USER1: Is squished (shows as splat)",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.DogHouse]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Dog house rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = PI + ((float)itemPtr->parm[0] * (PI2/4));",
        fileName: "Source/Items/Items.c",
        lineNumber: 872,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Windmill]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Windmill rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "float r = itemPtr->parm[0] * (PI2/4.0f);\ngNewObjectDefinition.rot = r;",
        fileName: "Source/Items/Traps.c",
        lineNumber: 273,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Rose]: {
    flags: "Unknown",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.TulipPot]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Pot rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/4);",
        fileName: "Source/Items/Items.c",
        lineNumber: 950,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BeachBall]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.ChlorineFloat]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.PoolRingFloat]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.DrainPipe]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.POW]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "POW type",
      codeSample: {
        code: "pow = MakePOW(itemPtr->parm[0], &where);",
        fileName: "Source/Items/Powerups.c",
        lineNumber: 585,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Firecracker]: {
    flags: "Unknown",
    p0: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Build 2 collision boxes",
          codeSample: {
            code: "if (itemPtr->parm[0] & 1) { /* build 2 collision boxes */ }",
            fileName: "Source/Items/Traps.c",
            lineNumber: 327,
          },
        },
      ],
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Is primed",
          codeSample: {
            code: "Boolean primed = itemPtr->parm[3] & 0x1;",
            fileName: "Source/Items/Traps.c",
            lineNumber: 723,
          },
        },
        {
          index: 1,
          description: "Is drowning",
          codeSample: {
            code: "Boolean drowning = itemPtr->parm[3] & (1<<1);",
            fileName: "Source/Items/Traps.c",
            lineNumber: 724,
          },
        },
      ],
    },
  },
  [ItemType.GlassBottle]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Flea]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Always add (ignore max enemy limit)" }],
    },
  },
  [ItemType.Enemy_Tick]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Unused",
      codeSample: {
        code: "Boolean AddEnemy_Tick(TerrainItemEntryType *itemPtr, float x, float z)",
        fileName: "Source/Enemies/Enemy_Tick.c",
        lineNumber: 108,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SlotCar]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Car number (0 = red, 1 = blue)",
      codeSample: {
        code: "int carNum = itemPtr->parm[0];\nGAME_ASSERT(carNum == 0 || carNum == 1);\ngNewObjectDefinition.type = PLAYROOM_ObjType_SlotCarRed + carNum;",
        fileName: "Source/Items/SlotCar.c",
        lineNumber: 81,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.LetterBlock]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Letter block type (affects model)",
      codeSample: {
        code: "gNewObjectDefinition.type = PLAYROOM_ObjType_LetterBlock1 + itemPtr->parm[0];",
        fileName: "Source/Items/Items2.c",
        lineNumber: 27,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.MouseTrap]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Trap rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = r = (float)itemPtr->parm[0] * (PI / 2);",
        fileName: "Source/Items/Traps.c",
        lineNumber: 749,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_ToySoldier]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Unused",
      codeSample: {
        code: "Boolean AddEnemy_ToySoldier(TerrainItemEntryType *itemPtr, float x, float z)",
        fileName: "Source/Enemies/Enemy_ToySoldier.c",
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
          description: "Always add (ignore max enemy limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) {\n    if (gNumEnemyOfKind[ENEMY_KIND_TOYSOLDIER] >= MAX_TOYSOLDIERS)\n        return(false);\n}",
            fileName: "Source/Enemies/Enemy_ToySoldier.c",
            lineNumber: 112,
          },
        },
      ],
    },
  },
  [ItemType.FinishLine]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Finish line rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI/2);",
        fileName: "Source/Items/SlotCar.c",
        lineNumber: 878,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Otto]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Always add (ignore max enemy limit)" }],
    },
  },
  [ItemType.Puzzle]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Puzzle part (0 = main puzzle base, 1+ = individual pieces)",
      codeSample: {
        code: "int part = itemPtr->parm[0];\nif (part == 0) {\n    gNewObjectDefinition.type = PLAYROOM_ObjType_PuzzleMain;",
        fileName: "Source/Items/Snails2.c",
        lineNumber: 52,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.LegoWall]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Wall/brick type (0 = full wall, 1-5 = individual brick types)",
      codeSample: {
        code: "int type = itemPtr->parm[0];\nif (type > 5) return(true);\nif (type == 0) {\n    gNewObjectDefinition.type = PLAYROOM_ObjType_LegoWall;\n} else {\n    gNewObjectDefinition.type = PLAYROOM_ObjType_LegoWall + type;\n}",
        fileName: "Source/Items/Items2.c",
        lineNumber: 369,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "int r = itemPtr->parm[1];\ngNewObjectDefinition.rot = (float)r * (PI/2);",
        fileName: "Source/Items/Items2.c",
        lineNumber: 372,
      },
    },
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Choose random color brick (for brick types only)",
          codeSample: {
            code: "if (itemPtr->parm[3] & 1) gNewObjectDefinition.type = PLAYROOM_ObjType_LegoBrick_Red + RandomRange(0, 4);",
            fileName: "Source/Items/Items2.c",
            lineNumber: 410,
          },
        },
      ],
    },
  },
  [ItemType.FlashLight]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Flashlight rotation (0-3, where each unit = 90°)",
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.DCell]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Crayon]: {
    flags: "Unknown",
    p0: { type: "Integer", description: "Crayon type" },
    p1: {
      type: "Integer",
      description: "Crayon rotation (0-3, where each unit = 90°)",
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.AntHill]: {
    flags: "ITEM_FLAGS_USER1: Hill is blown up",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Dragonfly]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Always add (ignore max enemy limit)" }],
    },
  },
  [ItemType.Cloud]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Frog]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Always add (ignore max enemy limit)" }],
    },
  },
  [ItemType.CardboardBox]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Box type (0-3, affects model)",
      codeSample: {
        code: "int type = itemPtr->parm[0];\nif (type > 3) return(true);\ngNewObjectDefinition.type = CLOSET_ObjType_CardboardBox1 + type;",
        fileName: "Source/Items/Items2.c",
        lineNumber: 693,
      },
    },
    p1: {
      type: "Integer",
      description: "Stack level",
      codeSample: {
        code: "int stackLevel = itemPtr->parm[1];",
        fileName: "Source/Items/Items2.c",
        lineNumber: 692,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Trampoline]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.MothBall]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Vaccum]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.ClosetWall]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/4);",
        fileName: "Source/Items/Items2.c",
        lineNumber: 796,
      },
    },
    p1: {
      type: "Integer",
      description: "Wall type (0 = PCI Card, 1-2 = Book stacks)",
      codeSample: {
        code: "int type = itemPtr->parm[1];\nif (type > 2) return(true);\ngNewObjectDefinition.type = CLOSET_ObjType_PCICard + type;",
        fileName: "Source/Items/Items2.c",
        lineNumber: 779,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Moth]: {
    flags: "Unknown",
    p0: { type: "Integer", description: "Moth target ID or path number" },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Is target moth" }],
    },
  },
  [ItemType.Enemy_ComputerBug]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Always add (ignore max enemy limit)" }],
    },
  },
  [ItemType.SiliconPart]: bugdom2DefaultParams,
  [ItemType.NilAdd2]: bugdom2DefaultParams,
  [ItemType.BookStack]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Book stack type (0-2: flat book, tall book, tall stack)",
      codeSample: {
        code: "int type = itemPtr->parm[0];\nif (type > 2) return(true);\ngNewObjectDefinition.type = CLOSET_ObjType_FlatBook + type;",
        fileName: "Source/Items/Items2.c",
        lineNumber: 814,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI2/4);",
        fileName: "Source/Items/Items2.c",
        lineNumber: 831,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Roach]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Unused",
      codeSample: {
        code: "Boolean AddEnemy_Roach(TerrainItemEntryType *itemPtr, float x, float z)",
        fileName: "Source/Enemies/Enemy_Roach.c",
        lineNumber: 125,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add (ignore max enemy limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) {\n    if (gNumEnemyOfKind[ENEMY_KIND_ROACH] >= MAX_ROACHS)\n        return(false);\n}",
            fileName: "Source/Enemies/Enemy_Roach.c",
            lineNumber: 132,
          },
        },
      ],
    },
  },
  [ItemType.ShoeBox]: {
    flags: "Unknown",
    p0: { type: "Integer", description: "Shoe box type" },
    p1: { type: "Integer", description: "Stack level" },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.PictureFrame]: {
    flags: "Unknown",
    p0: { type: "Integer", description: "Picture type (affects model)" },
    p1: {
      type: "Integer",
      description: "Picture rotation (0-3, where each unit = 90°)",
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Ant]: {
    flags: "Unknown",
    p0: { type: "Integer", description: "Food type" },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Always add (ignore max enemy limit)" }],
    },
  },
  [ItemType.Enemy_PondFish]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Unused",
      codeSample: {
        code: "Boolean AddEnemy_PondFish(TerrainItemEntryType *itemPtr, float x, float z)",
        fileName: "Source/Enemies/Enemy_PondFish.c",
        lineNumber: 101,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.LilyPad]: bugdom2DefaultParams,
  [ItemType.CatTail]: bugdom2DefaultParams,
  [ItemType.Bubbler]: bugdom2DefaultParams,
  [ItemType.PlatformFlower]: bugdom2DefaultParams,
  [ItemType.FishingLure]: bugdom2DefaultParams,
  [ItemType.Silverware]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Silverware type (0 = fork, 1 = knife, 2 = spoon)",
      codeSample: {
        code: "gNewObjectDefinition.type = PARK_ObjType_Fork + itemPtr->parm[0];",
        fileName: "Source/Items/Items2.c",
        lineNumber: 1301,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI2/4);",
        fileName: "Source/Items/Items2.c",
        lineNumber: 1309,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.PicnicBasket]: bugdom2DefaultParams,
  [ItemType.Kindling]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Kindling part (0 = leaf, 1 = twig)",
      codeSample: {
        code: "gNewObjectDefinition.type = PARK_ObjType_Leaf + part;",
        fileName: "Source/Items/BeeHive.c",
        lineNumber: 239,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BeeHive]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Bee hive part (0 or 1)",
      codeSample: {
        code: "gNewObjectDefinition.type = PARK_ObjType_Hive;",
        fileName: "Source/Items/BeeHive.c",
        lineNumber: 58,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SodaCan]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Unknown",
      codeSample: {
        code: "gNewObjectDefinition.type = GARBAGE_ObjType_Can;",
        fileName: "Source/Items/Items3.c",
        lineNumber: 67,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Veggie]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Vegetable type",
      codeSample: {
        code: "int type = itemPtr->parm[0];\nif (type > 3) return(true);\ngNewObjectDefinition.type = GARBAGE_ObjType_Banana + type;",
        fileName: "Source/Items/Items3.c",
        lineNumber: 362,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Jar]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Jar type (0-1)",
      codeSample: {
        code: "int type = itemPtr->parm[0];\nif (type > 1) return(true);\ngNewObjectDefinition.type = GARBAGE_ObjType_Jar + type;",
        fileName: "Source/Items/Items3.c",
        lineNumber: 409,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.TinCan]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Tin can type",
      codeSample: {
        code: "int type = itemPtr->parm[0];\nif (type > 1) return(true);\ngNewObjectDefinition.type = GARBAGE_ObjType_TinCan;",
        fileName: "Source/Items/Items3.c",
        lineNumber: 457,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Detergent]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/4);",
        fileName: "Source/Items/Items3.c",
        lineNumber: 528,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.BoxWall]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, where each unit = 90°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/4);",
        fileName: "Source/Items/Items3.c",
        lineNumber: 571,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.GliderPart]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Glider part (0 or 1)",
      codeSample: {
        code: "int part = itemPtr->parm[0];\ngNewObjectDefinition.type = GARBAGE_ObjType_Glider + part;",
        fileName: "Source/Items/Items3.c",
        lineNumber: 601,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
};
