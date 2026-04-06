import { GlobalsInterface } from "../globals/globals";
import { ok } from "neverthrow";
import { Result } from "neverthrow";

export function getItemTypes(globals: GlobalsInterface): Result<string[], Error> {
  // Return the keys of the ITEM_TYPES mapping from globals
  return ok(Object.keys(globals.ITEM_TYPES));
}
