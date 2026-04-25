import { LevelData } from "@/python/structSpecs/LevelTypes";
import { ok, err, ResultAsync } from "neverthrow";
import type { Result } from "neverthrow";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import { fixNullToZero } from "@/data/processors/nullToZeroFixer";
import { isRecord } from "./typeGuards";
import type { GlobalsInterface } from "@/data/globals/globals";
import {
  splitLevelData,
  AtomicLevelData,
  isLevelDataLike,
} from "@/data/utils/levelDataUtils";
import { validateLevelDataForGame } from "@/validation/validateLevelForGame";
import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import { mapErr } from "@/utils/mapErr";
import { resultSchema, plainResultSchema, getStringField } from "@/schemas/common";

export async function parseRsrcLevelFile(
  file: Blob,
  gameType: GlobalsInterface,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<LevelData, string>> {
  const levelBufferResult = await ResultAsync.fromPromise(
    file.arrayBuffer(),
    mapErr,
  );
  if (levelBufferResult.isErr()) return err(String(levelBufferResult.error));
  const bytes = new Uint8Array(levelBufferResult.value);

  // Use rsrcdump-ts to parse the resource fork
  const parseRaw = await saveToJson(
    bytes,
    gameType.STRUCT_SPECS,
    [], // includeTypes
    [], // excludeTypes
  );

  // saveToJson is a third-party function that has, historically, returned
  // different shapes (a neverthrow Result instance or a plain { ok, value, error } object).
  // Normalize it locally to a neverthrow Result<string, string> so callers can use
  // the instance API safely.
  function isNeverthrowResult(value: unknown): value is Result<string, string> {
    return resultSchema.safeParse(value).success;
  }

  function isPlainSaveToJson(value: unknown): value is {
    ok: boolean;
    value?: unknown;
    error?: unknown;
  } {
    return plainResultSchema.safeParse(value).success;
  }

  function normalizeSaveToJsonResult(r: unknown): Result<string, string> {
    if (isNeverthrowResult(r)) return r;
    if (!isPlainSaveToJson(r))
      return err("saveToJson returned unexpected shape");
    const val = getStringField(r, "value");
    if (!r.ok || !val)
      return err(String(r.error));
    return ok(val);
  }

  const parseResult = normalizeSaveToJsonResult(parseRaw);
  if (parseResult.isErr()) return err(parseResult.error);

  const parsedUnknown: unknown = JSON.parse(parseResult.value);

  // Validate that parsed data is an object
  if (!isRecord(parsedUnknown)) {
    return err("Parsed level data is not an object");
  }
  const result = parsedUnknown;

  // Fix null values from rsrcdump-ts (safety net for backwards compatibility)
  // v1.0.6 should have fixed null/undefined bugs, but we keep this as a safety measure
  fixNullToZero(result);

  // Apply preprocessing FIRST (converts liquid nubs from x_0/y_0 format to array format)
  const preprocessResult = preprocessJson(result, gameType);
  if (preprocessResult.isErr()) {
    return err(String(preprocessResult.error));
  }

  // Fix null values AGAIN after preprocessing (safety net)
  // The array conversion and preprocessing may create edge cases
  fixNullToZero(result);

  // Validate the preprocessed data using the appropriate game schema
  const validationResult = validateLevelDataForGame(result, gameType.GAME_TYPE);
  if (validationResult.isErr()) {
    return err(
      `Level validation failed for ${gameType.GAME_NAME}: ${validationResult.error}`,
    );
  }

  // After validation, we know the structure matches LevelData
  if (!isLevelDataLike(result)) {
    return err("Parsed level data is not LevelData");
  }
  const levelData = result;

  setData(splitLevelData(levelData));
  return ok(levelData);
}
