import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Result, ok, err } from "@/types/result";
import {
  parseNanosaur1Level,
  nanosaur1LevelToOttoMaticLevel,
} from "@/data/processors/classicProprocessor";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";
import type { GlobalsInterface } from "@/data/globals/globals";

export async function parseNanosaurLevelFile(
  file: Blob,
  gameType: GlobalsInterface,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<ottoMaticLevel, Error>> {
  try {
    const levelBuffer = await file.arrayBuffer();
    const rawLevelData = parseNanosaur1Level(levelBuffer);
    const compatibleLevel = nanosaur1LevelToOttoMaticLevel(
      rawLevelData,
      gameType.TILE_SIZE,
      gameType.TILE_INGAME_SIZE,
      4.0,
    );
    setData(splitLevelData(compatibleLevel));
    return ok(compatibleLevel);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export default parseNanosaurLevelFile;
