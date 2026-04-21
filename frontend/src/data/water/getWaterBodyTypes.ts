import { GlobalsInterface } from "../globals/globals";
import { ok, err } from "neverthrow";
import { Result } from "neverthrow";

export function getWaterBodyTypes(globals: GlobalsInterface): Result<string[], Error> {
  // Return the keys of the WATER_TYPES mapping from globals
  if (!globals.WATER_TYPES) {
    return err(new Error("This game does not support water bodies"));
  }
  return ok(Object.keys(globals.WATER_TYPES));
}
