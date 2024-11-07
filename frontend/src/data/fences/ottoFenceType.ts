export enum FenceType {
  FARMWOOD,
  CORNSTALK,
  CHICKENWIRE,
  METALFARM,

  PINKCRYSTAL,
  MECH,
  SLIMETREE,
  BLUECRYSTAL,
  MECH2,
  JUNGLEWOOD,
  JUNGLEFERN,

  LAMP,
  RUBBLE,
  CRUNCH,

  FUN,
  HEDGE,
  LINE,
  TENT,

  LAVAFENCE,
  ROCKFENCE,

  SAUCER,

  NEURONFENCE,

  //COUNT,
}

export const fenceTypeNames: Record<FenceType, string> = {
  [FenceType.FARMWOOD]: "Farmwood",
  [FenceType.CORNSTALK]: "Cornsilk",
  [FenceType.CHICKENWIRE]: "Chicken Wire",
  [FenceType.METALFARM]: "Metal Farm",

  [FenceType.PINKCRYSTAL]: "Pink Crystal",
  [FenceType.MECH]: "Mechanical",
  [FenceType.SLIMETREE]: "Slimetree",
  [FenceType.BLUECRYSTAL]: "Blue Crystal",
  [FenceType.MECH2]: "Mechanical 2",
  [FenceType.JUNGLEWOOD]: "Jungle Wood",
  [FenceType.JUNGLEFERN]: "Jungle Fern",

  [FenceType.LAMP]: "Lamp",
  [FenceType.RUBBLE]: "Rubble",
  [FenceType.CRUNCH]: "Crunch",

  [FenceType.FUN]: "Fun",
  [FenceType.HEDGE]: "Hedge",
  [FenceType.LINE]: "Line",
  [FenceType.TENT]: "Tent",

  [FenceType.LAVAFENCE]: "Lava Fence",
  [FenceType.ROCKFENCE]: "Rock Fence",

  [FenceType.SAUCER]: "Saucer",

  [FenceType.NEURONFENCE]: "Neuron Fence",
};
