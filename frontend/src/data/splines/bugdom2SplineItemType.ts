import { ItemParams } from "../items/itemParams";

export enum SplineItemType {
  PrimeEnemy_Gnome = 4, // 4: gnome
  PrimeEnemy_HouseFly = 10, // 10: housefly
  PrimeBumbleBee = 25, // 25: bumble bee
  PrimeEnemy_Flea = 38, // 38: flea
  PrimeEnemy_Tick = 39, // 39: tick
  PrimeSlotCar = 40, // 40: slot car
  PrimeEnemy_ToySoldier = 43, // 43: toy solider
  PrimeEnemy_Otto = 45, // 45: otto enemy
  PrimeEnemy_Dragonfly = 52, // 52: dragonfly
  PrimeVacuume = 58, // 58: vacuume
  PrimeMothPath = 60, // 60: moth enemy
  PrimeEnemy_ComputerBug = 61, // 61: computer bug enemy
  PrimeHanger = 63, // 63: hanger
  PrimeEnemy_Roach = 65, // 65: roach enemy
  PrimeEnemy_Ant = 68, // 68: ant enemy
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.PrimeEnemy_Gnome]: "Gnome",
  [SplineItemType.PrimeEnemy_HouseFly]: "House Fly",
  [SplineItemType.PrimeBumbleBee]: "Bumble Bee",
  [SplineItemType.PrimeEnemy_Flea]: "Flea",
  [SplineItemType.PrimeEnemy_Tick]: "Tick",
  [SplineItemType.PrimeSlotCar]: "Slot Car",
  [SplineItemType.PrimeEnemy_ToySoldier]: "Toy Soldier",
  [SplineItemType.PrimeEnemy_Otto]: "Otto",
  [SplineItemType.PrimeEnemy_Dragonfly]: "Dragonfly",
  [SplineItemType.PrimeVacuume]: "Vacuum",
  [SplineItemType.PrimeMothPath]: "Moth",
  [SplineItemType.PrimeEnemy_ComputerBug]: "Computer Bug",
  [SplineItemType.PrimeHanger]: "Hanger",
  [SplineItemType.PrimeEnemy_Roach]: "Roach",
  [SplineItemType.PrimeEnemy_Ant]: "Ant",
};

// Default parameter description for spline items that haven't been researched yet
const defaultParams: ItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

// Parameter descriptions for each spline item type
export const bugdom2SplineItemTypeParams: Record<SplineItemType, ItemParams> = {
  [SplineItemType.PrimeEnemy_Gnome]: defaultParams,
  [SplineItemType.PrimeEnemy_HouseFly]: defaultParams,
  [SplineItemType.PrimeBumbleBee]: defaultParams,
  [SplineItemType.PrimeEnemy_Flea]: defaultParams,
  [SplineItemType.PrimeEnemy_Tick]: defaultParams,
  [SplineItemType.PrimeSlotCar]: defaultParams,
  [SplineItemType.PrimeEnemy_ToySoldier]: defaultParams,
  [SplineItemType.PrimeEnemy_Otto]: defaultParams,
  [SplineItemType.PrimeEnemy_Dragonfly]: defaultParams,
  [SplineItemType.PrimeVacuume]: defaultParams,
  [SplineItemType.PrimeMothPath]: defaultParams,
  [SplineItemType.PrimeEnemy_ComputerBug]: defaultParams,
  [SplineItemType.PrimeHanger]: defaultParams,
  [SplineItemType.PrimeEnemy_Roach]: defaultParams,
  [SplineItemType.PrimeEnemy_Ant]: defaultParams,
};
