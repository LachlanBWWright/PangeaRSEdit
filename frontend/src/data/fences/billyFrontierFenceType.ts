export enum FenceType {
  WOOD,
  WHITE,
  CANYON,
  TALLGRASS,
  SMALLGRASS,
  SWAMPTREE,
  PICKETFENCE,
}

export const fenceTypeNames: Record<FenceType, string> = {
  [FenceType.WOOD]: "Wood",
  [FenceType.WHITE]: "White",
  [FenceType.CANYON]: "Canyon",
  [FenceType.TALLGRASS]: "Tall Grass",
  [FenceType.SMALLGRASS]: "Small Grass",
  [FenceType.SWAMPTREE]: "Swamp Tree",
  [FenceType.PICKETFENCE]: "Picket Fence",
};
