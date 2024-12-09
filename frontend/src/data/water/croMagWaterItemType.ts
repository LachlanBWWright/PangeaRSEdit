export enum WaterBodyType {
  WATER,
  TAR,
}

export const waterBodyNames: Record<WaterBodyType, string> = {
  [WaterBodyType.WATER]: "Water",
  [WaterBodyType.TAR]: "Tar",
};
