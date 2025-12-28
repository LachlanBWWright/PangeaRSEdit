import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Result, ok, err } from "@/types/result";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import type { GlobalsInterface } from "@/data/globals/globals";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";
import { validateLevelDataForGame } from "@/validation/validateLevelForGame";
import { saveToJsonObject } from "@lachlanbwwright/rsrcdump-ts";

export async function parseRsrcLevelFile(
  file: Blob,
  gameType: GlobalsInterface,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<LevelData, Error>> {
  try {
    const levelBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(levelBuffer);

    // Use rsrcdump-ts to parse the resource fork
    const parseResult = saveToJsonObject(
      bytes,
      gameType.STRUCT_SPECS,
      [], // includeTypes
      [], // excludeTypes
      true, // useOttoSpecs
    );

    if (!parseResult.ok) {
      return err(parseResult.error);
    }

    const result = parseResult.value as Record<string, unknown>;

    // Apply preprocessing FIRST (converts liquid nubs from x_0/y_0 format to array format)
    const preprocessResult = preprocessJson(result, gameType);
    if (!preprocessResult.ok) {
      return err(preprocessResult.error);
    }

    // Validate the preprocessed data using the appropriate game schema
    const validationResult = validateLevelDataForGame(
      result,
      gameType.GAME_TYPE
    );
    if (!validationResult.ok) {
      return err(
        new Error(
          `Level validation failed for ${gameType.GAME_NAME}: ${validationResult.error.message}`
        )
      );
    }

    // After validation, we know the structure matches LevelData
    const levelData = result as unknown as LevelData;
    setData(splitLevelData(levelData));
    return ok(levelData);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
