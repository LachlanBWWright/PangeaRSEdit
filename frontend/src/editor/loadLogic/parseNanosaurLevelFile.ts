import { LevelData } from "@/python/structSpecs/LevelTypes";
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

    // Validate the converted level data - fail on error for type safety
    const validationResult = validateLevelDataForGame(
      compatibleLevel,
      gameType.GAME_TYPE
    );
    if (!validationResult.ok) {
      return err(
        new Error(
          `Level validation failed for ${gameType.GAME_NAME}: ${validationResult.error.message}`
        )
      );
    }

    setData(splitLevelData(compatibleLevel));
    
    // Store raw Nanosaur 1 data in _metadata for roundtrip compilation
    const result: LevelData = {
      ...compatibleLevel,
      _metadata: {
        file_attributes: 0,
        junk1: 0,
        junk2: 0,
        // Store the raw Nanosaur1 data for roundtrip
        nanosaur1RawLevel: rawLevelData,
      } as any, // Use any here as we're extending the metadata
    };
    
    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
