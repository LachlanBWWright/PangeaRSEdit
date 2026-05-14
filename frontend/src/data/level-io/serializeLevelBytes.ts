import { err, ok, Result } from "neverthrow";
import { loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import type { LevelData } from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import { DataType, Game, TileImageFormat } from "@/data/globals/globals";
import {
  sanitizeResourceForkJson,
  validateResourceForkJson,
  isLevelDataLike,
} from "@/data/utils/levelDataUtils";
import { compileNanosaur1Level } from "@/editor/loadLogic/compileNanosaur1Level";
import {
  serializeMightyMikeLevel,
} from "@/editor/loadLogic/parseMightyMikeFile";
import { imageDataToSixteenBit } from "@/utils/imageConverter";
import type {
  LevelIoImagePayload,
  LevelIoProgress,
  LevelIoSerializedFile,
} from "./levelIoTypes";
import { levelIoError, type LevelIoError } from "./levelIoErrors";
import { mapErr } from "@/utils/mapErr";
import { isRecord, isNanosaur1LevelData } from "@/editor/loadLogic/typeGuards";
import { serializeCompressedTerrainImages } from "@/data/terrain-io/terrainImageSerialization";

function notify(
  onProgress: ((progress: LevelIoProgress) => void) | undefined,
  progress: LevelIoProgress,
): void {
  onProgress?.(progress);
}

function cloneUint8Array(bytes: Uint8Array): Uint8Array {
  const clone = new Uint8Array(bytes.byteLength);
  clone.set(bytes);
  return clone;
}

function serializeBugdomTileImages(
  mapImages: readonly LevelIoImagePayload[],
): Result<string, string> {
  const chunks: string[] = [];
  for (const [index, image] of mapImages.entries()) {
    if (!image) {
      return err(`Missing tile image #${index}`);
    }
    const sixteenBit = imageDataToSixteenBit(new Uint8ClampedArray(image.rgbaBytes));
    const bytes = new Uint8Array(
      sixteenBit.buffer,
      sixteenBit.byteOffset,
      sixteenBit.byteLength,
    );
    let tileHex = "";
    for (const byte of bytes) {
      tileHex += byte.toString(16).padStart(2, "0");
    }
    chunks.push(tileHex);
  }
  return ok(chunks.join(""));
}

function serializeNanosaurTileImages(
  mapImages: readonly LevelIoImagePayload[],
): Result<ArrayBuffer, string> {
  const totalLength = 4 + mapImages.length * 32 * 32 * 2;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  view.setInt32(0, mapImages.length, false);
  let offset = 4;
  for (const [index, image] of mapImages.entries()) {
    if (!image) {
      return err(`Missing tile image #${index}`);
    }
    if (image.width !== 32 || image.height !== 32) {
      return err(`Tile image #${index} must be 32x32`);
    }
    const encoded = imageDataToSixteenBit(new Uint8ClampedArray(image.rgbaBytes));
    new Uint8Array(buffer, offset, encoded.byteLength).set(
      new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength),
    );
    offset += encoded.byteLength;
  }
  return ok(buffer);
}

function serializeResourceForkBytes(
  levelData: LevelData,
  globals: GlobalsInterface,
  mapImages: readonly LevelIoImagePayload[],
): Result<Uint8Array, LevelIoError> {
  const sanitized = sanitizeResourceForkJson(levelData);
  const validation = validateResourceForkJson(sanitized);
  if (validation.isErr()) {
    return err(
      levelIoError(
        "serialize.failed",
        `Invalid map data structure: ${validation.error.message}`,
      ),
    );
  }

  if (globals.DATA_TYPE === DataType.RSRC_FORK && mapImages.length > 0) {
    const tileDataResult = serializeBugdomTileImages(mapImages);
    if (tileDataResult.isErr()) {
      return err(levelIoError("serialize.failed", tileDataResult.error));
    }
    const timgContainer = isRecord(sanitized.Timg) ? sanitized.Timg : {};
    const existingEntry = isRecord(timgContainer[1000]) ? timgContainer[1000] : {};
    sanitized.Timg = {
      ...timgContainer,
      1000: {
        name:
          typeof existingEntry.name === "string"
            ? existingEntry.name
            : "Extracted Tile Image Data 32x32/16bit",
        order:
          typeof existingEntry.order === "number" ? existingEntry.order : 1000,
        data: tileDataResult.value,
      },
    };
  }

  const saveResult = Result.fromThrowable(
    () => loadBytesFromJson(sanitized, globals.STRUCT_SPECS, [], [], true),
    mapErr,
  )();
  if (saveResult.isErr()) {
    return err(levelIoError("serialize.failed", saveResult.error));
  }
  if (!saveResult.value.ok) {
    return err(levelIoError("serialize.failed", String(saveResult.value.error)));
  }
  return ok(cloneUint8Array(saveResult.value.value));
}

function serializePrimaryMapBytes(
  levelData: LevelData,
  globals: GlobalsInterface,
): Result<Uint8Array, LevelIoError> {
  if (globals.GAME_TYPE === Game.NANOSAUR) {
    const metadata = isRecord(levelData._metadata) ? levelData._metadata : undefined;
    const rawLevel = metadata?.nanosaur1RawLevel;
    if (!isNanosaur1LevelData(rawLevel)) {
      return err(
        levelIoError(
          "serialize.failed",
          "Missing original raw Nanosaur 1 data for serialization",
        ),
      );
    }
    const compileResult = compileNanosaur1Level(levelData, rawLevel);
    if (compileResult.isErr()) {
      return err(levelIoError("serialize.failed", compileResult.error));
    }
    return ok(new Uint8Array(compileResult.value));
  }

  if (globals.GAME_TYPE === Game.MIGHTY_MIKE) {
    const serializeResult = serializeMightyMikeLevel(levelData);
    if (serializeResult.isErr()) {
      return err(levelIoError("serialize.failed", serializeResult.error));
    }
    return ok(new Uint8Array(serializeResult.value));
  }

  return serializeResourceForkBytes(levelData, globals, []);
}

export async function serializeLevelDownloadBytes(
  options: {
    readonly levelData: unknown;
    readonly globals: GlobalsInterface;
    readonly fileName: string;
    readonly mapImagesFileName?: string;
    readonly mapImages: readonly LevelIoImagePayload[];
  },
  onProgress?: (progress: LevelIoProgress) => void,
): Promise<Result<readonly LevelIoSerializedFile[], LevelIoError>> {
  if (!isLevelDataLike(options.levelData)) {
    return err(levelIoError("serialize.failed", "Level data is not valid"));
  }
  const levelData = options.levelData;

  notify(onProgress, {
    stage: "serialize.resource-fork",
    message: "Serializing level data",
  });

  if (options.globals.DATA_TYPE === DataType.TRT_FILE) {
    const mapBytesResult = serializePrimaryMapBytes(levelData, options.globals);
    if (mapBytesResult.isErr()) {
      return err(mapBytesResult.error);
    }
    const textureBytesResult = serializeNanosaurTileImages(options.mapImages);
    if (textureBytesResult.isErr()) {
      return err(levelIoError("serialize.failed", textureBytesResult.error));
    }
    return ok([
      {
        filename: options.fileName,
        extension: ".ter",
        bytes: mapBytesResult.value,
      },
      {
        filename: options.mapImagesFileName ?? options.fileName,
        extension: ".trt",
        bytes: new Uint8Array(textureBytesResult.value),
      },
    ]);
  }

  if (options.globals.DATA_TYPE === DataType.RSRC_FORK) {
    const resourceBytes = serializeResourceForkBytes(
      levelData,
      options.globals,
      options.mapImages,
    );
    if (resourceBytes.isErr()) {
      return err(resourceBytes.error);
    }
    return ok([
      {
        filename: options.fileName,
        extension: ".ter.rsrc",
        bytes: resourceBytes.value,
      },
    ]);
  }

  if (options.globals.DATA_TYPE === DataType.MIGHTY_MIKE) {
    const mapBytesResult = serializePrimaryMapBytes(levelData, options.globals);
    if (mapBytesResult.isErr()) {
      return err(mapBytesResult.error);
    }
    return ok([
      {
        filename: options.fileName,
        extension: ".map",
        bytes: mapBytesResult.value,
      },
    ]);
  }

  const resourceBytes = serializeResourceForkBytes(levelData, options.globals, []);
  if (resourceBytes.isErr()) {
    return err(resourceBytes.error);
  }

  const files: LevelIoSerializedFile[] = [
    {
      filename: options.fileName,
      extension: ".ter.rsrc",
      bytes: resourceBytes.value,
    },
  ];

  if (
    options.globals.TILE_IMAGE_FORMAT !== TileImageFormat.JPG &&
    options.mapImages.length > 0
  ) {
    const textureBytes = await serializeCompressedTerrainImages(
      options.mapImages,
      onProgress,
    );
    if (textureBytes.isErr()) {
      return err(textureBytes.error);
    }
    files.push({
      filename: options.mapImagesFileName ?? "images",
      extension: ".ter",
      bytes: textureBytes.value,
    });
  }

  return ok(files);
}

export async function preparePreviewLevelBytes(
  options: {
    readonly levelData: unknown;
    readonly globals: GlobalsInterface;
    readonly mapImages: readonly LevelIoImagePayload[];
  },
  onProgress?: (progress: LevelIoProgress) => void,
): Promise<
  Result<
    {
      readonly dataBytes: Uint8Array | null;
      readonly rsrcBytes: Uint8Array | null;
      readonly textureBytes: Uint8Array | null;
    },
    LevelIoError
  >
> {
  if (!isLevelDataLike(options.levelData)) {
    return err(levelIoError("preview.failed", "Level data is not valid"));
  }
  const levelData = options.levelData;

  if (options.globals.DATA_TYPE === DataType.RSRC_FORK) {
    const rsrcBytes = serializeResourceForkBytes(
      levelData,
      options.globals,
      options.mapImages,
    );
    if (rsrcBytes.isErr()) {
      return err(levelIoError("preview.failed", rsrcBytes.error.message));
    }
    notify(onProgress, {
      stage: "preview.ready",
      message: "Preview bytes are ready",
    });
    return ok({ dataBytes: null, rsrcBytes: rsrcBytes.value, textureBytes: null });
  }

  if (options.globals.DATA_TYPE === DataType.TRT_FILE) {
    const mapBytes = serializePrimaryMapBytes(levelData, options.globals);
    if (mapBytes.isErr()) {
      return err(levelIoError("preview.failed", mapBytes.error.message));
    }
    const textureBytes =
      options.mapImages.length === 0
        ? ok<ArrayBuffer, string>(new ArrayBuffer(0))
        : serializeNanosaurTileImages(options.mapImages);
    if (textureBytes.isErr()) {
      return err(levelIoError("preview.failed", textureBytes.error));
    }
    notify(onProgress, {
      stage: "preview.ready",
      message: "Preview bytes are ready",
    });
    return ok({
      dataBytes: mapBytes.value,
      rsrcBytes: null,
      textureBytes:
        textureBytes.value.byteLength > 0
          ? new Uint8Array(textureBytes.value)
          : null,
    });
  }

  if (
    options.globals.DATA_TYPE === DataType.STANDARD &&
    options.globals.TILE_IMAGE_FORMAT !== TileImageFormat.JPG
  ) {
    const rsrcBytes = serializeResourceForkBytes(levelData, options.globals, []);
    if (rsrcBytes.isErr()) {
      return err(levelIoError("preview.failed", rsrcBytes.error.message));
    }
    const dataBytes =
      options.mapImages.length === 0
        ? ok<Uint8Array, LevelIoError>(new Uint8Array(0))
        : await serializeCompressedTerrainImages(options.mapImages, onProgress);
    if (dataBytes.isErr()) {
      return err(levelIoError("preview.failed", dataBytes.error.message));
    }
    notify(onProgress, {
      stage: "preview.ready",
      message: "Preview bytes are ready",
    });
    return ok({
      dataBytes: dataBytes.value.byteLength > 0 ? dataBytes.value : null,
      rsrcBytes: rsrcBytes.value,
      textureBytes: null,
    });
  }

  if (options.globals.DATA_TYPE === DataType.MIGHTY_MIKE) {
    const dataBytes = serializePrimaryMapBytes(levelData, options.globals);
    if (dataBytes.isErr()) {
      return err(levelIoError("preview.failed", dataBytes.error.message));
    }
    notify(onProgress, {
      stage: "preview.ready",
      message: "Preview bytes are ready",
    });
    return ok({
      dataBytes: dataBytes.value,
      rsrcBytes: null,
      textureBytes: null,
    });
  }

  const rsrcBytes = serializeResourceForkBytes(levelData, options.globals, []);
  if (rsrcBytes.isErr()) {
    return err(levelIoError("preview.failed", rsrcBytes.error.message));
  }
  notify(onProgress, {
    stage: "preview.ready",
    message: "Preview bytes are ready",
  });
  return ok({
    dataBytes: null,
    rsrcBytes: rsrcBytes.value,
    textureBytes: null,
  });
}
