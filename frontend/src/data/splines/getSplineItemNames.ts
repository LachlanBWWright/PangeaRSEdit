import { GlobalsInterface } from "../globals/globals";

/** Returns the display name for a spline item number in the current game's globals. */
export function getSplineItemName(
  globals: GlobalsInterface,
  itemNumber: number,
): string {
  if (!globals.SPLINE_ITEM_TYPES) {
    return "Unknown Spline Item (no spline support)";
  }

  const name = globals.SPLINE_ITEM_TYPES[itemNumber];
  if (name !== undefined) {
    return name;
  }

  return `Unknown Spline Item (${itemNumber})`;
}
