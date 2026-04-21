import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import LzssWorker from "../../utils/lzssWorker?worker";
import { LevelData, type LevelMetadata } from "@/python/structSpecs/LevelTypes";
import {
  DataType,
  Game,
  TileImageFormat,
  type GlobalsInterface,
} from "../globals/globals";
import { validateResourceForkJson } from "../utils/levelDataUtils";
import { toast } from "../../hooks/use-toast";
import { loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import type { Nanosaur1LevelData } from "@/data/processors/classicProprocessor";
import type { MightyMikeMap } from "@/python/structSpecs/mightyMikeInterface";
import { sanitizeResourceForkJson } from "../utils/levelDataUtils";
import { err, ok } from "neverthrow";
import { compileNanosaur1Level } from "@/editor/loadLogic/compileNanosaur1Level";
import { mightyMikeMapToCompressedBinary } from "@/modelParsers/parseMightyMike";

function isRecord(value: unknown): value is Record<string | number, unknown> {
  return typeof value === "object" && value !== null;
}

function getNestedMetadata(
  metadata: LevelMetadata | undefined,
  key: string,
): Record<string, unknown> | undefined {
  const entry = metadata?.[key];
  if (isRecord(entry) && "obj" in entry) {
    const obj = (entry as Record<string, unknown>).obj;
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
  const direct = (metadata as Record<string, unknown> | undefined)
    ?.nanosaur1RawLevel;
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
  const direct = (metadata as Record<string, unknown> | undefined)
    ?.mightyMikeMapData;
  if (isMightyMikeMap(direct)) {
    return direct;
  }
  const nested = getNestedMetadata(metadata, "1000");
  const nestedMap = nested?.mightyMikeMapData;
  return isMightyMikeMap(nestedMap) ? nestedMap : undefined;
}

export function serializePrimaryMapBlob(
  data: LevelData,
  globals: GlobalsInterface,
): Blob | null {
  const cloneableCombined = isRecord(data.tileset)
    ? {
        ...data,
        tileset: Object.fromEntries(
          Object.entries(data.tileset).filter(
            ([key]) => key !== "tileImages" && key !== "collisionImages",
          ),
        ),
      }
    : data;

  const combinedData = structuredClone(cloneableCombined);

  // Keep the serialized preview aligned with the download/save path.
  if (globals.DATA_TYPE !== DataType.RSRC_FORK) {
    delete combinedData.Timg;
  }

  if (globals.GAME_TYPE === Game.NANOSAUR) {
    const metadata = isRecord(combinedData._metadata)
      ? combinedData._metadata
      : undefined;
    const rawLevelData = metadata?.nanosaur1RawLevel;
    if (!isNanosaur1LevelData(rawLevelData)) return null;

    const compileResult = compileNanosaur1Level(combinedData, rawLevelData);
    if (compileResult.isErr()) return null;
    return new Blob([compileResult.value], { type: ".ter" });
  }

  if (globals.GAME_TYPE === Game.MIGHTY_MIKE) {
    const mightyMikeData = getMightyMikeMapData(combinedData._metadata);
    if (!mightyMikeData) return null;
    return new Blob([mightyMikeMapToCompressedBinary(mightyMikeData)], {
      type: ".map",
    });
  }

  if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    const sanitized = sanitizeResourceForkJson(combinedData);
    const validation = validateResourceForkJson(sanitized);
    if (validation.isErr()) return null;

    const saveResult = loadBytesFromJson(
      sanitized,
      globals.STRUCT_SPECS,
      [],
      [],
      true,
    );
    const serializedResult = saveResult.ok
      ? ok(saveResult.value)
      : err(saveResult.error);
    if (serializedResult.isErr()) return null;

    return new Blob([serializedResult.value.slice(0)], { type: ".ter.rsrc" });
  }

  const sanitized = sanitizeResourceForkJson(combinedData);
  const validation = validateResourceForkJson(sanitized);
  if (validation.isErr()) return null;

  const saveResult = loadBytesFromJson(
    sanitized,
    globals.STRUCT_SPECS,
    [],
    [],
    true,
  );
  const serializedResult = saveResult.ok
    ? ok(saveResult.value)
    : err(saveResult.error);
  if (serializedResult.isErr()) return null;

  return new Blob([serializedResult.value.slice(0)], { type: ".ter.rsrc" });
}
/**
 * Builds the terrain byte arrays for VFS injection in the in-browser game preview.
 * Mirrors the download path exactly: the same serialization used when the user
 * clicks "Download" is used here, except the bytes are returned for injection
 * into the Emscripten virtual filesystem instead of being saved to disk.
 *
 * Returns:
 *   dataBytes  – bytes for the data-fork path (.ter images for STANDARD/LZSS,
 *                compiled level for TRT_FILE, null otherwise)
 *   rsrcBytes  – bytes for the resource-fork sidecar (.ter.rsrc map data for
 *                STANDARD/LZSS and RSRC_FORK, null otherwise)
 *
 * Returns null when serialization fails (callers should abort the preview).
 */
export async function buildPreviewTerrainBlobs(
  data: LevelData,
  globals: GlobalsInterface,
  mapImages: HTMLCanvasElement[] | undefined,
): Promise<{ dataBytes: Uint8Array | null; rsrcBytes: Uint8Array | null } | null> {
  if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    const rsrcBuffer = await processMapData({ data, globals });
    if (rsrcBuffer.byteLength === 0) return null;
    return { dataBytes: null, rsrcBytes: new Uint8Array(rsrcBuffer) };
  }

  if (globals.DATA_TYPE === DataType.TRT_FILE) {
    const rawLevelData = getNanosaurRawLevel(data._metadata);
    if (!rawLevelData) return null;
    const compileResult = compileNanosaur1Level(data, rawLevelData);
    if (compileResult.isErr()) return null;
    return { dataBytes: new Uint8Array(compileResult.value), rsrcBytes: null };
  }

  if (
    globals.DATA_TYPE === DataType.STANDARD &&
    globals.TILE_IMAGE_FORMAT !== TileImageFormat.JPG
  ) {
    const rsrcBuffer = await processMapData({ data, globals });
    if (rsrcBuffer.byteLength === 0) return null;

    if (!mapImages || mapImages.length === 0) {
      // Tile images not available — inject map layout only, game uses preloaded tile textures.
      return { dataBytes: null, rsrcBytes: new Uint8Array(rsrcBuffer) };
    }

    const bufferList = await compressMapImages(mapImages);
    const imageBuffer = combineBuffersForDownload(bufferList);
    return {
      dataBytes: new Uint8Array(imageBuffer),
      rsrcBytes: new Uint8Array(rsrcBuffer),
    };
  }

  if (globals.DATA_TYPE === DataType.MIGHTY_MIKE) {
    const mightyMikeData = getMightyMikeMapData(data._metadata);
    if (!mightyMikeData) return null;
    const buffer = mightyMikeMapToCompressedBinary(mightyMikeData);
    return { dataBytes: new Uint8Array(buffer), rsrcBytes: null };
  }

  if (
    globals.DATA_TYPE === DataType.STANDARD &&
    globals.TILE_IMAGE_FORMAT === TileImageFormat.JPG
  ) {
    // Tile images use JPEG format (e.g. Nanosaur 2) — image compression is not
    // yet implemented for preview.  Inject the map data (.ter.rsrc) so the
    // game uses the edited layout with its default preloaded tile textures.
    const rsrcBuffer = await processMapData({ data, globals });
    if (rsrcBuffer.byteLength === 0) return null;
    return { dataBytes: null, rsrcBytes: new Uint8Array(rsrcBuffer) };
  }

  return { dataBytes: null, rsrcBytes: null };
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
    // For RSRC_FORK (Bugdom 1), Timg should be embedded in `data` and rsrcdump-ts
    // serializes it into the single .ter.rsrc file. Serialize and
    // download the combined resource fork map file.
    const mapBuffer = await processMapData({ data, globals });
    downloadBlob(mapBuffer, mapFile.name, ".ter.rsrc");
    toast({
      title: "Map Downloaded!",
    });
  } else if (globals.DATA_TYPE === DataType.TRT_FILE) {
    // Nanosaur 1: Compile back to .ter format
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

    if (compileResult.isErr()) {
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
  // Validate the JSON before passing to rsrcdump to avoid uncaught errors
  const sanitized = sanitizeResourceForkJson(data);
  const validation = validateResourceForkJson(sanitized);
  if (validation.isErr()) {
    console.error("Invalid JSON for resource fork:", validation.error);
    toast({
      title: "Saving failed",
      description: `Invalid map data structure: ${validation.error.message}`,
    });
    return new ArrayBuffer(0);
  }

  const saveResult = loadBytesFromJson(sanitized, globals.STRUCT_SPECS, [], [], true);

  const serializedResult = saveResult.ok
    ? ok(saveResult.value)
    : err(saveResult.error);

  if (serializedResult.isErr()) {
    const saveErrorMsg =
      typeof serializedResult.error === "string"
        ? serializedResult.error
        : String(serializedResult.error);
    console.error("Failed to serialize:", saveErrorMsg);
    toast({
      title: "Saving failed",
      description: saveErrorMsg,
    });
    return new ArrayBuffer(0);
  }

  // loadBytesFromJson returns Uint8Array on success
  const out = serializedResult.value;
  const buffer = out.buffer;
  if (buffer instanceof ArrayBuffer) {
    return buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
  }
  // Handle SharedArrayBuffer by copying to ArrayBuffer
  const copy = new ArrayBuffer(out.byteLength);
  new Uint8Array(copy).set(new Uint8Array(buffer, out.byteOffset, out.byteLength));
  return copy;
}

async function compressMapImages(
  mapImages: HTMLCanvasElement[],
): Promise<DataView[]> {
  return new Promise((res, err) => {
    const compressedTextures: DataView[] = new Array(mapImages.length);
    const resolvedTextures = { count: 0 };
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
  for (const buffer of bufferList) {
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
