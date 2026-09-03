import { z } from "zod";

export const nanosaurTerrainWorkerRequestSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("parse-nanosaur-terrain"),
  buffer: z.instanceof(ArrayBuffer),
});

const imagePayloadSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rgbaBytes: z.instanceof(ArrayBuffer),
});

export const nanosaurTerrainWorkerResponseSchema = z.discriminatedUnion("type", [
  z.object({
    requestId: z.string().min(1),
    type: z.literal("parsed"),
    images: z.array(imagePayloadSchema),
  }),
  z.object({
    requestId: z.string().min(1),
    type: z.literal("failed"),
    message: z.string(),
  }),
]);

export type NanosaurTerrainWorkerRequest = z.infer<
  typeof nanosaurTerrainWorkerRequestSchema
>;
export type NanosaurTerrainWorkerResponse = z.infer<
  typeof nanosaurTerrainWorkerResponseSchema
>;
