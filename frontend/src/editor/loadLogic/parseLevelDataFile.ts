import { err, ok, ResultAsync, type Result } from "neverthrow";
import type { GlobalsInterface } from "@/data/globals/globals";
import { DataType, Game } from "@/data/globals/globals";
import { mapErr } from "@/utils/mapErr";
import { loadBorderPalette } from "./mightyMikeParseHelpers";
import { getMightyMikeSceneFromPath } from "./mightyMikeParseHelpers";
import { isLevelDataLike } from "@/data/utils/levelDataUtils";
import {
  imagePayloadsToCanvases,
} from "@/data/level-io/terrainImageSnapshots";
import { parseLevelWithWorker } from "@/data/level-io/levelIoWorkerClient";
import type { LevelIoProgress } from "@/data/level-io/levelIoTypes";
import type { LevelData } from "@/python/structSpecs/LevelTypes";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";
import { clearItemImageCache } from "@/utils/mightyMikeShapeImageLoader";

export interface ParsedLevelDataFile {
  readonly levelData: LevelData;
  readonly mapImages: readonly HTMLCanvasElement[];
  readonly mapImagesFile?: File;
}

export interface ParseLevelDataFileArgs {
  readonly file: Blob;
  readonly gameType: GlobalsInterface;
  readonly fileUrl?: string;
  readonly companionTextureFile?: File;
  readonly onProgress?: (progress: LevelIoProgress) => void;
}

interface MightyMikeCompanionData {
  readonly tilesetBytes?: ArrayBuffer;
  readonly paletteBytes?: ArrayBuffer;
  readonly mapImagesFile?: File;
  readonly sceneName?: string;
}

interface ParsedLevelPayload {
  readonly levelData: LevelData;
  readonly mapImages: readonly {
    readonly width: number;
    readonly height: number;
    readonly rgbaBytes: ArrayBuffer;
  }[];
  readonly collisionImages: readonly {
    readonly width: number;
    readonly height: number;
    readonly rgbaBytes: ArrayBuffer;
  }[];
  readonly nanosaurRawBytes?: ArrayBuffer;
}

function cloneArrayBuffer(buffer: Uint8Array): ArrayBuffer {
  const clone = new Uint8Array(buffer.byteLength);
  clone.set(buffer);
  return clone.buffer;
}

async function loadMightyMikeCompanionData({
  fileUrl,
  companionTextureFile,
}: {
  readonly fileUrl?: string;
  readonly companionTextureFile?: File;
}): Promise<Result<MightyMikeCompanionData, string>> {
  let tilesetBytes: ArrayBuffer | undefined;
  let mapImagesFile: File | undefined;

  if (companionTextureFile) {
    const textureBytesResult = await ResultAsync.fromPromise(
      companionTextureFile.arrayBuffer(),
      mapErr,
    );
    if (textureBytesResult.isErr()) {
      return err(`Failed to read Mighty Mike tileset: ${textureBytesResult.error}`);
    }
    tilesetBytes = textureBytesResult.value;
    mapImagesFile = companionTextureFile;
  } else if (fileUrl) {
    const tilesetUrl = fileUrl.replace(/\.map-\d+$/i, ".tileset");
    const fetchResult = await ResultAsync.fromPromise(fetch(tilesetUrl), mapErr);
    if (fetchResult.isOk() && fetchResult.value.ok) {
      const tilesetBytesResult = await ResultAsync.fromPromise(
        fetchResult.value.arrayBuffer(),
        mapErr,
      );
      if (tilesetBytesResult.isErr()) {
        return err(
          `Failed to read Mighty Mike tileset response: ${tilesetBytesResult.error}`,
        );
      }
      tilesetBytes = tilesetBytesResult.value;
      mapImagesFile = new File(
        [tilesetBytesResult.value],
        tilesetUrl.split("/").pop() ?? "tileset",
      );
    }
  }

  const paletteBytes = fileUrl ? await loadBorderPalette(fileUrl) : null;

  return ok({
    tilesetBytes,
    paletteBytes: paletteBytes ? cloneArrayBuffer(paletteBytes) : undefined,
    mapImagesFile,
    sceneName: getMightyMikeSceneFromPath(fileUrl),
  });
}

function attachCollisionImages(
  levelData: LevelData,
  collisionImages: readonly HTMLCanvasElement[],
): LevelData {
  if (!levelData.tileset) {
    return levelData;
  }
  return {
    ...levelData,
    tileset: {
      ...levelData.tileset,
      collisionImages: [...collisionImages],
    },
  };
}

function attachNanosaurRawLevelBytes(
  levelData: LevelData,
  gameType: GlobalsInterface,
  nanosaurRawBytes: ArrayBuffer | undefined,
): LevelData {
  if (gameType.GAME_TYPE !== Game.NANOSAUR || !nanosaurRawBytes) {
    return levelData;
  }

  return {
    ...levelData,
    _metadata: {
      ...levelData._metadata,
      nanosaur1RawBytes: nanosaurRawBytes,
    },
  };
}

async function parseLevelPayloadForEditor({
  levelBytes,
  gameType,
  file,
  mightyMikeCompanionData,
  onProgress,
}: {
  readonly levelBytes: ArrayBuffer;
  readonly gameType: GlobalsInterface;
  readonly file: Blob;
  readonly mightyMikeCompanionData: MightyMikeCompanionData;
  readonly onProgress?: (progress: LevelIoProgress) => void;
}): Promise<Result<ParsedLevelPayload, string>> {
  const workerResult = await parseLevelWithWorker(
    {
      globals: gameType,
      fileName: file instanceof File ? file.name : "level",
      levelBytes,
      mightyMikeTilesetBytes: mightyMikeCompanionData.tilesetBytes,
      mightyMikePaletteBytes: mightyMikeCompanionData.paletteBytes,
      mightyMikeSceneName: mightyMikeCompanionData.sceneName,
    },
    onProgress,
  );
  if (workerResult.isErr()) {
    return err(workerResult.error.message);
  }

  if (!isLevelDataLike(workerResult.value.levelData)) {
    return err("Parsed level data is not valid LevelData");
  }

  return ok({
    levelData: workerResult.value.levelData,
    mapImages: workerResult.value.mapImages,
    collisionImages: workerResult.value.collisionImages,
    nanosaurRawBytes: workerResult.value.nanosaurRawBytes,
  });
}

export async function parseLevelDataFile({
  file,
  gameType,
  fileUrl,
  companionTextureFile,
  onProgress,
}: ParseLevelDataFileArgs): Promise<Result<ParsedLevelDataFile, string>> {
  const levelBytesResult = await ResultAsync.fromPromise(file.arrayBuffer(), mapErr);
  if (levelBytesResult.isErr()) {
    return err(`Failed to read level file: ${levelBytesResult.error}`);
  }

  const mightyMikeCompanionResult =
    gameType.DATA_TYPE === DataType.MIGHTY_MIKE
      ? await loadMightyMikeCompanionData({ fileUrl, companionTextureFile })
      : ok<MightyMikeCompanionData>({
          tilesetBytes: undefined,
          paletteBytes: undefined,
          mapImagesFile: undefined,
          sceneName: undefined,
        });
  if (mightyMikeCompanionResult.isErr()) {
    return err(mightyMikeCompanionResult.error);
  }

  if (
    gameType.DATA_TYPE === DataType.MIGHTY_MIKE &&
    mightyMikeCompanionResult.value.paletteBytes
  ) {
    gMightyMikePalette.loadPaletteFromRGBA(
      new Uint8Array(mightyMikeCompanionResult.value.paletteBytes),
    );
    clearItemImageCache();
  }

  const workerResult = await parseLevelPayloadForEditor({
    levelBytes: levelBytesResult.value,
    gameType,
    file,
    mightyMikeCompanionData: mightyMikeCompanionResult.value,
    onProgress,
  });
  if (workerResult.isErr()) {
    return err(workerResult.error);
  }

  if (!isLevelDataLike(workerResult.value.levelData)) {
    return err("Parsed level data is not valid LevelData");
  }

  const mapImagesResult = imagePayloadsToCanvases(workerResult.value.mapImages);
  if (mapImagesResult.isErr()) {
    return err(mapImagesResult.error);
  }

  const collisionImagesResult = imagePayloadsToCanvases(
    workerResult.value.collisionImages,
  );
  if (collisionImagesResult.isErr()) {
    return err(collisionImagesResult.error);
  }

  const levelData = attachNanosaurRawLevelBytes(
    workerResult.value.levelData,
    gameType,
    workerResult.value.nanosaurRawBytes,
  );

  return ok({
    levelData: attachCollisionImages(levelData, collisionImagesResult.value),
    mapImages: mapImagesResult.value,
    mapImagesFile: mightyMikeCompanionResult.value.mapImagesFile,
  });
}
