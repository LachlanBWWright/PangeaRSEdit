import { err, ok, Result } from "neverthrow";
import { loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import type {
  LevelData,
  LevelMetadataResource,
  MetadataResource,
} from "@/python/structSpecs/LevelTypes";
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
import {
  serializeCompressedTerrainImages,
  serializeJpegTerrainImages,
} from "@/data/terrain-io/terrainImageSerialization";
import { compileNanosaur1LevelWithRust } from "./nanosaurLevelCodecWasm";
import { parseNanosaur1Level } from "@/data/processors/classicProprocessor";
import { z } from "zod";
import {
  mightyMikeTileAttributeSchema,
  mightyMikeTileSetSchema,
} from "@/schemas/common";
import {
  mightyMikeTileSetToBinary,
  type MightyMikeTilesetPreservedData,
} from "@/modelParsers/parseMightyMike";
import { regenerateDerivedLevelData } from "@/data/saveMap/regenerateDerivedLevelData";
import { metadataResourceSchema } from "@/validation/levelDataSchemas";

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

function withoutLevelMetadata(
  levelData: LevelData,
  metadataEnabled: boolean,
): LevelData {
  if (metadataEnabled) return levelData;
  const withoutMetadata = { ...levelData };
  delete withoutMetadata.Meta;
  return withoutMetadata;
}

const preservedTilesetDataSchema = z.object({
  headerPrefixBytes: z.array(z.number().int().min(0).max(255)).length(6),
  preTileDefinitionBytes: z.array(z.number().int().min(0).max(255)),
  legacyPaletteEntryCount: z.number().int().min(0).max(0xffff),
  legacyPaletteBytes: z.array(z.number().int().min(0).max(255)),
  animationNameFieldBytes: z.array(
    z.array(z.number().int().min(0).max(255)).length(16),
  ),
  trailingBytes: z.array(z.number().int().min(0).max(255)),
});

const paletteBytesSchema = z.array(z.number().int().min(0).max(255)).length(1024);
const mightyMikeXlatEntrySchema = z.object({ idx: z.number().int().min(0) });

function createDefaultMightyMikePalette(): number[] {
  return Array.from({ length: 256 }, (_, index) => [index, index, index, 255]).flat();
}

function getMightyMikeMetadataObject(
  levelData: LevelData,
): Record<string, unknown> | null {
  const metadataEntry = levelData._metadata?.[1000];
  if (!isRecord(metadataEntry) || !isRecord(metadataEntry.obj)) {
    return null;
  }
  return metadataEntry.obj;
}

function serializeMightyMikeTileset(
  levelData: LevelData,
  mapImages: readonly LevelIoImagePayload[],
): Result<Uint8Array, LevelIoError> {
  const tilesetResult = mightyMikeTileSetSchema.safeParse(levelData.tileset);
  if (!tilesetResult.success) {
    return err(
      levelIoError(
        "serialize.failed",
        "Missing or invalid Mighty Mike tileset data",
      ),
    );
  }
  const metadata = getMightyMikeMetadataObject(levelData);
  const preservedResult = preservedTilesetDataSchema.safeParse(
    metadata?.mightyMikeTilesetPreservedData,
  );
  const paletteResult = paletteBytesSchema.safeParse(
    metadata?.mightyMikePaletteRgbaBytes,
  );
  const parsedTileset = tilesetResult.data;
  const editorAttributesResult = z
    .array(mightyMikeTileAttributeSchema)
    .safeParse(levelData.Atrb?.[1000]?.obj);
  const editorXlatResult = z
    .array(mightyMikeXlatEntrySchema)
    .safeParse(levelData.Xlat?.[1000]?.obj);
  const tileAttributes = editorAttributesResult.success
    ? editorAttributesResult.data
    : parsedTileset.tileAttributes;
  const xlateTable = editorXlatResult.success
    ? editorXlatResult.data.map((entry) => entry.idx)
    : parsedTileset.xlateTable;
  if (tileAttributes.length !== xlateTable.length) {
    return err(
      levelIoError(
        "serialize.failed",
        "Mighty Mike tile definitions and behavior attributes are out of sync",
      ),
    );
  }
  const preservedData: MightyMikeTilesetPreservedData | undefined =
    preservedResult.success ? preservedResult.data : undefined;
  const serializationResult = mightyMikeTileSetToBinary({
    tileset: {
      numTileDefinitions: parsedTileset.numTileDefinitions,
      numXlateEntries: parsedTileset.numXlateEntries,
      numTileAttributeEntries: parsedTileset.numTileAttributeEntries,
      numTileAnims: parsedTileset.numTileAnims,
      numTileXparentColors: parsedTileset.numTileXparentColors,
      xlateTable,
      tileAttributes,
      tileAnimations: parsedTileset.tileAnimations,
      transparencyColors: parsedTileset.transparencyColors,
    },
    tileImages: mapImages,
    paletteRgbaBytes: paletteResult.success
      ? paletteResult.data
      : createDefaultMightyMikePalette(),
    tilePaletteIndices: parsedTileset.paletteIndices,
    preservedData,
  });
  if (serializationResult.isErr()) {
    return err(levelIoError("serialize.failed", serializationResult.error));
  }
  return ok(new Uint8Array(serializationResult.value));
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
  metadataEnabled: boolean,
): Result<Uint8Array, LevelIoError> {
  const sanitized = prepareMetadataResourceForFork(
    sanitizeResourceForkJson(withoutLevelMetadata(levelData, metadataEnabled)),
  );
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

function metadataResourceToHex(resource: LevelMetadataResource): string {
  const encoded = new TextEncoder().encode(JSON.stringify(resource));
  let hex = "";
  for (const byte of encoded) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function prepareMetadataResourceForFork(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const metaContainer = data.Meta;
  if (!isRecord(metaContainer)) return data;
  const entry = metaContainer[1000];
  if (!isRecord(entry) || !isRecord(entry.obj)) return data;
  const metadataResourceResult = metadataResourceSchema.safeParse(entry.obj);
  if (!metadataResourceResult.success) return data;
  return {
    ...data,
    Meta: {
      1000: {
        name: typeof entry.name === "string" ? entry.name : "Level Metadata",
        data: metadataResourceToHex(metadataResourceResult.data),
        order: typeof entry.order === "number" ? entry.order : 0,
      },
    },
  };
}

export function serializeMetadataResourceForkBytes(
  metadataResource: MetadataResource,
  globals: GlobalsInterface,
): Result<Uint8Array, LevelIoError> {
  const sanitized = {
    _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
    Meta: {
      1000: {
        name: "Level Metadata",
        data: metadataResourceToHex(metadataResource[1000].obj),
        order: metadataResource[1000].order,
      },
    },
  };
  const validation = validateResourceForkJson(sanitized);
  if (validation.isErr()) {
    return err(
      levelIoError(
        "serialize.failed",
        `Invalid Meta resource: ${validation.error.message}`,
      ),
    );
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

export function getMetadataCompanionFilename(
  fileName: string,
  game: Game,
): string {
  if (game === Game.MIGHTY_MIKE) return `${fileName}.Meta.rsrc`;

  const extensionIndex = fileName.lastIndexOf(".");
  const baseName = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
  return `${baseName}.Meta.rsrc`;
}

async function serializePrimaryMapBytes(
  levelData: LevelData,
  globals: GlobalsInterface,
  strictRustNanosaur: boolean,
): Promise<Result<Uint8Array, LevelIoError>> {
  if (globals.GAME_TYPE === Game.NANOSAUR) {
    const metadata = isRecord(levelData._metadata) ? levelData._metadata : undefined;
    const rawBytesCandidate = metadata?.nanosaur1RawBytes;
    if (rawBytesCandidate instanceof ArrayBuffer) {
      const compileRustResult = await compileNanosaur1LevelWithRust(
        levelData,
        rawBytesCandidate,
      );
      if (compileRustResult.isOk()) {
        return ok(new Uint8Array(compileRustResult.value));
      }
      if (strictRustNanosaur) {
        return err(
          levelIoError(
            "serialize.failed",
            `Nanosaur Rust compiler failed: ${compileRustResult.error}`,
          ),
        );
      }

      const parsedRawLevel = parseNanosaur1Level(rawBytesCandidate);
      const compileFallbackResult = compileNanosaur1Level(levelData, parsedRawLevel);
      if (compileFallbackResult.isErr()) {
        return err(levelIoError("serialize.failed", compileFallbackResult.error));
      }
      return ok(new Uint8Array(compileFallbackResult.value));
    }

    const rawLevelCandidate = metadata?.nanosaur1RawLevel;
    const rawLevel = isNanosaur1LevelData(rawLevelCandidate)
      ? rawLevelCandidate
      : null;
    if (!rawLevel) {
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

  return Promise.resolve(serializeResourceForkBytes(levelData, globals, [], true));
}

export async function serializeLevelDownloadBytes(
  options: {
    readonly levelData: unknown;
    readonly globals: GlobalsInterface;
    readonly fileName: string;
    readonly mapImagesFileName?: string;
    readonly mapImages: readonly LevelIoImagePayload[];
    readonly levelMetadataEnabled?: boolean;
    readonly strictRustNanosaur?: boolean;
    readonly reuseLevelBytes?: Uint8Array;
    readonly reuseTextureBytes?: Uint8Array;
    readonly reuseCombinedBytes?: Uint8Array;
  },
  onProgress?: (progress: LevelIoProgress) => void,
): Promise<Result<readonly LevelIoSerializedFile[], LevelIoError>> {
  if (!isLevelDataLike(options.levelData)) {
    return err(levelIoError("serialize.failed", "Level data is not valid"));
  }
  const clonedLevelData = structuredClone(options.levelData);
  regenerateDerivedLevelData(clonedLevelData);
  const levelData = withoutLevelMetadata(
    clonedLevelData,
    options.levelMetadataEnabled ?? true,
  );

  notify(onProgress, {
    stage: "serialize.resource-fork",
    message: "Serializing level data",
  });

  if (options.globals.DATA_TYPE === DataType.TRT_FILE) {
    const mapBytesResult = options.reuseLevelBytes
      ? ok(options.reuseLevelBytes)
      : await serializePrimaryMapBytes(levelData, options.globals, options.strictRustNanosaur ?? true);
    if (mapBytesResult.isErr()) {
      return err(mapBytesResult.error);
    }
    const textureBytesResult = options.reuseTextureBytes
      ? ok(options.reuseTextureBytes.buffer)
      : serializeNanosaurTileImages(options.mapImages);
    if (textureBytesResult.isErr()) {
      return err(levelIoError("serialize.failed", textureBytesResult.error));
    }
    const files: LevelIoSerializedFile[] = [
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
    ];
    const metadataResult = levelData.Meta
      ? serializeMetadataResourceForkBytes(levelData.Meta, options.globals)
      : ok<Uint8Array | undefined, LevelIoError>(undefined);
    if (metadataResult.isErr()) return err(metadataResult.error);
    if (metadataResult.value) {
      files.push({
        filename: getMetadataCompanionFilename(
          options.fileName,
          options.globals.GAME_TYPE,
        ),
        extension: ".rsrc",
        bytes: metadataResult.value,
      });
    }
    return ok(files);
  }

  if (options.globals.DATA_TYPE === DataType.RSRC_FORK) {
    const resourceBytes = options.reuseCombinedBytes && (options.levelMetadataEnabled ?? true)
      ? ok(options.reuseCombinedBytes)
      : serializeResourceForkBytes(
          levelData,
          options.globals,
          options.mapImages,
          options.levelMetadataEnabled ?? true,
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
    const mapBytesResult = options.reuseLevelBytes
      ? ok(options.reuseLevelBytes)
      : await serializePrimaryMapBytes(levelData, options.globals, options.strictRustNanosaur ?? true);
    if (mapBytesResult.isErr()) {
      return err(mapBytesResult.error);
    }
    const tilesetBytesResult = options.reuseTextureBytes
      ? ok(options.reuseTextureBytes)
      : serializeMightyMikeTileset(levelData, options.mapImages);
    if (tilesetBytesResult.isErr()) {
      return err(tilesetBytesResult.error);
    }
    const files: LevelIoSerializedFile[] = [
      {
        filename: options.fileName,
        extension: ".map",
        bytes: mapBytesResult.value,
      },
      {
        filename: options.mapImagesFileName ?? options.fileName,
        extension: ".tileset",
        bytes: tilesetBytesResult.value,
      },
    ];
    const metadataResult = levelData.Meta
      ? serializeMetadataResourceForkBytes(levelData.Meta, options.globals)
      : ok<Uint8Array | undefined, LevelIoError>(undefined);
    if (metadataResult.isErr()) return err(metadataResult.error);
    if (metadataResult.value) {
      files.push({
        filename: getMetadataCompanionFilename(
          options.fileName,
          options.globals.GAME_TYPE,
        ),
        extension: ".rsrc",
        bytes: metadataResult.value,
      });
    }
    return ok(files);
  }

  const resourceBytes = options.reuseLevelBytes && (options.levelMetadataEnabled ?? true)
    ? ok(options.reuseLevelBytes)
    : serializeResourceForkBytes(
        levelData,
        options.globals,
        [],
        options.levelMetadataEnabled ?? true,
      );
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

  if (options.mapImages.length > 0) {
    const textureBytes = options.reuseTextureBytes
      ? ok(options.reuseTextureBytes)
      : options.globals.TILE_IMAGE_FORMAT === TileImageFormat.JPG
        ? await serializeJpegTerrainImages(options.mapImages, onProgress)
        : await serializeCompressedTerrainImages(options.mapImages, onProgress);
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
    readonly levelMetadataEnabled?: boolean;
    readonly strictRustNanosaur?: boolean;
    readonly reuseLevelBytes?: Uint8Array;
    readonly reuseTextureBytes?: Uint8Array;
    readonly reuseCombinedBytes?: Uint8Array;
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
  const levelData = withoutLevelMetadata(
    options.levelData,
    options.levelMetadataEnabled ?? true,
  );

  if (options.globals.DATA_TYPE === DataType.RSRC_FORK) {
    const rsrcBytes = options.reuseCombinedBytes && (options.levelMetadataEnabled ?? true)
      ? ok(options.reuseCombinedBytes)
      : serializeResourceForkBytes(
          levelData,
          options.globals,
          options.mapImages,
          options.levelMetadataEnabled ?? true,
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
    const mapBytes = options.reuseLevelBytes
      ? ok(options.reuseLevelBytes)
      : await serializePrimaryMapBytes(levelData, options.globals, options.strictRustNanosaur ?? true);
    if (mapBytes.isErr()) {
      return err(levelIoError("preview.failed", mapBytes.error.message));
    }
    const textureBytes = options.reuseTextureBytes
      ? ok(options.reuseTextureBytes.buffer)
      : options.mapImages.length === 0
        ? ok<ArrayBuffer, string>(new ArrayBuffer(0))
        : serializeNanosaurTileImages(options.mapImages);
    if (textureBytes.isErr()) {
      return err(levelIoError("preview.failed", textureBytes.error));
    }
    const metadataResult = levelData.Meta
      ? serializeMetadataResourceForkBytes(levelData.Meta, options.globals)
      : ok<Uint8Array | undefined, LevelIoError>(undefined);
    if (metadataResult.isErr()) {
      return err(metadataResult.error);
    }
    notify(onProgress, {
      stage: "preview.ready",
      message: "Preview bytes are ready",
    });
    return ok({
      dataBytes: mapBytes.value,
      rsrcBytes: metadataResult.value ?? null,
      textureBytes:
        textureBytes.value.byteLength > 0
          ? new Uint8Array(textureBytes.value)
          : null,
    });
  }

  if (options.globals.DATA_TYPE === DataType.STANDARD) {
    const rsrcBytes = options.reuseLevelBytes && (options.levelMetadataEnabled ?? true)
      ? ok(options.reuseLevelBytes)
      : serializeResourceForkBytes(
          levelData,
          options.globals,
          [],
          options.levelMetadataEnabled ?? true,
        );
    if (rsrcBytes.isErr()) {
      return err(levelIoError("preview.failed", rsrcBytes.error.message));
    }
    const dataBytes = options.reuseTextureBytes
      ? ok(options.reuseTextureBytes)
      : options.mapImages.length === 0
        ? ok<Uint8Array, LevelIoError>(new Uint8Array(0))
        : options.globals.TILE_IMAGE_FORMAT === TileImageFormat.JPG
          ? await serializeJpegTerrainImages(options.mapImages, onProgress)
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
    const dataBytes = options.reuseLevelBytes
      ? ok(options.reuseLevelBytes)
      : await serializePrimaryMapBytes(levelData, options.globals, options.strictRustNanosaur ?? true);
    if (dataBytes.isErr()) {
      return err(levelIoError("preview.failed", dataBytes.error.message));
    }
    const tilesetBytes = options.reuseTextureBytes
      ? ok(options.reuseTextureBytes)
      : serializeMightyMikeTileset(levelData, options.mapImages);
    if (tilesetBytes.isErr()) {
      return err(levelIoError("preview.failed", tilesetBytes.error.message));
    }
    notify(onProgress, {
      stage: "preview.ready",
      message: "Preview bytes are ready",
    });
    return ok({
      dataBytes: dataBytes.value,
      rsrcBytes: null,
      textureBytes: tilesetBytes.value,
    });
  }

  const rsrcBytes = serializeResourceForkBytes(
    levelData,
    options.globals,
    [],
    options.levelMetadataEnabled ?? true,
  );
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
