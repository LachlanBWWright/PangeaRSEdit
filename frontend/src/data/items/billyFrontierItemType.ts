import { ItemParams } from "./itemParams";

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

export type BillyFrontierItemParams = ItemParams;

const billyFrontierDefaultParams: BillyFrontierItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

export const billyFrontierItemTypeParams: Record<
  ItemType,
  BillyFrontierItemParams
> = {
  [ItemType.StartCoords]: billyFrontierDefaultParams,
  [ItemType.Dueler]: billyFrontierDefaultParams,
  [ItemType.Building]: billyFrontierDefaultParams,
  [ItemType.HeadStone]: billyFrontierDefaultParams,
  [ItemType.Plant]: billyFrontierDefaultParams,
  [ItemType.DuelRockWall]: billyFrontierDefaultParams,
  [ItemType.Coffin]: billyFrontierDefaultParams,
  [ItemType.FrogMan_Shootout]: billyFrontierDefaultParams,
  [ItemType.Bandito_Shootout]: billyFrontierDefaultParams,
  [ItemType.Barrel]: billyFrontierDefaultParams,
  [ItemType.WoodCrate]: billyFrontierDefaultParams,
  [ItemType.HayBale]: billyFrontierDefaultParams,
  [ItemType.ShootoutSaloon]: billyFrontierDefaultParams,
  [ItemType.ShootoutAlley]: billyFrontierDefaultParams,
  [ItemType.Post]: billyFrontierDefaultParams,
  [ItemType.Flame]: billyFrontierDefaultParams,
  [ItemType.Smoker]: billyFrontierDefaultParams,
  [ItemType.SceneryKangaCow]: billyFrontierDefaultParams,
  [ItemType.Table]: billyFrontierDefaultParams,
  [ItemType.Chair]: billyFrontierDefaultParams,
  [ItemType.StampedeKanga]: billyFrontierDefaultParams,
  [ItemType.Boost]: billyFrontierDefaultParams,
  [ItemType.StampedeCamera]: billyFrontierDefaultParams,
  [ItemType.Wallker]: billyFrontierDefaultParams,
  [ItemType.DeadTree]: billyFrontierDefaultParams,
  [ItemType.Rock]: billyFrontierDefaultParams,
  [ItemType.ElectricFence]: billyFrontierDefaultParams,
  [ItemType.Tumbleweed]: billyFrontierDefaultParams,
  [ItemType.TremorGrave]: billyFrontierDefaultParams,
  [ItemType.TeePee]: billyFrontierDefaultParams,
  [ItemType.SwampCabin]: billyFrontierDefaultParams,
  [ItemType.TremorAlien_Shootout]: billyFrontierDefaultParams,
  [ItemType.FreeLifePOW]: billyFrontierDefaultParams,
  [ItemType.SpearSkull]: billyFrontierDefaultParams,
  [ItemType.StampedeKangarex]: billyFrontierDefaultParams,
  [ItemType.Shorty_Shootout]: billyFrontierDefaultParams,
  [ItemType.Peso]: billyFrontierDefaultParams,
};
