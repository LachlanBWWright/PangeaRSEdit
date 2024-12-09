export enum WaterBodyType {
  GREEN,
  BLUE,
  LAVA,
  LAVA_DIR0,
  LAVA_DIR1,
  LAVA_DIR2,
  LAVA_DIR3,
  LAVA_DIR4,
  LAVA_DIR5,
  LAVA_DIR6,
  LAVA_DIR7,
}

export const waterBodyNames: Record<WaterBodyType, string> = {
  [WaterBodyType.GREEN]: "Green Water",
  [WaterBodyType.BLUE]: "Blue Water",
  [WaterBodyType.LAVA]: "Lava",
  [WaterBodyType.LAVA_DIR0]: "Lava Direction 0",
  [WaterBodyType.LAVA_DIR1]: "Lava Direction 1",
  [WaterBodyType.LAVA_DIR2]: "Lava Direction 2",
  [WaterBodyType.LAVA_DIR3]: "Lava Direction 3",
  [WaterBodyType.LAVA_DIR4]: "Lava Direction 4",
  [WaterBodyType.LAVA_DIR5]: "Lava Direction 5",
  [WaterBodyType.LAVA_DIR6]: "Lava Direction 6",
  [WaterBodyType.LAVA_DIR7]: "Lava Direction 7",
};
