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
