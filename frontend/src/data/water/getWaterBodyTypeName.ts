import { GlobalsInterface } from "../globals/globals";

export function getWaterBodyTypeName(globals: GlobalsInterface, waterBodyNumber: number): string {
  // Look up the water body name in the WATER_TYPES mapping from globals
  if (!globals.WATER_TYPES) {
    return "Unknown Water Body (no water support)";
  }
  
  const name = globals.WATER_TYPES[waterBodyNumber];
  if (name !== undefined) {
    return name;
  }
  
  return `Unknown Water Body (${waterBodyNumber})`;
}
