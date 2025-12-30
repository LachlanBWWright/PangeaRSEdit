import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Result, ok, err } from "@/types/result";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import { fixNullToZero } from "@/data/processors/nullToZeroFixer";
import type { GlobalsInterface } from "@/data/globals/globals";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";
import { validateLevelDataForGame } from "@/validation/validateLevelForGame";
import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";

export async function parseRsrcLevelFile(
  file: Blob,
  gameType: GlobalsInterface,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<LevelData, Error>> {
  try {
    const levelBuffer = await file.arrayBuffer();
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

    const result = JSON.parse(parseResult.value) as Record<string, unknown>;

    // Fix null values from rsrcdump-ts (safety net for backwards compatibility)
    // v1.0.6 should have fixed null/undefined bugs, but we keep this as a safety measure
    fixNullToZero(result);

    // Apply preprocessing FIRST (converts liquid nubs from x_0/y_0 format to array format)
    const preprocessResult = preprocessJson(result, gameType);
    if (!preprocessResult.ok) {
      return err(preprocessResult.error);
    }

    // Fix null values AGAIN after preprocessing (safety net)
    // The array conversion and preprocessing may create edge cases
    fixNullToZero(result);

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
