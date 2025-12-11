import { GlobalsInterface } from "../globals/globals";

export function getItemName(globals: GlobalsInterface, itemNumber: number): string {
  // Look up the item name in the ITEM_TYPES mapping from globals
  if (itemNumber in globals.ITEM_TYPES) {
    return globals.ITEM_TYPES[itemNumber];
  }
  
  return `Unknown Item (${itemNumber})`;
}
