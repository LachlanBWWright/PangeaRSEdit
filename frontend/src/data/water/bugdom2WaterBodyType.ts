export enum WaterBodyType {
  BLUEWATER,
  POOLWATER,
  GARBAGE,
}

export const waterBodyNames: Record<WaterBodyType, string> = {
  [WaterBodyType.BLUEWATER]: "Blue Water",
  [WaterBodyType.POOLWATER]: "Pool Water",
  [WaterBodyType.GARBAGE]: "Garbage",
};
