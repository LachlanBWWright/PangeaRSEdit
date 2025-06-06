export enum ItemType {
  StartCoords, // My Start Coords
  BirchTree,
  PineTree,
  Egg,
  EggWormhole,
  TowerTurret,
  WeaponPOW,
  SmallTree,
  FallenTree,
  TreeStump,
  Grass,
  Fern,
  BerryBush,
  CatTail,
  Rock,
  Enemy_Raptor,
  DustDevil, // 16
  AirMine, // 17: air mine
  ForestDoor,
  ForestDoorKey,
  Electrode,
  HealthPOW,
  FuelPOW,
  RiverRock,
  GasMound,
  BentPineTree,
  Enemy_Brach, // 26:
  DesertTree, // 27
  DesertBush,
  Cactus,
  Crystal,
  PalmTree,
  LaserOrb, // 32
  ShieldPOW,
  Smoker,
  Flame,
  PalmBush, // 36: palm bush
  BurntDesertTree,
  HydraTree,
  OddTree,
  GeckoPlant,
  SproutPlant,
  Ivy,
  Asteroid,
  SwampFallenTree,
  SwampStump,
  Hole, // 46: hole worms
  FreeLifePOW,
  RamphorEnemy, // 48: Ramphor enemy
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "My Start Coords",
  [ItemType.BirchTree]: "Birch Tree",
  [ItemType.PineTree]: "Pine Tree",
  [ItemType.Egg]: "Egg",
  [ItemType.EggWormhole]: "Egg Wormhole",
  [ItemType.TowerTurret]: "Tower Turret",
  [ItemType.WeaponPOW]: "Weapon POW",
  [ItemType.SmallTree]: "Small Tree",
  [ItemType.FallenTree]: "Fallen Tree",
  [ItemType.TreeStump]: "Tree Stump",
  [ItemType.Grass]: "Grass",
  [ItemType.Fern]: "Fern",
  [ItemType.BerryBush]: "Berry Bush",
  [ItemType.CatTail]: "Cat Tail",
  [ItemType.Rock]: "Rock",
  [ItemType.Enemy_Raptor]: "Raptor Enemy",
  [ItemType.DustDevil]: "Dust Devil",
  [ItemType.AirMine]: "Air Mine",
  [ItemType.ForestDoor]: "Forest Door",
  [ItemType.ForestDoorKey]: "Forest Door Key",
  [ItemType.Electrode]: "Electrode",
  [ItemType.HealthPOW]: "Health POW",
  [ItemType.FuelPOW]: "Fuel POW",
  [ItemType.RiverRock]: "River Rock",
  [ItemType.GasMound]: "Gas Mound",
  [ItemType.BentPineTree]: "Bent Pine Tree",
  [ItemType.Enemy_Brach]: "Brach Enemy",
  [ItemType.DesertTree]: "Desert Tree",
  [ItemType.DesertBush]: "Desert Bush",
  [ItemType.Cactus]: "Cactus",
  [ItemType.Crystal]: "Crystal",
  [ItemType.PalmTree]: "Palm Tree",
  [ItemType.LaserOrb]: "Laser Orb",
  [ItemType.ShieldPOW]: "Shield POW",
  [ItemType.Smoker]: "Smoker",
  [ItemType.Flame]: "Flame",
  [ItemType.PalmBush]: "Palm Bush",
  [ItemType.BurntDesertTree]: "Burnt Desert Tree",
  [ItemType.HydraTree]: "Hydra Tree",
  [ItemType.OddTree]: "Odd Tree",
  [ItemType.GeckoPlant]: "Gecko Plant",
  [ItemType.SproutPlant]: "Sprout Plant",
  [ItemType.Ivy]: "Ivy",
  [ItemType.Asteroid]: "Asteroid",
  [ItemType.SwampFallenTree]: "Swamp Fallen Tree",
  [ItemType.SwampStump]: "Swamp Stump",
  [ItemType.Hole]: "Hole",
  [ItemType.FreeLifePOW]: "Free Life POW",
  [ItemType.RamphorEnemy]: "Ramphor Enemy",
};
