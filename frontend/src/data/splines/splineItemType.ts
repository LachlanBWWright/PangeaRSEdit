export enum SplineItemType {
  PrimeHuman = 4, // 4: human
  PrimeEnemy_BrainAlien = 7, // 7:  brain alien
  PrimeEnemy_Onion = 8, // 8:  onion
  PrimeEnemy_Corn = 9, // 9:  corn
  PrimeEnemy_Tomato = 10, // 10: tomato
  PrimeMagnetMonster = 35, // 35: magnet monster
  PrimeMovingPlatform = 40, // 40: moving platform
  PrimeEnemy_Flamester = 49, // 49: flamester
  PrimeEnemy_GiantLizard = 50, // 50: giant lizard
  PrimeEnemy_Mantis = 52, // 52: mantis
  PrimeEnemy_Mutant = 59, // 59:
  PrimeEnemy_MutantRobot = 60, // 60:
  PrimeHumanScientist = 61, // 61:  scientist human
  PrimeEnemy_Clown = 78, // 78:	clown enemy
  PrimeEnemy_ClownFish = 79, // 79: clown fish
  PrimeEnemy_StrongMan = 81, // 81: strongman
  PrimeEnemy_JawsBot = 89, // 89: jawsbot enemy
  PrimeEnemy_IceCube = 92, // 92:	ice cube enemy
  PrimeEnemy_HammerBot = 93, // 93:	hammer bot enemy
  PrimeEnemy_DrillBot = 94, // 94:  drill bot
  PrimeEnemy_SwingerBot = 95, // 95:  swinger bot
  PrimeLavaPlatform = 98, // 98:	lava platform
  PrimeRailGun = 103, // 103: rail gun
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.PrimeHuman]: "Human",
  [SplineItemType.PrimeEnemy_BrainAlien]: "Brain Alien",
  [SplineItemType.PrimeEnemy_Onion]: "Onion",
  [SplineItemType.PrimeEnemy_Corn]: "Corn",
  [SplineItemType.PrimeEnemy_Tomato]: "Tomato",
  [SplineItemType.PrimeMagnetMonster]: "Magnet Monster",
  [SplineItemType.PrimeMovingPlatform]: "Moving Platform",
  [SplineItemType.PrimeEnemy_Flamester]: "Flamester",
  [SplineItemType.PrimeEnemy_GiantLizard]: "Giant Lizard",
  [SplineItemType.PrimeEnemy_Mantis]: "Mantis",
  [SplineItemType.PrimeEnemy_Mutant]: "Mutant",
  [SplineItemType.PrimeEnemy_MutantRobot]: "Mutant Robot",
  [SplineItemType.PrimeHumanScientist]: "Scientist Human",
  [SplineItemType.PrimeEnemy_Clown]: "Clown",
  [SplineItemType.PrimeEnemy_ClownFish]: "Clown Fish",
  [SplineItemType.PrimeEnemy_StrongMan]: "Strongman",
  [SplineItemType.PrimeEnemy_JawsBot]: "Jawsbot",
  [SplineItemType.PrimeEnemy_IceCube]: "Ice Cube",
  [SplineItemType.PrimeEnemy_HammerBot]: "Hammer Bot",
  [SplineItemType.PrimeEnemy_DrillBot]: "Drill Bot",
  [SplineItemType.PrimeEnemy_SwingerBot]: "Swinger Bot",
  [SplineItemType.PrimeLavaPlatform]: "Lava Platform",
  [SplineItemType.PrimeRailGun]: "Rail Gun",
};

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
