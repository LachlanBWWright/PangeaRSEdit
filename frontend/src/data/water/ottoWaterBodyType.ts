export enum WaterBodyType {
  BLUEWATER,
  SOAP,
  GREENWATER,
  OIL,
  JUNGLEWATER,
  MUD,
  RADIOACTIVE,
  LAVA,
}

export const waterBodyNames: Record<WaterBodyType, string> = {
  [WaterBodyType.BLUEWATER]: "Blue Water",
  [WaterBodyType.SOAP]: "Soap",
  [WaterBodyType.GREENWATER]: "Green Water",
  [WaterBodyType.OIL]: "Oil",
  [WaterBodyType.JUNGLEWATER]: "Jungle Water",
  [WaterBodyType.MUD]: "Mud",
  [WaterBodyType.RADIOACTIVE]: "Radioactive",
  [WaterBodyType.LAVA]: "Lava",
};
