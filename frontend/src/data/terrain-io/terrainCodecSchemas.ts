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

export const terrainCodecWorkerRequestSchema = z.union([
  terrainCodecDecodeLzssRequestSchema,
  terrainCodecDecodeJpegRequestSchema,
]);

export const terrainCodecSuccessResponseSchema = z.object({
  type: z.literal("decoded"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  imageData: z.instanceof(ImageData),
});

export const terrainCodecErrorResponseSchema = z.object({
  type: z.literal("decode-error"),
  jobId: z.number().int().nonnegative(),
  id: z.number().int().nonnegative(),
  code: z.string(),
  message: z.string(),
});

export const terrainCodecWorkerResponseSchema = z.union([
  terrainCodecSuccessResponseSchema,
  terrainCodecErrorResponseSchema,
]);

export type TerrainCodecWorkerRequest = z.infer<typeof terrainCodecWorkerRequestSchema>;
export type TerrainCodecWorkerResponse = z.infer<typeof terrainCodecWorkerResponseSchema>;
