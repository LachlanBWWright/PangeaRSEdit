import { GlobalsInterface } from "../globals/globals";

export function getFenceName(globals: GlobalsInterface, fenceNumber: number): string {
  // Look up the fence name in the FENCE_TYPES mapping from globals
  if (!globals.FENCE_TYPES) {
    return "Unknown Fence (no fence support)";
  }
  
  const name = globals.FENCE_TYPES[fenceNumber];
  if (name !== undefined) {
    return name;
  }
  
  return `Unknown Fence (${fenceNumber})`;
}
