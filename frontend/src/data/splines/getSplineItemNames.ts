import { GlobalsInterface } from "../globals/globals";

export function getSplineItemName(
  globals: GlobalsInterface,
  itemNumber: number,
): string {
  // Look up the spline item name in the SPLINE_ITEM_TYPES mapping from globals
  if (!globals.SPLINE_ITEM_TYPES) {
    return "Unknown Spline Item (no spline support)";
  }
  
  const name = globals.SPLINE_ITEM_TYPES[itemNumber];
  if (name !== undefined) {
    return name;
  }
  
  return `Unknown Spline Item (${itemNumber})`;
}
