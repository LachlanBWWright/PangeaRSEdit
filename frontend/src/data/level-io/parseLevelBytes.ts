import { err, ok, Result, ResultAsync } from "neverthrow";
import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import type { LevelData, LevelMetadata } from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import { DataType } from "@/data/globals/globals";
import {
  parseNanosaur1Level,
  nanosaur1LevelToLevelData,
  extractTilesFromBuffer,
} from "@/data/processors/classicProprocessor";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import { fixNullToZero } from "@/data/processors/nullToZeroFixer";
import { validateLevelDataForGame } from "@/validation/validateLevelForGame";
import { mapErr } from "@/utils/mapErr";
import {
  getStringField,
  plainResultSchema,
  resultSchema,
} from "@/schemas/common";
import { isLevelDataLike } from "@/data/utils/levelDataUtils";
import { isRecord } from "@/editor/loadLogic/typeGuards";
import {
  parseMightyMikeMap,
  parseMightyMikeTileSet,
} from "@/modelParsers/parseMightyMike";
import type {
  MightyMikeItem,
  MightyMikeTileSet,
  MightyMikeTileAttribute,
  MightyMikeTileValue,
} from "@/python/structSpecs/mightyMikeInterface";
import { parseMightyMikeTileImagePayloads } from "@/modelParsers/parseMightyMikeHelpers";
import type {
  LevelIoImagePayload,
  LevelIoProgress,
} from "./levelIoTypes";
import { levelIoError, type LevelIoError } from "./levelIoErrors";
import { parseNanosaur1LevelWithRust } from "./nanosaurLevelCodecWasm";

function copyUint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function hexToUint8Array(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let index = 0; index < hexString.length; index += 2) {
    bytes[index / 2] = parseInt(hexString.substring(index, index + 2), 16);
  }
  return bytes;
}

function tileToImagePayload(tile: Uint16Array): LevelIoImagePayload {
  const rgbaData = new Uint8ClampedArray(tile.length * 4);
  for (let index = 0; index < tile.length; index += 1) {
    const value = tile[index] ?? 0;
    rgbaData[index * 4 + 0] = ((value >> 10) & 0x1f) << 3;
    rgbaData[index * 4 + 1] = ((value >> 5) & 0x1f) << 3;
    rgbaData[index * 4 + 2] = (value & 0x1f) << 3;
    rgbaData[index * 4 + 3] = 255;
  }
  return {
    width: 32,
    height: 32,
    rgbaBytes: copyUint8ArrayToArrayBuffer(new Uint8Array(rgbaData)),
  };
}

function normalizeSaveToJsonResult(result: unknown): Result<string, string> {
  if (
    resultSchema.safeParse(result).success &&
    result &&
    typeof result === "object"
  ) {
    const isErr = Reflect.get(result, "isErr");
    if (typeof isErr === "function" && isErr.call(result) === true) {
      return err(String(Reflect.get(result, "error")));
    }
    return ok(String(Reflect.get(result, "value") ?? ""));
  }

  const plainParseResult = plainResultSchema.safeParse(result);
  if (!plainParseResult.success) {
    return err("saveToJson returned unexpected shape");
  }
  const value = getStringField(plainParseResult.data, "value");
  if (!plainParseResult.data.ok || value.length === 0) {
    return err(String(plainParseResult.data.error));
  }
  return ok(value);
}

function parseJsonString(json: string): Result<unknown, string> {
  return Result.fromThrowable(() => JSON.parse(json), mapErr)();
}

function notify(
  onProgress: ((progress: LevelIoProgress) => void) | undefined,
  progress: LevelIoProgress,
): void {
  onProgress?.(progress);
}

async function parseRsrcLevelBytes(
  bytes: ArrayBuffer,
  globals: GlobalsInterface,
  onProgress?: (progress: LevelIoProgress) => void,
): Promise<Result<LevelData, LevelIoError>> {
  notify(onProgress, {
    stage: "parse.resource-fork",
    message: "Parsing resource fork data",
  });
  const rawResult = await ResultAsync.fromPromise(
    saveToJson(new Uint8Array(bytes), globals.STRUCT_SPECS, [], []),
    mapErr,
  );
  if (rawResult.isErr()) {
    return err(levelIoError("parse.failed", rawResult.error));
  }

  const normalizedResult = normalizeSaveToJsonResult(rawResult.value);
  if (normalizedResult.isErr()) {
    return err(levelIoError("parse.failed", normalizedResult.error));
  }

  const parsedJsonResult = parseJsonString(normalizedResult.value);
  if (parsedJsonResult.isErr()) {
    return err(levelIoError("parse.failed", parsedJsonResult.error));
  }

  if (!isRecord(parsedJsonResult.value)) {
    return err(levelIoError("parse.failed", "Parsed level data is not an object"));
  }

  const parsedLevelData = parsedJsonResult.value;
  fixNullToZero(parsedLevelData);
  const preprocessResult = preprocessJson(parsedLevelData, globals);
  if (preprocessResult.isErr()) {
    return err(levelIoError("parse.failed", String(preprocessResult.error)));
  }
  fixNullToZero(parsedLevelData);

  notify(onProgress, {
    stage: "parse.validation",
    message: "Validating parsed level data",
  });
  const validationResult = validateLevelDataForGame(
    parsedLevelData,
    globals.GAME_TYPE,
  );
  if (validationResult.isErr()) {
    return err(
      levelIoError(
        "parse.failed",
        `Level validation failed for ${globals.GAME_NAME}: ${validationResult.error}`,
      ),
    );
  }
  if (!isLevelDataLike(parsedLevelData)) {
    return err(levelIoError("parse.failed", "Parsed level data is not LevelData"));
  }
  return ok(parsedLevelData);
}

function extractBugdomEmbeddedImages(levelData: LevelData): LevelIoImagePayload[] {
  const timg = isRecord(levelData.Timg) ? levelData.Timg : undefined;
  const timg1000 = timg && isRecord(timg["1000"]) ? timg["1000"] : undefined;
  const data = typeof timg1000?.data === "string" ? timg1000.data : undefined;
  if (!data) {
    return [];
  }
  const imageBuffer = hexToUint8Array(data);
  const alignedBuffer = new ArrayBuffer(imageBuffer.byteLength);
  new Uint8Array(alignedBuffer).set(imageBuffer);
  const tileCount = imageBuffer.byteLength / 2 / 32 / 32;
  const tiles = extractTilesFromBuffer(
    new DataView(alignedBuffer),
    tileCount,
    32,
    32 * 32 * 2,
  );
  return tiles.map(tileToImagePayload);
}

async function parseNanosaurLevelBytes(
  bytes: ArrayBuffer,
  globals: GlobalsInterface,
  strictRustNanosaur: boolean,
  onProgress?: (progress: LevelIoProgress) => void,
): Promise<Result<LevelData, LevelIoError>> {
  notify(onProgress, {
    stage: "parse.resource-fork",
    message: "Parsing Nanosaur level",
  });
  const rustParseResult = await parseNanosaur1LevelWithRust(bytes);
  if (rustParseResult.isErr() && strictRustNanosaur) {
    return err(
      levelIoError(
        "parse.failed",
        `Nanosaur Rust parser failed: ${rustParseResult.error}`,
      ),
    );
  }
  const rawLevelData = rustParseResult.isOk()
    ? rustParseResult.value
    : parseNanosaur1Level(bytes);
  const compatibleLevel = nanosaur1LevelToLevelData(
    rawLevelData,
    globals.TILE_SIZE,
    globals.TILE_INGAME_SIZE,
    4.0,
  );

  const metadata: LevelMetadata = {
    ...compatibleLevel._metadata,
    nanosaur1RawLevel: rawLevelData,
  };
  const result: LevelData = {
    ...compatibleLevel,
    _metadata: metadata,
  };
  notify(onProgress, {
    stage: "parse.validation",
    message: "Validating parsed level data",
  });
  const validationResult = validateLevelDataForGame(result, globals.GAME_TYPE);
  if (validationResult.isErr()) {
    return err(
      levelIoError(
        "parse.failed",
        `Level validation failed for ${globals.GAME_NAME}: ${validationResult.error}`,
      ),
    );
  }
  return ok(result);
}

function buildMightyMikeLevelData(
  mapResult: ReturnType<typeof parseMightyMikeMap> extends Result<infer TValue, string>
    ? TValue
    : never,
  tilesetResult: MightyMikeTileSet | null,
  mightyMikeSceneName?: string,
): unknown {
  const ottoCompatible = {
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: 1,
          numItems: mapResult.numItems,
          mapWidth: mapResult.mapWidth,
          mapHeight: mapResult.mapHeight,
          tileSize: 32,
          minY: 0,
          maxY: 0,
          numSplines: 0,
          numFences: 0,
          numTilePages: 0,
          numTiles: tilesetResult?.numTileDefinitions || 100,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
    Layr: {
      1000: {
        name: "Terrain Layer Matrix",
        obj: mapResult.mapImage
          .flat()
          .map((tileValue: MightyMikeTileValue) => tileValue.tileIndex),
        order: 1,
      },
    },
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: "",
        obj: new Array(mapResult.numItems).fill(0),
        order: 3,
      },
    },
    YCrd: {
      1000: {
        name: "Y Coordinates",
        obj: new Array(mapResult.mapWidth * mapResult.mapHeight).fill(0),
        order: 4,
      },
    },
    Itms: {
      1000: {
        name: "Terrain Items List",
        obj: mapResult.items.map((item: MightyMikeItem) => ({
          x: item.x,
          z: item.y,
          type: item.type,
          p0: item.p0,
          p1: item.p1,
          p2: item.p2,
          p3: item.p3,
          flags: 0,
        })),
        order: 2,
      },
    },
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj:
          tilesetResult?.tileAttributes.map((attribute: MightyMikeTileAttribute) => ({
            flags: attribute.flags,
            p0: attribute.p0,
            p1: attribute.p1,
          })) ?? new Array(tilesetResult?.numTileDefinitions || 100).fill({
            flags: 0,
            p0: 0,
            p1: 0,
          }),
        order: 6,
      },
    },
    alis: {
      1000: {
        name: "Texture Page Picture Alias",
        data: "",
        order: 10,
      },
    },
    Vcol: {},
    ...(tilesetResult ? { tileset: tilesetResult } : {}),
    ...(tilesetResult?.xlateTable
      ? {
          Xlat: {
            1000: {
              name: "Tile Translation Table",
              obj: tilesetResult.xlateTable.map((idx: number) => ({ idx })),
            },
          },
        }
      : {}),
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
      1000: {
        name: "Metadata",
        obj: {
          mightyMikeScene: mightyMikeSceneName,
          mightyMikeMapData: mapResult,
          mightyMikeTileValues: mapResult.mapImage.flat(),
        },
        order: 100,
      },
    },
  };

  return ottoCompatible;
}

function parseMightyMikeLevelBytes(
  levelBytes: ArrayBuffer,
  globals: GlobalsInterface,
  mightyMikeTilesetBytes?: ArrayBuffer,
  mightyMikePaletteBytes?: ArrayBuffer,
  mightyMikeSceneName?: string,
  onProgress?: (progress: LevelIoProgress) => void,
): Result<
  {
    readonly levelData: LevelData;
    readonly mapImages: readonly LevelIoImagePayload[];
    readonly collisionImages: readonly LevelIoImagePayload[];
  },
  LevelIoError
> {
  notify(onProgress, {
    stage: "parse.resource-fork",
    message: "Parsing Mighty Mike map",
  });
  const mapResult = parseMightyMikeMap(levelBytes);
  if (mapResult.isErr()) {
    return err(
      levelIoError(
        "parse.failed",
        `Failed to parse Mighty Mike map: ${mapResult.error}`,
      ),
    );
  }

  const tileSetResult = mightyMikeTilesetBytes
    ? parseMightyMikeTileSet(
        mightyMikeTilesetBytes,
        mightyMikePaletteBytes
          ? new Uint8Array(mightyMikePaletteBytes)
          : undefined,
        { includeImages: false },
      )
    : null;
  if (tileSetResult?.isErr()) {
    return err(
      levelIoError(
        "parse.failed",
        `Failed to parse Mighty Mike tileset: ${tileSetResult.error}`,
      ),
    );
  }

  notify(onProgress, {
    stage: "parse.images",
    message: "Preparing Mighty Mike tile images",
  });
  const tileImages = mightyMikeTilesetBytes
    ? parseMightyMikeTileImagePayloads(
        mightyMikeTilesetBytes,
        mightyMikePaletteBytes
          ? new Uint8Array(mightyMikePaletteBytes)
          : undefined,
      )
    : { tileImages: [], collisionImages: [] };

  const levelData = buildMightyMikeLevelData(
    mapResult.value,
    tileSetResult && tileSetResult.isOk() ? tileSetResult.value : null,
    mightyMikeSceneName,
  );
  if (!isLevelDataLike(levelData)) {
    return err(levelIoError("parse.failed", "Final data is not LevelData"));
  }

  notify(onProgress, {
    stage: "parse.validation",
    message: "Validating parsed level data",
  });
  const validationResult = validateLevelDataForGame(levelData, globals.GAME_TYPE);
  if (validationResult.isErr()) {
    return err(
      levelIoError(
        "parse.failed",
        `Level validation failed for ${globals.GAME_NAME}: ${validationResult.error}`,
      ),
    );
  }

  return ok({
    levelData,
    mapImages: tileImages.tileImages,
    collisionImages: tileImages.collisionImages,
  });
}

export async function parseLevelBytes(
  options: {
    readonly levelBytes: ArrayBuffer;
    readonly globals: GlobalsInterface;
    readonly mightyMikeTilesetBytes?: ArrayBuffer;
    readonly mightyMikePaletteBytes?: ArrayBuffer;
    readonly mightyMikeSceneName?: string;
    readonly strictRustNanosaur?: boolean;
  },
  onProgress?: (progress: LevelIoProgress) => void,
): Promise<
  Result<
    {
      readonly levelData: LevelData;
      readonly mapImages: readonly LevelIoImagePayload[];
      readonly collisionImages: readonly LevelIoImagePayload[];
    },
    LevelIoError
  >
> {
  if (options.globals.DATA_TYPE === DataType.TRT_FILE) {
    const parseResult = await parseNanosaurLevelBytes(
      options.levelBytes,
      options.globals,
      options.strictRustNanosaur ?? false,
      onProgress,
    );
    return parseResult.map((levelData) => ({
      levelData,
      mapImages: [],
      collisionImages: [],
    }));
  }

  if (options.globals.DATA_TYPE === DataType.MIGHTY_MIKE) {
    return Promise.resolve(
      parseMightyMikeLevelBytes(
        options.levelBytes,
        options.globals,
        options.mightyMikeTilesetBytes,
        options.mightyMikePaletteBytes,
        options.mightyMikeSceneName,
        onProgress,
      ),
    );
  }

  const levelResult = await parseRsrcLevelBytes(
    options.levelBytes,
    options.globals,
    onProgress,
  );
  if (levelResult.isErr()) {
    return err(levelResult.error);
  }

  const embeddedImages =
    options.globals.DATA_TYPE === DataType.RSRC_FORK
      ? extractBugdomEmbeddedImages(levelResult.value)
      : [];

  return ok({
    levelData: levelResult.value,
    mapImages: embeddedImages,
    collisionImages: [],
  });
}
