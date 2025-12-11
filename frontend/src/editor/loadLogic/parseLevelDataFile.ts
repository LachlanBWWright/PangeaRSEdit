import { LevelData } from "@/python/structSpecs/LevelTypes";
import { AtomicLevelData } from "@/data/utils/levelDataUtils";
import type { GlobalsInterface } from "@/data/globals/globals";
import { DataType } from "@/data/globals/globals";
import { Result } from "@/types/result";
import { parseNanosaurLevelFile } from "./parseNanosaurLevelFile";
import { parseMightyMikeFile } from "./parseMightyMikeFile";
import { parsePyodideLevelFile } from "./parsePyodideLevelFile";

/**
 * Parse a level data file into an ottoMatic-compatible structure and set
 * the editor state by calling setData.
 */
export async function parseLevelDataFile(
  file: Blob,
  gameType: GlobalsInterface,
  pyodideWorker: Worker,
  setData: (data: AtomicLevelData) => void,
  fileUrl?: string,
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
    return await parseMightyMikeFile(file, setData, fileUrl);
  }

  // All other standard games use the pyodide/protobuf flow
  return await parsePyodideLevelFile(file, gameType, pyodideWorker, setData);
}
