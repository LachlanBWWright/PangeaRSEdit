import { GlobalsInterface } from "../globals/globals";

/** Returns the display name for an item type in the current game's globals. */
export function getItemName(
  globals: GlobalsInterface,
  itemNumber: number,
): string {
  const name = globals.ITEM_TYPES[itemNumber];
  if (name !== undefined) {
    return name;
  }

  return `Unknown Item (${itemNumber})`;
}
