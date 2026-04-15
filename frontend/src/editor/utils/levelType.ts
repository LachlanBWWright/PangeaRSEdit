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
  Adventure1 = 0,
  Adventure2 = 1,
  Adventure3 = 2,
  Race1 = 3,
  Race2 = 4,
  Battle1 = 5,
  Battle2 = 6,
  Flag1 = 7,
  Flag2 = 8,
}

/** CroMag Rally uses 1-based track numbers (?track=N). Internally 0-based: Desert=0 … Ramps=16. */
export enum CroMagLevelType {
  // Stone Age
  Desert = 1,
  Jungle = 2,
  Ice = 3,
  // Bronze Age
  Crete = 4,
  China = 5,
  Egypt = 6,
  // Iron Age
  Europe = 7,
  Scandinavia = 8,
  Atlantis = 9,
  // Battle arenas
  Stonehenge = 10,
  Aztec = 11,
  Coliseum = 12,
  Maze = 13,
  Celtic = 14,
  TarPits = 15,
  Spiral = 16,
  Ramps = 17,
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
  // Scene 0: Jurassic
  Jurassic1 = 0,
  Jurassic2 = 1,
  Jurassic3 = 2,
  // Scene 1: Candy
  Candy1 = 3,
  Candy2 = 4,
  Candy3 = 5,
  // Scene 2: Fairy
  Fairy1 = 6,
  Fairy2 = 7,
  Fairy3 = 8,
  // Scene 3: Clown
  Clown1 = 9,
  Clown2 = 10,
  Clown3 = 11,
  // Scene 4: Bargain
  Bargain1 = 12,
  Bargain2 = 13,
  Bargain3 = 14,
}
