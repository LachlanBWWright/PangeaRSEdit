import { GlobalsInterface } from "../globals/globals";
import { ok } from "neverthrow";
import { Result } from "neverthrow";

/** Returns the available item type keys for the current game's globals. */
export function getItemTypes(
  globals: GlobalsInterface,
): Result<string[], string> {
  return ok(Object.keys(globals.ITEM_TYPES));
}
