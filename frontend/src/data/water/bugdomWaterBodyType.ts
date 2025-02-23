export enum WaterBodyType {
  WATER,
  HONEY,
  SLIME,
  LAVA,
}

export const waterBodyNames: Record<WaterBodyType, string> = {
  [WaterBodyType.WATER]: "Water",
  [WaterBodyType.HONEY]: "Honey",
  [WaterBodyType.SLIME]: "Slime",
  [WaterBodyType.LAVA]: "Lava",
};
