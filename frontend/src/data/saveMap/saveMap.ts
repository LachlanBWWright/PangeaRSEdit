import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import LzssWorker from "../utils/lzssWorker?worker";
import { LevelData, type LevelMetadata } from "@/python/structSpecs/LevelTypes";
import { DataType, TileImageFormat, type GlobalsInterface } from "../globals/globals";
import { validateResourceForkJson } from "../utils/levelDataUtils";
import { toast } from "../../hooks/use-toast";
import { loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import type { Nanosaur1LevelData } from "@/data/processors/classicProprocessor";
import type { MightyMikeMap } from "@/python/structSpecs/mightyMikeInterface";
import { sanitizeResourceForkJson } from "../utils/levelDataUtils";

function isRecord(value: unknown): value is Record<string | number, unknown> {
  return typeof value === "object" && value !== null;
}

function getNestedMetadata(
  metadata: LevelMetadata | undefined,
  key: string,
): Record<string, unknown> | undefined {
  const entry = metadata?.[key];
  if (isRecord(entry) && "obj" in entry) {
    const obj = entry.obj;
    if (isRecord(obj)) {
      return obj;
    }
  }
  return undefined;
}

function isNanosaur1LevelData(value: unknown): value is Nanosaur1LevelData {
  return (
    isRecord(value) &&
    "header" in value &&
    "textureLayer" in value &&
    "objectList" in value
  );
}

function isMightyMikeMap(value: unknown): value is MightyMikeMap {
  return (
    isRecord(value) &&
    "mapWidth" in value &&
    "mapHeight" in value &&
    "mapImage" in value
  );
}

function getNanosaurRawLevel(
  metadata: LevelMetadata | undefined,
): Nanosaur1LevelData | undefined {
  const direct = metadata?.nanosaur1RawLevel;
  if (isNanosaur1LevelData(direct)) {
    return direct;
  }
  const nested = getNestedMetadata(metadata, "1000");
  const nestedRaw = nested?.nanosaur1RawLevel;
  return isNanosaur1LevelData(nestedRaw) ? nestedRaw : undefined;
}

function getMightyMikeMapData(
  metadata: LevelMetadata | undefined,
): MightyMikeMap | undefined {
  const direct = metadata?.mightyMikeMapData;
  if (isMightyMikeMap(direct)) {
    return direct;
  }
  const nested = getNestedMetadata(metadata, "1000");
  const nestedMap = nested?.mightyMikeMapData;
  return isMightyMikeMap(nestedMap) ? nestedMap : undefined;
}
/**
 * Save and download map and images as in IntroPrompt
 */
export async function saveMap({
  mapFile,
  mapImagesFile,
  mapImages,
  data,
  globals,
  toast,
}: {
  mapFile: File | undefined;
  mapImagesFile: File | undefined;
  mapImages: HTMLCanvasElement[] | undefined;
  data: LevelData;
  globals: GlobalsInterface;
  toast: (opts: { title: string; description?: string }) => void;
}) {
  // Allow RSRC_FORK games to save even if a separate images file isn't present
  if (!mapFile || (globals.DATA_TYPE !== DataType.RSRC_FORK && !mapImagesFile)) return;

  // Download Images
  if (mapImages) {
    toast({
      title: "Saving Map",
      description: "Compressing textures",
    });

    const bufferList = await compressMapImages(mapImages);
    const imageDownloadBuffer = combineBuffersForDownload(bufferList);
    downloadBlob(imageDownloadBuffer, mapImagesFile?.name || "images", ".ter");
  }

  if (globals.TILE_IMAGE_FORMAT === TileImageFormat.JPG) {
    //TODO: JPEG-based map logic (e.g., Nanosaur 2)
  }
  //if bugdom 1 (resource fork)
  else if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    // For RSRC_FORK (Bugdom 1), Timg should be embedded in `data` and pyodide
    // should serialize it into the single .ter.rsrc file. Serialize and
    // download the combined resource fork map file.
    const mapBuffer = await processMapData({ data, globals });
    downloadBlob(mapBuffer, mapFile.name, ".ter.rsrc");
    toast({
      title: "Map Downloaded!",
    });
  } else if (globals.DATA_TYPE === DataType.TRT_FILE) {
    // Nanosaur 1: Compile back to .ter format
    const { compileNanosaur1Level } = await import("@/editor/loadLogic/compileNanosaur1Level");

    // We need the original raw level data to preserve binary-specific information
    const rawLevelData = getNanosaurRawLevel(data._metadata);

    if (!rawLevelData) {
      toast({
        title: "Cannot save Nanosaur 1 level",
        description: "Original level data not found in metadata",
      });
      return;
    }

    const compileResult = compileNanosaur1Level(data, rawLevelData);

    if (!compileResult.ok) {
      toast({
        title: "Failed to compile Nanosaur 1 level",
        description: compileResult.error.message,
      });
      return;
    }

    downloadBlob(compileResult.value, mapFile.name, ".ter");
    toast({
      title: "Nanosaur 1 Map Downloaded!",
    });
  } else if (globals.GAME_NAME === "Mighty Mike") {
    // Mighty Mike: Compile back to .map format
    const { mightyMikeMapToCompressedBinary } = await import("@/modelParsers/parseMightyMike");

    // Extract Mighty Mike-specific data from metadata
    const mightyMikeData = getMightyMikeMapData(data._metadata);

    if (!mightyMikeData) {
      toast({
        title: "Cannot save Mighty Mike level",
        description: "Original level data not found in metadata",
      });
      return;
    }

    const mapBuffer = mightyMikeMapToCompressedBinary(mightyMikeData);
    downloadBlob(mapBuffer, mapFile.name, ".map");
    toast({
      title: "Mighty Mike Map Downloaded!",
    });
  } else {
    const mapBuffer = await processMapData({ data, globals });
    console.log("test\n\n\n");
    downloadBlob(mapBuffer, mapFile.name, ".ter.rsrc");
    toast({
      title: "Map Downloaded!",
    });
  }
}

function downloadBlob(buffer: ArrayBuffer, filename: string, mime: string) {
  const blob = new Blob([buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.setAttribute("download", filename);
  downloadLink.click();
}

async function processMapData({
  data,
  globals,
}: {
  data: LevelData;
  globals: GlobalsInterface;
}): Promise<ArrayBuffer> {
  console.log("saving");
  console.log(data);
  // Validate the JSON before passing to rsrcdump to avoid uncaught errors
  const sanitized = sanitizeResourceForkJson(data);
  const validation = validateResourceForkJson(sanitized);
  if (!validation.ok) {
    console.error("Invalid JSON for resource fork:", validation);
    toast({
      title: "Saving failed",
      description: `Invalid map data structure: ${validation.message}`,
    });
    return new ArrayBuffer(0);
  }

  const saveResult = loadBytesFromJson(sanitized, globals.STRUCT_SPECS, [], [], true);

  if (!saveResult.ok) {
    console.error("Failed to serialize:", saveResult.error);
    toast({
      title: "Saving failed",
      description: saveResult.error,
    });
    return new ArrayBuffer(0);
  }

  return saveResult.value.buffer;
}

async function compressMapImages(
  mapImages: HTMLCanvasElement[],
): Promise<DataView[]> {
  return new Promise((res, err) => {
    const compressedTextures: DataView[] = new Array(mapImages.length);
    const resolvedTextures = { count: 0 };
    console.time("compress");
    for (let i = 0; i < mapImages.length; i++) {
      const canvas = mapImages[i];
      if (!canvas) {
        err(new Error(`Canvas at index ${i} is undefined`));
        return;
      }
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) {
        err(new Error("Could not get canvas context"));
        return;
      }
      const imageData = canvasCtx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const lzssWorker = new LzssWorker();
      lzssWorker.onmessage = (e: MessageEvent<LzssResponse>) => {
        const data = e.data;
        if (data.type !== "compressRes") return;
        compressedTextures[data.id] = new DataView(data.dataBuffer);
        resolvedTextures.count++;
        if (resolvedTextures.count === mapImages.length) {
          console.timeEnd("compress");
          res(compressedTextures);
        }
        lzssWorker.terminate();
      };
      lzssWorker.postMessage(
        {
          uIntArray: imageData.data,
          type: "compress",
          id: i,
        } satisfies LzssMessage,
        [imageData.data.buffer],
      );
    }
  });
}

function combineBuffersForDownload(bufferList: DataView[]): ArrayBuffer {
  let totalSize = 0;
  for (const buffer of bufferList) {
    totalSize += 4 + buffer.byteLength; // 4 bytes for size header + buffer size
  }
  const imageDownloadBuffer = new DataView(new ArrayBuffer(totalSize));
  let pos2 = 0;
  for (let i = 0; i < bufferList.length; i++) {
    const buffer = bufferList[i];
    if (!buffer) continue;
    imageDownloadBuffer.setInt32(pos2, buffer.byteLength);
    pos2 += 4;
    for (let j = 0; j < buffer.byteLength; j++) {
      imageDownloadBuffer.setUint8(pos2, buffer.getUint8(j));
      pos2++;
    }
  }
  return imageDownloadBuffer.buffer;
}
