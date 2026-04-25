import { LevelData } from "@/python/structSpecs/LevelTypes";
import {
  DataType,
  Game,
  TileImageFormat,
  type GlobalsInterface,
} from "../globals/globals";
import { validateResourceForkJson } from "../utils/levelDataUtils";
import { loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import type { Nanosaur1LevelData } from "@/data/processors/classicProprocessor";
import { sanitizeResourceForkJson } from "../utils/levelDataUtils";
import { err, ok } from "neverthrow";
import { compileNanosaur1Level } from "@/editor/loadLogic/compileNanosaur1Level";
import { serializeMightyMikeLevel } from "@/editor/loadLogic/parseMightyMikeFile";
import { serializeNanosaurTerrainTextures } from "@/data/processors/classicProprocessor";
import {
  compressMapImages,
  combineBuffersForDownload,
  downloadBlob,
  processMapData,
} from "./saveMapHelpers";
import { recordSchema, plainObjectSchema } from "@/schemas/common";

function isRecord(value: unknown): value is Record<string | number, unknown> {
  return recordSchema.safeParse(value).success;
}

function isNanosaur1LevelData(value: unknown): value is Nanosaur1LevelData {
  const parseResult = plainObjectSchema.safeParse(value);
  if (!parseResult.success) {
    return false;
  }
  const obj = parseResult.data;
  return (
    "header" in obj &&
    "textureLayer" in obj &&
    "objectList" in obj
  );
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
    const result = serializeMightyMikeLevel(combinedData);
    if (result.isErr()) return null;
    return new Blob([result.value], { type: ".map" });
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
 * Uses the same serializers as the download path, but returns the bytes for
 * injection into the Emscripten virtual filesystem instead of saving them to disk.
 *
 * Returns:
 *   dataBytes    – bytes for the data-fork path (.ter images for STANDARD/LZSS,
 *                  compiled terrain for TRT_FILE, null otherwise)
 *   rsrcBytes    – bytes for the resource-fork sidecar (.ter.rsrc map data for
 *                  STANDARD/LZSS and RSRC_FORK, null otherwise)
 *   textureBytes – bytes for a secondary texture file such as Nanosaur 1's
 *                  .trt tileset, null otherwise
 *
 * Returns null when serialization fails (callers should abort the preview).
 */
export async function buildPreviewTerrainBlobs(
  data: LevelData,
  globals: GlobalsInterface,
  mapImages: HTMLCanvasElement[] | undefined,
): Promise<{
  dataBytes: Uint8Array | null;
  rsrcBytes: Uint8Array | null;
  textureBytes: Uint8Array | null;
} | null> {
  if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    const rsrcBuffer = await processMapData({ data, globals, mapImages });
    if (rsrcBuffer.byteLength === 0) return null;
    return {
      dataBytes: null,
      rsrcBytes: new Uint8Array(rsrcBuffer),
      textureBytes: null,
    };
  }

  if (globals.DATA_TYPE === DataType.TRT_FILE) {
    const mapBlob = serializePrimaryMapBlob(data, globals);
    if (!mapBlob) return null;
    const mapBuffer = await mapBlob.arrayBuffer();
    if (!mapImages || mapImages.length === 0) {
      return {
        dataBytes: new Uint8Array(mapBuffer),
        rsrcBytes: null,
        textureBytes: null,
      };
    }
    const textureResult = serializeNanosaurTerrainTextures(mapImages);
    if (textureResult.isErr()) return null;
    return {
      dataBytes: new Uint8Array(mapBuffer),
      rsrcBytes: null,
      textureBytes: new Uint8Array(textureResult.value),
    };
  }

  if (
    globals.DATA_TYPE === DataType.STANDARD &&
    globals.TILE_IMAGE_FORMAT !== TileImageFormat.JPG
  ) {
    const rsrcBuffer = await processMapData({ data, globals, mapImages });
    if (rsrcBuffer.byteLength === 0) return null;

    if (!mapImages || mapImages.length === 0) {
      // Tile images not available — inject map layout only, game uses preloaded tile textures.
      return {
        dataBytes: null,
        rsrcBytes: new Uint8Array(rsrcBuffer),
        textureBytes: null,
      };
    }

    const bufferList = await compressMapImages(mapImages);
    const imageBuffer = combineBuffersForDownload(bufferList);
    return {
      dataBytes: new Uint8Array(imageBuffer),
      rsrcBytes: new Uint8Array(rsrcBuffer),
      textureBytes: null,
    };
  }

  if (globals.DATA_TYPE === DataType.MIGHTY_MIKE) {
    const result = serializeMightyMikeLevel(data);
    if (result.isErr()) return null;
    return {
      dataBytes: new Uint8Array(result.value),
      rsrcBytes: null,
      textureBytes: null,
    };
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
    return {
      dataBytes: null,
      rsrcBytes: new Uint8Array(rsrcBuffer),
      textureBytes: null,
    };
  }

  return { dataBytes: null, rsrcBytes: null, textureBytes: null };
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
  if (!mapFile || (globals.DATA_TYPE !== DataType.RSRC_FORK && !mapImagesFile))
    return;

  if (globals.DATA_TYPE === DataType.TRT_FILE) {
    if (!mapImages || mapImages.length === 0) {
      toast({
        title: "Cannot save Nanosaur 1 level",
        description: "No tile images are loaded.",
      });
      return;
    }

    const textureResult = serializeNanosaurTerrainTextures(mapImages);
    if (textureResult.isErr()) {
      toast({
        title: "Failed to serialize Nanosaur 1 texture file",
        description: textureResult.error.message,
      });
      return;
    }

    downloadBlob(
      textureResult.value,
      mapImagesFile?.name || mapFile.name,
      ".trt",
    );
    toast({
      title: "Nanosaur 1 Map Downloaded!",
    });
    return;
  }

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
    const mapBuffer = await processMapData({ data, globals, mapImages });
    downloadBlob(mapBuffer, mapFile.name, ".ter.rsrc");
    toast({
      title: "Map Downloaded!",
    });
  } else if (globals.GAME_NAME === "Mighty Mike") {
    const serializeResult = serializeMightyMikeLevel(data);
    if (serializeResult.isErr()) {
      toast({
        title: "Cannot save Mighty Mike level",
        description: serializeResult.error.message,
      });
      return;
    }

    downloadBlob(serializeResult.value, mapFile.name, ".map");
    toast({
      title: "Mighty Mike Map Downloaded!",
    });
  } else {
    const mapBuffer = await processMapData({ data, globals, mapImages });
    downloadBlob(mapBuffer, mapFile.name, ".ter.rsrc");
    toast({
      title: "Map Downloaded!",
    });
  }
}
