import { z } from "zod";
import type { SkeletonResource } from "@/python/structSpecs/skeleton/skeletonInterface";

const headerEntrySchema = z.object({
  name: z.string(),
  order: z.number(),
  obj: z.object({
    version: z.number(),
    numAnims: z.number(),
    numJoints: z.number(),
    num3DMFLimbs: z.number(),
  }),
});

const boneEntrySchema = z.object({
  name: z.string(),
  order: z.number(),
  obj: z.object({
    parentBone: z.number(),
    name: z.string(),
    coordX: z.number(),
    coordY: z.number(),
    coordZ: z.number(),
    numPointsAttachedToBone: z.number(),
    numNormalsAttachedToBone: z.number(),
    reserved0: z.number().optional(),
    reserved1: z.number().optional(),
    reserved2: z.number().optional(),
    reserved3: z.number().optional(),
    reserved4: z.number().optional(),
    reserved5: z.number().optional(),
    reserved6: z.number().optional(),
    reserved7: z.number().optional(),
  }),
});

const bonPEntrySchema = z.object({
  name: z.string(),
  order: z.number(),
  obj: z.array(z.object({ pointIndex: z.number() })),
});

const bonNEntrySchema = z.object({
  name: z.string(),
  order: z.number(),
  obj: z.array(z.object({ normal: z.number() })),
});

export const skeletonResourceSchema: z.ZodType<SkeletonResource> = z
  .object({
    Hedr: z.record(z.string(), headerEntrySchema),
    Bone: z.record(z.string(), boneEntrySchema),
    BonP: z.record(z.string(), bonPEntrySchema),
    BonN: z.record(z.string(), bonNEntrySchema),
  })
  .passthrough();

export const skeletonWorkerRequestSchema = z.object({
  requestId: z.string().min(1),
  type: z.literal("parse-skeleton-rsrc"),
  buffer: z.instanceof(ArrayBuffer),
});

export const skeletonWorkerResponseSchema = z.discriminatedUnion("type", [
  z.object({
    requestId: z.string().min(1),
    type: z.literal("parsed"),
    skeleton: skeletonResourceSchema,
  }),
  z.object({
    requestId: z.string().min(1),
    type: z.literal("failed"),
    message: z.string(),
  }),
]);

export type SkeletonWorkerRequest = z.infer<typeof skeletonWorkerRequestSchema>;
export type SkeletonWorkerResponse = z.infer<
  typeof skeletonWorkerResponseSchema
>;
