import { GlobalsInterface } from "../globals/globals";

export function getSplineItemName(
  globals: GlobalsInterface,
  itemNumber: number,
): string {
  // Look up the spline item name in the SPLINE_ITEM_TYPES mapping from globals
  if (!globals.SPLINE_ITEM_TYPES) {
    return "Unknown Spline Item (no spline support)";
  }
  
  if (itemNumber in globals.SPLINE_ITEM_TYPES) {
    return globals.SPLINE_ITEM_TYPES[itemNumber];
  }
  
  return `Unknown Spline Item (${itemNumber})`;
}
