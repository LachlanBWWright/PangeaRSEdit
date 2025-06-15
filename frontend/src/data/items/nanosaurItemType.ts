import { ItemParams } from "./itemParams";

export enum ItemType {
  StartCoords, // My Start Coords
  PowerUp, // 1: PowerUp
  Enemy_Tricer, // 2: Triceratops enemy
  Enemy_Rex, // 3: Rex enemy
  LavaPatch, // 4: Lava patch
  Egg, // Egg
  GasVent, // 6:	Gas vent
  Enemy_Ptera, // 7: Pteranodon enemy
  Enemy_Stego, // 8:  Stegosaurus enemy
  TimePortal, // 9: time portal
  Tree, // 10: tree
  Boulder, // 11: boulder
  Mushroom, // 12: mushroom
  Bush, // 13: bush
  WaterPatch, // 14: water patch
  Crystal, // 15: crystal
  Enemy_Spitter, // 16: spitter enemy
  StepStone, // 17: step stone
  RollingBoulder, // 18: rolling boulder
  SporePod, // 19: spore pod
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "My Start Coords",
  [ItemType.PowerUp]: "PowerUp",
  [ItemType.Enemy_Tricer]: "Triceratops enemy",
  [ItemType.Enemy_Rex]: "Rex enemy",
  [ItemType.LavaPatch]: "Lava patch",
  [ItemType.Egg]: "Egg",
  [ItemType.GasVent]: "Gas vent",
  [ItemType.Enemy_Ptera]: "Pteranodon enemy",
  [ItemType.Enemy_Stego]: "Stegosaurus enemy",
  [ItemType.TimePortal]: "Time portal",
  [ItemType.Tree]: "Tree",
  [ItemType.Boulder]: "Boulder",
  [ItemType.Mushroom]: "Mushroom",
  [ItemType.Bush]: "Bush",
  [ItemType.WaterPatch]: "Water patch",
  [ItemType.Crystal]: "Crystal",
  [ItemType.Enemy_Spitter]: "Spitter enemy",
  [ItemType.StepStone]: "Step stone",
  [ItemType.RollingBoulder]: "Rolling boulder",
  [ItemType.SporePod]: "Spore pod",
};

export type NanosaurItemParams = ItemParams;

export const nanosaurItemTypeParams: Record<ItemType, NanosaurItemParams> = {
  [ItemType.StartCoords]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Starting aim/rotation (0-7, where each unit = 45°)",
      codeSample: {
        code: "gMyStartAim = gMasterItemList[i].parm[0]; // get aim 0..7",
        fileName: "src/Terrain/Terrain2.c",
        lineNumber: 174,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.PowerUp]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Power-up type (0=HeatSeek, 1=Laser, 2=TriBlast, 3=Health, 4=Shield, 5=Nuke, 6=Sonic)",
      codeSample: {
        code: "n = itemPtr->parm[0]; // parm0 = powerup type\nshort types[] = {GLOBAL_MObjType_HeatSeekPOW,GLOBAL_MObjType_LaserPOW,GLOBAL_MObjType_TriBlastPOW,GLOBAL_MObjType_HealthPOW,GLOBAL_MObjType_ShieldPOW,GLOBAL_MObjType_NukePOW,GLOBAL_MObjType_Sonic};",
        fileName: "src/Items/Triggers.c",
        lineNumber: 242,
      },
    },
    p1: {
      type: "Integer",
      description: "Quantity (0 = default amount for the power-up type)",
      codeSample: {
        code: "newObj->PowerUpQuan = itemPtr->parm[1]; // remember quantity",
        fileName: "src/Items/Triggers.c",
        lineNumber: 270,
      },
    },
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Tricer]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add flag (bypass enemy count limits)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) // see if always add\n  if (gNumEnemyOfKind[ENEMY_KIND_TRICER] >= MAX_TRICER)\n    return(false);",
            fileName: "src/Enemies/Enemy_TriCer.c",
            lineNumber: 93,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_Rex]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add flag (bypass enemy count limits)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) // see if always add\n  if (gNumEnemyOfKind[ENEMY_KIND_REX] >= MAX_REX)\n    return(false);",
            fileName: "src/Enemies/Enemy_Rex.c",
            lineNumber: 83,
          },
        },
      ],
    },
  },
  [ItemType.LavaPatch]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Auto Y positioning (follow terrain height vs fixed Y)",
          codeSample: {
            code: "if (itemPtr->parm[3] & 1)\n  y = GetTerrainHeightAtCoord_Planar(x,z)+LAVA_Y_OFFSET;\nelse\n  y = FIXED_LAVA_Y;",
            fileName: "src/Items/Items.c",
            lineNumber: 98,
          },
        },
        {
          index: 1,
          description: "Shoot fireballs",
          codeSample: {
            code: "newObj->ShootFireballs = itemPtr->parm[3] & (1<<1); // see if shoot fireballs",
            fileName: "src/Items/Items.c",
            lineNumber: 128,
          },
        },
        {
          index: 2,
          description: "Half size (1.0x scale vs 2.0x scale)",
          codeSample: {
            code: "if (itemPtr->parm[3] & (1<<2)) // see if to 1/2 size\n  gNewObjectDefinition.scale = 1.0;\nelse\n  gNewObjectDefinition.scale = 2.0;",
            fileName: "src/Items/Items.c",
            lineNumber: 115,
          },
        },
      ],
    },
  },
  [ItemType.Egg]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Egg species type (0-NUM_EGG_SPECIES)",
      codeSample: {
        code: "if (itemPtr->parm[0] >= NUM_EGG_SPECIES) // make sure egg type is legal\n  return(true);\ngNewObjectDefinition.type = LEVEL0_MObjType_Egg1 + itemPtr->parm[0];",
        fileName: "src/Items/Pickups.c",
        lineNumber: 54,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Has nest (egg comes with a nest object)",
          codeSample: {
            code: "if (itemPtr->parm[3] & 1) // see if has nest\n  MakeEggNest(x,z);",
            fileName: "src/Items/Pickups.c",
            lineNumber: 94,
          },
        },
      ],
    },
  },
  [ItemType.GasVent]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Auto Y positioning (follow terrain height)",
          codeSample: {
            code: "if (itemPtr->parm[3] & 1)\n  y = GetTerrainHeightAtCoord_Planar(x,z);",
            fileName: "src/Items/Items.c",
            lineNumber: 316,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_Ptera]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add flag (bypass enemy count limits)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) // see if always add\n  if (gNumEnemyOfKind[ENEMY_KIND_PTERA] >= MAX_PTERA)\n    return(false);",
            fileName: "src/Enemies/Enemy_Ptera.c",
            lineNumber: 80,
          },
        },
        {
          index: 1,
          description: "Rock dropper (pteranodon carries and drops rocks)",
          codeSample: {
            code: "newObj->RockDropper = itemPtr->parm[3] & (1<<1);\nif (newObj->RockDropper) {\n  AttachARock(newObj);\n  SetSkeletonAnim(newObj->Skeleton, PTERA_ANIM_CARRY);\n}",
            fileName: "src/Enemies/Enemy_Ptera.c",
            lineNumber: 97,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_Stego]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add flag (bypass enemy count limits)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) // see if always add\n  if (gNumEnemyOfKind[ENEMY_KIND_STEGO] >= MAX_STEGO)\n    return(false);",
            fileName: "src/Enemies/Enemy_Stego.c",
            lineNumber: 70,
          },
        },
      ],
    },
  },
  [ItemType.TimePortal]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Tree]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description:
        "Tree type (0=Fern, 1=StickPalm, 2=Bamboo, 3=Cypress, 4=MainPalm, 5=PinePalm)",
      codeSample: {
        code: "i = itemPtr->parm[0]; // get tree type\nif ((i < 0) || (i > 5)) // verify it\n  return(true);\ngNewObjectDefinition.type = LEVEL0_MObjType_Tree1 + i;",
        fileName: "src/Items/Items.c",
        lineNumber: 410,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Boulder]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Mushroom]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Bush]: {
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
    p3: "Unknown",
  },
  [ItemType.Crystal]: {
    flags: "Unknown",
    p0: {
      type: "Integer",
      description: "Crystal type (0-2, different crystal variants)",
      codeSample: {
        code: "n = itemPtr->parm[0]; // parm0 = crystal type\nif ((n < 0) || (n > 2)) // verify crystal type\n  return(true);\nshort types[] = {LEVEL0_MObjType_Crystal1,LEVEL0_MObjType_Crystal2,LEVEL0_MObjType_Crystal3};",
        fileName: "src/Items/Triggers.c",
        lineNumber: 373,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.Enemy_Spitter]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add flag (bypass enemy count limits)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) // see if always add\n  if (gNumEnemyOfKind[ENEMY_KIND_SPITTER] >= MAX_SPITTER)\n    return(false);",
            fileName: "src/Enemies/Enemy_Spitter.c",
            lineNumber: 78,
          },
        },
      ],
    },
  },
  [ItemType.StepStone]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description:
            "Reincarnate (step stone respawns after being destroyed)",
          codeSample: {
            code: "newObj->StepStoneReincarnate = itemPtr->parm[3] & 1; // see if reincarnate",
            fileName: "src/Items/Triggers.c",
            lineNumber: 495,
          },
        },
      ],
    },
  },
  [ItemType.RollingBoulder]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
  [ItemType.SporePod]: {
    flags: "Unknown",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
};
