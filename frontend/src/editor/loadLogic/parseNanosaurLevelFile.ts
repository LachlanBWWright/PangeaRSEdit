import { LevelData, type LevelMetadata } from "@/python/structSpecs/LevelTypes";
import { Result, ok, err } from "@/types/result";
import {
  parseNanosaur1Level,
  nanosaur1LevelToLevelData,
} from "@/data/processors/classicProprocessor";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";
import type { GlobalsInterface } from "@/data/globals/globals";
import { validateLevelDataForGame } from "@/validation/validateLevelForGame";

export async function parseNanosaurLevelFile(
  file: Blob,
  gameType: GlobalsInterface,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<LevelData, Error>> {
  try {
    const levelBuffer = await file.arrayBuffer();
    const rawLevelData = parseNanosaur1Level(levelBuffer);
    const compatibleLevel = nanosaur1LevelToLevelData(
      rawLevelData,
      gameType.TILE_SIZE,
      gameType.TILE_INGAME_SIZE,
      4.0,
    );

    // Store raw Nanosaur 1 data in _metadata for roundtrip compilation
    const metadata: LevelMetadata = {
      ...compatibleLevel._metadata,
      nanosaur1RawLevel: rawLevelData,
    };

    const result: LevelData = {
      ...compatibleLevel,
      _metadata: metadata,
    };

    // Validate the converted level data
    const validationResult = validateLevelDataForGame(
      result,
      gameType.GAME_TYPE,
    );
    if (!validationResult.ok) {
      return err(
        new Error(
          `Level validation failed for ${gameType.GAME_NAME}: ${validationResult.error.message}`,
        ),
      );
    }

    // Split AFTER attaching metadata so rawLevelData survives in terrainData._metadata
    setData(splitLevelData(result));

    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
