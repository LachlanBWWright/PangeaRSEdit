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

const nanosaurDefaultParams: NanosaurItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

export const nanosaurItemTypeParams: Record<ItemType, NanosaurItemParams> = {
  [ItemType.StartCoords]: nanosaurDefaultParams,
  [ItemType.PowerUp]: nanosaurDefaultParams,
  [ItemType.Enemy_Tricer]: nanosaurDefaultParams,
  [ItemType.Enemy_Rex]: nanosaurDefaultParams,
  [ItemType.LavaPatch]: nanosaurDefaultParams,
  [ItemType.Egg]: nanosaurDefaultParams,
  [ItemType.GasVent]: nanosaurDefaultParams,
  [ItemType.Enemy_Ptera]: nanosaurDefaultParams,
  [ItemType.Enemy_Stego]: nanosaurDefaultParams,
  [ItemType.TimePortal]: nanosaurDefaultParams,
  [ItemType.Tree]: nanosaurDefaultParams,
  [ItemType.Boulder]: nanosaurDefaultParams,
  [ItemType.Mushroom]: nanosaurDefaultParams,
  [ItemType.Bush]: nanosaurDefaultParams,
  [ItemType.WaterPatch]: nanosaurDefaultParams,
  [ItemType.Crystal]: nanosaurDefaultParams,
  [ItemType.Enemy_Spitter]: nanosaurDefaultParams,
  [ItemType.StepStone]: nanosaurDefaultParams,
  [ItemType.RollingBoulder]: nanosaurDefaultParams,
  [ItemType.SporePod]: nanosaurDefaultParams,
};
