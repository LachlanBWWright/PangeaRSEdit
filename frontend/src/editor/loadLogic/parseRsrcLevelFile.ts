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

export async function parseRsrcLevelFile(
  file: Blob,
  gameType: GlobalsInterface,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<LevelData, Error>> {
  const levelBufferResult = await ResultAsync.fromPromise(
    file.arrayBuffer(),
    mapErr,
  );
  if (levelBufferResult.isErr()) return err(levelBufferResult.error);
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
  // Normalize it locally to a neverthrow Result<string, Error> so callers can use
  // the instance API safely.
  function isNeverthrowResult(value: unknown): value is Result<string, Error> {
    if (typeof value !== "object" || value === null) return false;
    return (
      typeof Reflect.get(value, "isOk") === "function" &&
      typeof Reflect.get(value, "isErr") === "function"
    );
  }

  function isPlainSaveToJson(value: unknown): value is {
    ok: boolean;
    value?: unknown;
    error?: unknown;
  } {
    if (typeof value !== "object" || value === null) return false;
    return typeof Reflect.get(value, "ok") === "boolean";
  }

  function normalizeSaveToJsonResult(r: unknown): Result<string, Error> {
    if (isNeverthrowResult(r)) {
      return r;
    }
    if (isPlainSaveToJson(r)) {
      if (r.ok && typeof r.value === "string") {
        return ok(r.value);
      }
      return err(new Error(String(r.error)));
    }
    return err(new Error("saveToJson returned unexpected shape"));
  }

  const parseResult = normalizeSaveToJsonResult(parseRaw);
  if (parseResult.isErr()) return err(parseResult.error);

  const parsedUnknown: unknown = JSON.parse(parseResult.value);

  // Validate that parsed data is an object
  if (!isRecord(parsedUnknown)) {
    return err(new Error("Parsed level data is not an object"));
  }
  const result = parsedUnknown;

  // Fix null values from rsrcdump-ts (safety net for backwards compatibility)
  // v1.0.6 should have fixed null/undefined bugs, but we keep this as a safety measure
  fixNullToZero(result);

  // Apply preprocessing FIRST (converts liquid nubs from x_0/y_0 format to array format)
  const preprocessResult = preprocessJson(result, gameType);
  if (preprocessResult.isErr()) {
    return err(preprocessResult.error);
  }

  // Fix null values AGAIN after preprocessing (safety net)
  // The array conversion and preprocessing may create edge cases
  fixNullToZero(result);

  // Validate the preprocessed data using the appropriate game schema
  const validationResult = validateLevelDataForGame(result, gameType.GAME_TYPE);
  if (validationResult.isErr()) {
    return err(
      new Error(
        `Level validation failed for ${gameType.GAME_NAME}: ${validationResult.error.message}`,
      ),
    );
  }

  // After validation, we know the structure matches LevelData
  if (!isLevelDataLike(result)) {
    return err(new Error("Parsed level data is not LevelData"));
  }
  const levelData = result;

  setData(splitLevelData(levelData));
  return ok(levelData);
}
