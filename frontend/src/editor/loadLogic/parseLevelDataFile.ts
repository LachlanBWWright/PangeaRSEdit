import { LevelData } from "@/python/structSpecs/LevelTypes";
import { AtomicLevelData } from "@/data/utils/levelDataUtils";
import type { GlobalsInterface } from "@/data/globals/globals";
import { DataType } from "@/data/globals/globals";
import { Result } from "neverthrow";
import { parseNanosaurLevelFile } from "./parseNanosaurLevelFile";
import { parseMightyMikeFile } from "./parseMightyMikeFile";
import { parseRsrcLevelFile } from "./parseRsrcLevelFile";
import {
  extractTilesFromBuffer,
  createCanvasFromTile,
} from "@/data/processors/classicProprocessor";
import { isRecord } from "./typeGuards";

// The caller (parseRsrcLevelFile → rsrcdump-ts) guarantees hex strings produced by
// Base16Converter are well-formed pairs of hex digits, so no additional validation needed.
function hexToUint8Array(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Parse a level data file into an ottoMatic-compatible structure and set
 * the editor state by calling setData.
 * Also calls setMapImages for Mighty Mike levels (since tileset images aren't in AtomicLevelData)
 * and for RSRC_FORK (Bugdom 1) levels where tile images are embedded in the Timg resource.
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
  const result = await parseRsrcLevelFile(file, gameType, setData);

  // For RSRC_FORK (Bugdom 1), tile images are embedded in the Timg resource.
  // Extract them here so the editor always displays tiles after a file upload.
  if (
    result.isOk() &&
    gameType.DATA_TYPE === DataType.RSRC_FORK &&
    setMapImages
  ) {
    const levelData = result.value;
    const timg = isRecord(levelData.Timg) ? levelData.Timg : undefined;
    const timg1000 = timg && isRecord(timg["1000"]) ? timg["1000"] : undefined;
    const imgHex =
      typeof timg1000?.data === "string" ? timg1000.data : undefined;
    if (imgHex) {
      const imgBuffer = hexToUint8Array(imgHex);
      const alignedBuffer = new ArrayBuffer(imgBuffer.byteLength);
      new Uint8Array(alignedBuffer).set(imgBuffer);
      const tileCount = imgBuffer.byteLength / 2 / 32 / 32;
      const tileView = new DataView(alignedBuffer);
      const tiles = extractTilesFromBuffer(
        tileView,
        tileCount,
        32,
        32 * 32 * 2,
      );
      setMapImages(tiles.map(createCanvasFromTile));
    }
  }

  return result;
}
