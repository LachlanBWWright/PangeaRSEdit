import { z } from "zod";
import {
  DataType,
  Game,
  TileImageFormat,
} from "@/data/globals/globals";

const globalsSchema = z.object({
  GAME_NAME: z.string(),
  GAME_TYPE: z.nativeEnum(Game),
  DATA_TYPE: z.nativeEnum(DataType),
  TILE_IMAGE_FORMAT: z.nativeEnum(TileImageFormat),
  STRUCT_SPECS: z.array(z.string()),
  SUPERTILE_TEXMAP_SIZE: z.number(),
  TILES_PER_SUPERTILE: z.number(),
  TILE_INGAME_SIZE: z.number(),
  TILE_SIZE: z.number(),
  EMPTY_TILE_IDX: z.number(),
  LIQD_NUBS: z.number(),
  ITEM_TYPES: z.record(z.string(), z.string()),
  FENCE_TYPES: z.record(z.string(), z.string()).optional(),
  WATER_TYPES: z.record(z.string(), z.string()).optional(),
  SPLINE_ITEM_TYPES: z.record(z.string(), z.string()).optional(),
});

export const levelIoImagePayloadSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rgbaBytes: z.instanceof(ArrayBuffer),
});

const levelIoProgressSchema = z.object({
  stage: z.enum([
    "parse.resource-fork",
    "parse.validation",
    "parse.images",
    "serialize.resource-fork",
    "serialize.textures",
    "preview.ready",
  ]),
  message: z.string(),
  completed: z.number().int().nonnegative().optional(),
  total: z.number().int().positive().optional(),
});

const parseLevelRequestSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("parse-level"),
  globals: globalsSchema,
  fileName: z.string().min(1),
  levelBytes: z.instanceof(ArrayBuffer),
  mightyMikeTilesetBytes: z.instanceof(ArrayBuffer).optional(),
  mightyMikePaletteBytes: z.instanceof(ArrayBuffer).optional(),
  mightyMikeSceneName: z.string().optional(),
});

const serializeDownloadRequestSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("serialize-download"),
  globals: globalsSchema,
  fileName: z.string().min(1),
  mapImagesFileName: z.string().optional(),
  levelData: z.unknown(),
  mapImages: z.array(levelIoImagePayloadSchema),
});

const preparePreviewRequestSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("prepare-preview"),
  globals: globalsSchema,
  levelData: z.unknown(),
  mapImages: z.array(levelIoImagePayloadSchema),
});

export const levelIoRequestSchema = z.discriminatedUnion("type", [
  parseLevelRequestSchema,
  serializeDownloadRequestSchema,
  preparePreviewRequestSchema,
]);

const progressResponseSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("progress"),
  progress: levelIoProgressSchema,
});

const parsedLevelResponseSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("parsed-level"),
  levelData: z.unknown(),
  mapImages: z.array(levelIoImagePayloadSchema),
  collisionImages: z.array(levelIoImagePayloadSchema),
  nanosaurRawBytes: z.instanceof(ArrayBuffer).optional(),
});

const serializedFileSchema = z.object({
  filename: z.string().min(1),
  extension: z.string().min(1),
  bytes: z.instanceof(Uint8Array),
});

const serializedDownloadResponseSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("serialized-download"),
  files: z.array(serializedFileSchema),
});

const preparedPreviewResponseSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("prepared-preview"),
  dataBytes: z.instanceof(Uint8Array).nullable(),
  rsrcBytes: z.instanceof(Uint8Array).nullable(),
  textureBytes: z.instanceof(Uint8Array).nullable(),
});

const failedLevelIoResponseSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("failed"),
  error: z.object({
    code: z.string().min(1),
    message: z.string(),
  }),
});

export const levelIoResponseSchema = z.discriminatedUnion("type", [
  progressResponseSchema,
  parsedLevelResponseSchema,
  serializedDownloadResponseSchema,
  preparedPreviewResponseSchema,
  failedLevelIoResponseSchema,
]);

export type LevelIoRequest = z.infer<typeof levelIoRequestSchema>;
export type LevelIoResponse = z.infer<typeof levelIoResponseSchema>;
