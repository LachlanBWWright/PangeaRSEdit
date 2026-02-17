import { LevelData } from "@/python/structSpecs/LevelTypes";
import { AtomicLevelData } from "@/data/utils/levelDataUtils";
import type { GlobalsInterface } from "@/data/globals/globals";
import { DataType } from "@/data/globals/globals";
import { Result } from "@/types/result";
import { parseNanosaurLevelFile } from "./parseNanosaurLevelFile";
import { parseMightyMikeFile } from "./parseMightyMikeFile";
import { parseRsrcLevelFile } from "./parseRsrcLevelFile";

/**
 * Parse a level data file into an ottoMatic-compatible structure and set
 * the editor state by calling setData.
 * Also calls setMapImages for Mighty Mike levels (since tileset images aren't in AtomicLevelData).
 */
export async function parseLevelDataFile(
  file: Blob,
  gameType: GlobalsInterface,
  setData: (data: AtomicLevelData) => void,
  fileUrl?: string,
  setMapImages?: (images: HTMLCanvasElement[]) => void,
): Promise<Result<LevelData, Error>> {
  // Dispatch to game-specific parsers that return Results

  // Nanosaur 1 (TRT files) uses classic preprocessor
  // Use the specialized parser module
  // Note: The helper parsers call setData and return Result
  // choose which to call based on gameType
  // Use numeric enum comparisons to avoid depending on the 'Game' import at runtime
  // as a workaround for bundler ordering issues
  // Nanosaur (TRT file style)
  if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    return await parseNanosaurLevelFile(file, gameType, setData);
  }

  // Mighty Mike (map/tile format)
  // DataType.MIGHTY_MIKE is enum value 3, but check by DATA_TYPE since it's stable
  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
    return await parseMightyMikeFile(file, setData, fileUrl, setMapImages);
  }

  // All other standard games use the rsrcdump-ts flow
  return await parseRsrcLevelFile(file, gameType, setData);
}
