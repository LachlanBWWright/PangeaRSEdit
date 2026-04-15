/**
 * Per-game level type enums for all 8 Pangea games.
 *
 * Each enum value corresponds to the 0-based (or 1-based for CroMag) level
 * index used by the game's WASM runtime and level-number arrays.
 */

export enum OttoLevelType {
  EarthFarm = 0,
  BlobWorld = 1,
  BlobBoss = 2,
  Apocalypse = 3,
  Cloud = 4,
  Jungle = 5,
  JungleBoss = 6,
  FireIce = 7,
  Saucer = 8,
  BrainBoss = 9,
}

export enum BugdomLevelType {
  Training = 0,
  Lawn = 1,
  Pond = 2,
  Forest = 3,
  HiveAttack = 4,
  BeeHive = 5,
  QueenBee = 6,
  NightAttack = 7,
  AntHill = 8,
  AntKing = 9,
}

export enum Bugdom2LevelType {
  Garden = 0,
  SlimePit = 1,
  GarbageCan = 2,
  Culvert = 3,
  Closet = 4,
  Attic = 5,
  Basement = 6,
  GarbageDump = 7,
  Kingdom = 8,
  FinalBattle = 9,
}

export enum NanosaurLevelType {
  Nanosaur = 0,
}

export enum Nanosaur2LevelType {
  Level1 = 0,
  Level2 = 1,
  Level3 = 2,
  Level4 = 3,
  Level5 = 4,
  Level6 = 5,
  Level7 = 6,
  Level8 = 7,
  Level9 = 8,
}

/** CroMag Rally uses 1-based track numbers. */
export enum CroMagLevelType {
  StoneAgeSpeedway = 1,
  IceAgeRally = 2,
  LavaLand = 3,
  JungleJoyride = 4,
  Track5 = 5,
  Track6 = 6,
  Track7 = 7,
  Track8 = 8,
  Track9 = 9,
  Track10 = 10,
  Track11 = 11,
  Track12 = 12,
  Track13 = 13,
  Track14 = 14,
  Track15 = 15,
  Track16 = 16,
  Track17 = 17,
}

export enum BillyFrontierLevelType {
  TownDuel1 = 0,
  TownShootout = 1,
  TownDuel2 = 2,
  TownStampede = 3,
  TownDuel3 = 4,
  TargetPractice1 = 5,
  SwampDuel1 = 6,
  SwampShootout = 7,
  SwampDuel2 = 8,
  SwampStampede = 9,
  SwampDuel3 = 10,
  TargetPractice2 = 11,
}

export enum MightyMikeLevelType {
  Level1 = 0,
  Level2 = 1,
  Level3 = 2,
  Level4 = 3,
  Level5 = 4,
  Level6 = 5,
  Level7 = 6,
  Level8 = 7,
  Level9 = 8,
  Level10 = 9,
}
