import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Result, ok, err, fromPromise } from "@/types/result";
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

export async function parseRsrcLevelFile(
  file: Blob,
  gameType: GlobalsInterface,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<LevelData, Error>> {
  const bufferResult = await fromPromise(file.arrayBuffer());
  if (bufferResult.isErr()) {
    return err(
      new Error(`Failed to read file buffer: ${bufferResult.error.message}`),
    );
  }

  const levelBuffer = bufferResult.value;
  const bytes = new Uint8Array(levelBuffer);

  // Use rsrcdump-ts to parse the resource fork
  const parseResult = await saveToJson(
    bytes,
    gameType.STRUCT_SPECS,
    [], // includeTypes
    [], // excludeTypes
  );

  if (!parseResult.ok) {
    return err(new Error(parseResult.error));
  }

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
