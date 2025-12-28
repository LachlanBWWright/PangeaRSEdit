import { GlobalsInterface } from "../globals/globals";
import { Result, ok } from "../../types/result";

export function getItemTypes(globals: GlobalsInterface): Result<string[], Error> {
  // Return the keys of the ITEM_TYPES mapping from globals
  return ok(Object.keys(globals.ITEM_TYPES));
}
