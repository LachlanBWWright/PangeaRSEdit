import { GlobalsInterface } from "../globals/globals";
import { Result, ok, err } from "../../types/result";

export function getFenceTypes(globals: GlobalsInterface): Result<string[], Error> {
  // Return the keys of the FENCE_TYPES mapping from globals
  if (!globals.FENCE_TYPES) {
    return err(new Error("This game does not support fences"));
  }
  return ok(Object.keys(globals.FENCE_TYPES));
}
