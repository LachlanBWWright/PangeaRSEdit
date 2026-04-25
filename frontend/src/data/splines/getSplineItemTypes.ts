import { GlobalsInterface } from "../globals/globals";
import { ok, err } from "neverthrow";
import { Result } from "neverthrow";

export function getSplineItemTypes(globals: GlobalsInterface): Result<string[], string> {
  // Return the keys of the SPLINE_ITEM_TYPES mapping from globals
  if (!globals.SPLINE_ITEM_TYPES) {
    return err("This game does not support spline items");
  }
  return ok(Object.keys(globals.SPLINE_ITEM_TYPES));
}
