export enum FenceType {
  THORN,
  WHEAT,
  GRASS,
  FOREST2,
  NIGHT,
  POND,
  MOSS,
  WOOD,
  HIVE,
}

export const fenceTypeNames: Record<FenceType, string> = {
  [FenceType.THORN]: "Thorn",
  [FenceType.WHEAT]: "Wheat",
  [FenceType.GRASS]: "Grass",
  [FenceType.FOREST2]: "Forest 2",
  [FenceType.NIGHT]: "Night",
  [FenceType.POND]: "Pond",
  [FenceType.MOSS]: "Moss",
  [FenceType.WOOD]: "Wood",
  [FenceType.HIVE]: "Hive",
};
