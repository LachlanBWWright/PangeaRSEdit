export enum FenceType {
  LEVEL_1_BLOCKENEMY,
  LEVEL_1_PINETREE,
  LEVEL_2_BLOCKENEMY,
  LEVEL_2_DUSTDEVIL,
  LEVEL_3_BLOCKENEMY,
  //COUNT,
}

export const fenceTypeNames: Record<FenceType, string> = {
  [FenceType.LEVEL_1_BLOCKENEMY]: "Level 1 Block Enemy",
  [FenceType.LEVEL_1_PINETREE]: "Level 1 Pine Tree",
  [FenceType.LEVEL_2_BLOCKENEMY]: "Level 2 Block Enemy",
  [FenceType.LEVEL_2_DUSTDEVIL]: "Level 2 Dust Devil",
  [FenceType.LEVEL_3_BLOCKENEMY]: "Level 3 Block Enemy",
};
