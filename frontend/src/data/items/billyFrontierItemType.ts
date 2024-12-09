export enum ItemType {
  StartCoords, // My Start Coords
  Dueler, // 1: dueler
  Building, // 2: building
  HeadStone, // 3: headstone
  Plant, // 4: plant
  DuelRockWall, // 5: rockwall
  Coffin, // 6: coffin
  FrogMan_Shootout, // 7: frogman enemy
  Bandito_Shootout, // 8: bandito shootout
  Barrel, // 9: barrel
  WoodCrate, // 10: wood crate
  HayBale, // 11: hay bale
  ShootoutSaloon, // 12: shooutout saloon
  ShootoutAlley, // 13: shootout alley
  Post, // 14: post
  Flame, // 15: flames
  Smoker, // 16: smoker
  SceneryKangaCow, // 17: kanga cow
  Table, // 18: table
  Chair, // 19: chair
  StampedeKanga, // 20: stampede kanga
  Boost, // 21: boost
  StampedeCamera, // 22: stampede camera
  Wallker, // 23: walker
  DeadTree, // 24: dead tree
  Rock, // 25: canyon rock
  ElectricFence, // 26: electric fence
  Tumbleweed, // 27: tumbleweed
  TremorGrave, // 28: swamp grave
  TeePee, // 29: tee pee
  SwampCabin, // 30: swamp cabin
  TremorAlien_Shootout, // 31: tremor alien
  FreeLifePOW, // 32: free life POW
  SpearSkull, // 33: spear skull
  StampedeKangarex, // 34: stampede kangarex
  Shorty_Shootout, // 35: shorty shootout
  Peso, // 36: peso
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "My Start Coords",
  [ItemType.Dueler]: "Dueler",
  [ItemType.Building]: "Building",
  [ItemType.HeadStone]: "HeadStone",
  [ItemType.Plant]: "Plant",
  [ItemType.DuelRockWall]: "DuelRockWall",
  [ItemType.Coffin]: "Coffin",
  [ItemType.FrogMan_Shootout]: "FrogMan_Shootout",
  [ItemType.Bandito_Shootout]: "Bandito_Shootout",
  [ItemType.Barrel]: "Barrel",
  [ItemType.WoodCrate]: "WoodCrate",
  [ItemType.HayBale]: "HayBale",
  [ItemType.ShootoutSaloon]: "ShootoutSaloon",
  [ItemType.ShootoutAlley]: "ShootoutAlley",
  [ItemType.Post]: "Post",
  [ItemType.Flame]: "Flame",
  [ItemType.Smoker]: "Smoker",
  [ItemType.SceneryKangaCow]: "SceneryKangaCow",
  [ItemType.Table]: "Table",
  [ItemType.Chair]: "Chair",
  [ItemType.StampedeKanga]: "StampedeKanga",
  [ItemType.Boost]: "Boost",
  [ItemType.StampedeCamera]: "StampedeCamera",
  [ItemType.Wallker]: "Wallker",
  [ItemType.DeadTree]: "DeadTree",
  [ItemType.Rock]: "Rock",
  [ItemType.ElectricFence]: "ElectricFence",
  [ItemType.Tumbleweed]: "Tumbleweed",
  [ItemType.TremorGrave]: "TremorGrave",
  [ItemType.TeePee]: "TeePee",
  [ItemType.SwampCabin]: "SwampCabin",
  [ItemType.TremorAlien_Shootout]: "TremorAlien_Shootout",
  [ItemType.FreeLifePOW]: "FreeLifePOW",
  [ItemType.SpearSkull]: "SpearSkull",
  [ItemType.StampedeKangarex]: "StampedeKangarex",
  [ItemType.Shorty_Shootout]: "Shorty_Shootout",
  [ItemType.Peso]: "Peso",
};
