import { GlobalsInterface } from "../globals/globals";
import { ok, err } from "neverthrow";
import { Result } from "neverthrow";

export function getFenceTypes(globals: GlobalsInterface): Result<string[], string> {
  // Return the keys of the FENCE_TYPES mapping from globals
  if (!globals.FENCE_TYPES) {
    return err("This game does not support fences");
  }
  return ok(Object.keys(globals.FENCE_TYPES));
}
