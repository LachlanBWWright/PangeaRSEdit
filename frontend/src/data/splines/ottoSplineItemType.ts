import { ItemParams } from "../items/itemParams";

export enum SplineItemType {
  Human = 4, // 4: human
  BrainAlien = 7, // 7:  brain alien
  Onion = 8, // 8:  onion
  Corn = 9, // 9:  corn
  Tomato = 10, // 10: tomato
  MagnetMonster = 35, // 35: magnet monster
  MovingPlatform = 40, // 40: moving platform
  Flamester = 49, // 49: flamester
  GiantLizard = 50, // 50: giant lizard
  Mantis = 52, // 52: mantis
  Mutant = 59, // 59:
  MutantRobot = 60, // 60:
  HumanScientist = 61, // 61:  scientist human
  Clown = 78, // 78:	clown enemy
  ClownFish = 79, // 79: clown fish
  StrongMan = 81, // 81: strongman
  JawsBot = 89, // 89: jawsbot enemy
  IceCube = 92, // 92:	ice cube enemy
  HammerBot = 93, // 93:	hammer bot enemy
  DrillBot = 94, // 94:  drill bot
  SwingerBot = 95, // 95:  swinger bot
  LavaPlatform = 98, // 98:	lava platform
  RailGun = 103, // 103: rail gun
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.Human]: "Human",
  [SplineItemType.BrainAlien]: "Brain Alien",
  [SplineItemType.Onion]: "Onion",
  [SplineItemType.Corn]: "Corn",
  [SplineItemType.Tomato]: "Tomato",
  [SplineItemType.MagnetMonster]: "Magnet Monster",
  [SplineItemType.MovingPlatform]: "Moving Platform",
  [SplineItemType.Flamester]: "Flamester",
  [SplineItemType.GiantLizard]: "Giant Lizard",
  [SplineItemType.Mantis]: "Mantis",
  [SplineItemType.Mutant]: "Mutant",
  [SplineItemType.MutantRobot]: "Mutant Robot",
  [SplineItemType.HumanScientist]: "Scientist Human",
  [SplineItemType.Clown]: "Clown",
  [SplineItemType.ClownFish]: "Clown Fish",
  [SplineItemType.StrongMan]: "Strongman",
  [SplineItemType.JawsBot]: "Jawsbot",
  [SplineItemType.IceCube]: "Ice Cube",
  [SplineItemType.HammerBot]: "Hammer Bot",
  [SplineItemType.DrillBot]: "Drill Bot",
  [SplineItemType.SwingerBot]: "Swinger Bot",
  [SplineItemType.LavaPlatform]: "Lava Platform",
  [SplineItemType.RailGun]: "Rail Gun",
};

// Parameter descriptions for each spline item type
export const ottoSplineItemTypeParams: Record<SplineItemType, ItemParams> = {
  [SplineItemType.Human]: {
    flags: "Spline item flags",
    p0: {
      type: "Integer",
      description:
        "Human type: 0=Farmer, 1=Bee Woman, 2=Scientist, 3=Skirt Lady",
      codeSample: {
        code: "Byte humanType = itemPtr->parm[0];\n// ...\nswitch (humanType)\n{\n    case HUMAN_TYPE_FARMER:     return SKELETON_TYPE_FARMER;\n    case HUMAN_TYPE_BEEWOMAN:   return SKELETON_TYPE_BEEWOMAN;\n    case HUMAN_TYPE_SCIENTIST:  return SKELETON_TYPE_SCIENTIST;\n    case HUMAN_TYPE_SKIRTLADY:  return SKELETON_TYPE_SKIRTLADY;\n}",
        fileName: "Humans.c",
        lineNumber: 250,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.BrainAlien]: {
    flags: "Movement and behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.Onion]: {
    flags: "Onion enemy behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.Corn]: {
    flags: "Corn enemy behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.Tomato]: {
    flags: "Tomato enemy behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.MagnetMonster]: {
    flags: "Magnet monster behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.MovingPlatform]: {
    flags: "Platform movement and behavior flags",
    p0: {
      type: "Integer",
      description:
        "Platform type/color: 0=Blue moving platform, 1=Red moving platform",
      codeSample: {
        code: "int type = itemPtr->parm[0];\n// ...\ngNewObjectDefinition.type = BLOBBOSS_ObjType_MovingPlatform_Blue + type;",
        fileName: "Items.c",
        lineNumber: 1582,
      },
    },
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.Flamester]: {
    flags: "Flamester enemy behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.GiantLizard]: {
    flags: "Giant lizard behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.Mantis]: {
    flags: "Mantis enemy behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.Mutant]: {
    flags: "Mutant enemy behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.MutantRobot]: {
    flags: "Mutant robot behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.HumanScientist]: {
    flags: "Scientist behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.Clown]: {
    flags: "Clown enemy behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.ClownFish]: {
    flags: "Clown fish behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.StrongMan]: {
    flags: "Strongman behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.JawsBot]: {
    flags: "JawsBot behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.IceCube]: {
    flags: "Ice cube behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.HammerBot]: {
    flags: "Hammer bot behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.DrillBot]: {
    flags: "Drill bot behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.SwingerBot]: {
    flags: "Swinger bot behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },

  [SplineItemType.LavaPlatform]: {
    flags: "Lava platform behavior flags",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },

  [SplineItemType.RailGun]: {
    flags: "Rail gun behavior flags",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: "Unknown",
  },
};

export type OttoSplineItemParams = ItemParams;

/* 

		NilPrime,							// My Start Coords
		NilPrime,
		NilPrime,
		NilPrime,							// 3: squooshy enemy
		PrimeHuman,							// 4: human
		NilPrime,
		NilPrime,
		PrimeEnemy_BrainAlien,				// 7:  brain alien
		PrimeEnemy_Onion,					// 8:  onion
		PrimeEnemy_Corn,					// 9:  corn
		PrimeEnemy_Tomato,					// 10: tomato
		NilPrime,							// 11:
		NilPrime,							// 12:
		NilPrime,							// 13:
		NilPrime,							// 14:
		NilPrime,							// 15:
		NilPrime,							// 16:
		NilPrime,							// 17:
		NilPrime,							// 18:
		NilPrime,							// 19:
		NilPrime,							// 20:
		NilPrime,							// 21:
		NilPrime,							// 22:
		NilPrime,							// 23:
		NilPrime,							// 24:
		NilPrime,							// 25:
		NilPrime,							// 26:
		NilPrime,							// 27:
		NilPrime,							// 28:
		NilPrime,							// 29:
		NilPrime,							// 30:
		NilPrime,							// 31:
		NilPrime,							// 32:
		NilPrime,							// 33:
		NilPrime,							// 34:
		PrimeMagnetMonster,					// 35: magnet monster
		NilPrime,							// 36:
		NilPrime,							// 37:
		NilPrime,							// 38:
		NilPrime,							// 39:
		PrimeMovingPlatform,				// 40: moving platform
		NilPrime,							// 41:
		NilPrime,							// 42:
		NilPrime,							// 43:
		NilPrime,							// 44:
		NilPrime,							// 45:
		NilPrime,							// 46:
		NilPrime,							// 47:
		NilPrime,							// 48:
		PrimeEnemy_Flamester,				// 49: flamester
		PrimeEnemy_GiantLizard,				// 50: giant lizard
		NilPrime,							// 51:
		PrimeEnemy_Mantis,					// 52: mantis
		NilPrime,							// 53:
		NilPrime,							// 54:
		NilPrime,							// 55:
		NilPrime,							// 56:
		NilPrime,							// 57:
		NilPrime,							// 58:
		PrimeEnemy_Mutant,					// 59:
		PrimeEnemy_MutantRobot,				// 60:
		PrimeHumanScientist,				// 61:  scientist human
		NilPrime,							// 62:  proximity mine
		NilPrime,							// 63:  lamp posts
		NilPrime,							// 64:  debris gate
		NilPrime,							// 65:  grave stone
		NilPrime,							// 66:  crashed ship
		NilPrime,							// 67:  chain reacting mine
		NilPrime,							// 68:  rubble
		NilPrime,							// 69:  teleporter map (UNUSED)
		NilPrime,							// 70:  green steam
		NilPrime,							// 71:  tentacle generator
		NilPrime,							// 72:  pitcher plant boss
		NilPrime,							// 73:  pitcher pod
		NilPrime,							// 74:  tractor beam post
		NilPrime,							// 75:  cannon
		NilPrime,							// 76:  bumper car
		NilPrime,							// 77:	tire bumper
		PrimeEnemy_Clown,					// 78:	clown enemy
		PrimeEnemy_ClownFish,				// 79: clown fish
		NilPrime,							// 80:
		PrimeEnemy_StrongMan,				// 81: strongman
		NilPrime,							// 82:
		NilPrime,							// 83:
		NilPrime,							// 84:
		NilPrime,							// 85:
		NilPrime,							// 86:
		NilPrime,							// 87:
		NilPrime,							// 88:
		PrimeEnemy_JawsBot,					// 89: jawsbot enemy
		NilPrime,							// 90:
		NilPrime,							// 91:
		PrimeEnemy_IceCube,					// 92:	ice cube enemy
		PrimeEnemy_HammerBot,				// 93:	hammer bot enemy
		PrimeEnemy_DrillBot,				// 94:  drill bot
		PrimeEnemy_SwingerBot,				// 95:  swinger bot
		NilPrime,							// 96:
		NilPrime,							// 97:
		PrimeLavaPlatform,					// 98:	lava platform
		NilPrime,							// 99:
		NilPrime,							// 100:
		NilPrime,							// 101:
		NilPrime,							// 102:
		PrimeRailGun,						// 103: rail gun

*/
