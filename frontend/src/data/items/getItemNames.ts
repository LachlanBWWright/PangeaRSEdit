import { GlobalsInterface } from "../globals/globals";

export function getItemName(globals: GlobalsInterface, itemNumber: number): string {
  // Look up the item name in the ITEM_TYPES mapping from globals
  const name = globals.ITEM_TYPES[itemNumber];
  if (name !== undefined) {
    return name;
  }
  
  return `Unknown Item (${itemNumber})`;
}
