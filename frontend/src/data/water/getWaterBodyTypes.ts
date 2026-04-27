import { GlobalsInterface } from "../globals/globals";
import { ok, err } from "neverthrow";
import { Result } from "neverthrow";

/** Returns the water body type keys supported by the active game. */
export function getWaterBodyTypes(
  globals: GlobalsInterface,
): Result<string[], string> {
  // Return the keys of the WATER_TYPES mapping from globals
  if (!globals.WATER_TYPES) {
    return err("This game does not support water bodies");
  }
  return ok(Object.keys(globals.WATER_TYPES));
}
