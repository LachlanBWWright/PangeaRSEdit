import { z } from "zod";

export const terrainCodecDecodeLzssRequestSchema = z.object({
  type: z.literal("decode-lzss"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  supertileTexmapSize: z.number().int().positive(),
  bytes: z.instanceof(ArrayBuffer),
});

export const terrainCodecDecodeJpegRequestSchema = z.object({
  type: z.literal("decode-jpeg"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  supertileTexmapSize: z.number().int().positive(),
  bytes: z.instanceof(ArrayBuffer),
});

export const terrainCodecEncodeLzssRequestSchema = z.object({
  type: z.literal("encode-lzss"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rgbaBytes: z.instanceof(ArrayBuffer),
});

export const terrainCodecEncodeJpegRequestSchema = z.object({
  type: z.literal("encode-jpeg"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  quality: z.number().int().min(1).max(100),
  rgbaBytes: z.instanceof(ArrayBuffer),
});

export const terrainCodecWorkerRequestSchema = z.discriminatedUnion("type", [
  terrainCodecDecodeLzssRequestSchema,
  terrainCodecDecodeJpegRequestSchema,
  terrainCodecEncodeLzssRequestSchema,
  terrainCodecEncodeJpegRequestSchema,
]);

export const terrainCodecSuccessResponseSchema = z.object({
  type: z.literal("decoded"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rgbaBytes: z.instanceof(ArrayBuffer),
});

export const terrainCodecErrorResponseSchema = z.object({
  type: z.literal("decode-error"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  code: z.string(),
  message: z.string(),
});

export const terrainCodecEncodedSuccessResponseSchema = z.object({
  type: z.literal("encoded"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  encodedBytes: z.instanceof(ArrayBuffer),
  imageDescriptionBytes: z.instanceof(ArrayBuffer).optional(),
});

export const terrainCodecEncodeErrorResponseSchema = z.object({
  type: z.literal("encode-error"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  code: z.string(),
  message: z.string(),
});

export const terrainCodecWorkerResponseSchema = z.discriminatedUnion("type", [
  terrainCodecSuccessResponseSchema,
  terrainCodecErrorResponseSchema,
  terrainCodecEncodedSuccessResponseSchema,
  terrainCodecEncodeErrorResponseSchema,
]);

export type TerrainCodecWorkerRequest = z.infer<
  typeof terrainCodecWorkerRequestSchema
>;
export type TerrainCodecWorkerResponse = z.infer<
  typeof terrainCodecWorkerResponseSchema
>;
