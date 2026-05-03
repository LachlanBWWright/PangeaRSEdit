import { GlobalsInterface } from "../globals/globals";
import { ok, err } from "neverthrow";
import { Result } from "neverthrow";

/** Returns the available spline item type keys for a game that supports spline items. */
export function getSplineItemTypes(
  globals: GlobalsInterface,
): Result<string[], string> {
  if (!globals.SPLINE_ITEM_TYPES) {
    return err("This game does not support spline items");
  }
  return ok(Object.keys(globals.SPLINE_ITEM_TYPES));
}
