import { GlobalsInterface } from "../globals/globals";
import { Result, ok, err } from "../../types/result";

export function getSplineItemTypes(globals: GlobalsInterface): Result<string[]> {
  // Return the keys of the SPLINE_ITEM_TYPES mapping from globals
  if (!globals.SPLINE_ITEM_TYPES) {
    return err(new Error("This game does not support spline items"));
  }
  return ok(Object.keys(globals.SPLINE_ITEM_TYPES));
}
