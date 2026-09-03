import { err, ok, type Result } from "neverthrow";
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  CroMagGlobals,
  Game,
  MightyMikeGlobals,
  Nanosaur2Globals,
  NanosaurGlobals,
  OttoGlobals,
  type GlobalsInterface,
} from "@/data/globals/globals";
import { parseLevelBytes } from "./parseLevelBytes";
import { validateLevelDataForGame } from "@/validation/validateLevelForGame";

export function getGlobalsForGame(game: Game): GlobalsInterface {
  switch (game) {
    case Game.OTTO_MATIC:
      return OttoGlobals;
    case Game.BUGDOM:
      return BugdomGlobals;
    case Game.BUGDOM_2:
      return Bugdom2Globals;
    case Game.NANOSAUR:
      return NanosaurGlobals;
    case Game.NANOSAUR_2:
      return Nanosaur2Globals;
    case Game.CRO_MAG:
      return CroMagGlobals;
    case Game.BILLY_FRONTIER:
      return BillyFrontierGlobals;
    case Game.MIGHTY_MIKE:
      return MightyMikeGlobals;
    default:
      return OttoGlobals;
  }
}

function copyBytes(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function validateLevelBytesForGame(
  game: Game,
  dataBytes: Uint8Array | null,
  rsrcBytes: Uint8Array | null,
): Promise<Result<void, string>> {
  const globals = getGlobalsForGame(game);
  const levelBytes = rsrcBytes ?? dataBytes;
  if (!levelBytes) {
    return err("Level data is unavailable for validation.");
  }

  const parsedResult = await parseLevelBytes({
    levelBytes: copyBytes(levelBytes),
    globals,
    strictRustNanosaur: false,
  });
  if (parsedResult.isErr()) {
    return err(parsedResult.error.message);
  }

  const validationResult = validateLevelDataForGame(
    parsedResult.value.levelData,
    game,
  );
  return validationResult.isOk()
    ? ok(undefined)
    : err(validationResult.error);
}

export function validateLevelDataForGameIfEnabled(
  data: unknown,
  game: Game,
  enabled: boolean,
): Result<void, string> {
  if (!enabled) return ok(undefined);
  const result = validateLevelDataForGame(data, game);
  return result.isOk() ? ok(undefined) : err(result.error);
}
