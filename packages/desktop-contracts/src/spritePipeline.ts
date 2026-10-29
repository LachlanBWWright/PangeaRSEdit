import { z } from "zod";

const spritePathSchema = z.string().min(1).max(240).refine((value) =>
  !/[\\:<>"|?*\x00-\x1f]/.test(value) && value.split("/").every((part) =>
    part.length > 0 && part !== "." && part !== ".." && !/[. ]$/.test(part)
    && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part)
    && (!part.startsWith(".") || part === ".pangea")));
const bytesSchema = z.instanceof(Uint8Array).refine((bytes) => bytes.length <= 128 * 1024 * 1024);
export const spriteFrameSchema = z.object({
  name: z.string().min(1).max(120), durationMs: z.number().int().min(1).max(600000),
});
export type SpriteFrame = z.infer<typeof spriteFrameSchema>;
export const spriteAssetSchema = z.object({
  version: z.literal(1), id: z.string().uuid(), name: z.string().min(1).max(120),
  nativePath: spritePathSchema.refine((value) => /\.shapes$/i.test(value)),
  shapeIndex: z.number().int().nonnegative().max(65535),
  source: z.object({ mode: z.enum(["managed", "external"]), imagePath: z.string().min(1).max(4096),
    metadataPath: z.string().min(1).max(4096).nullable(), authoringPath: z.string().min(1).max(4096).nullable().default(null),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/) }),
  frames: z.array(spriteFrameSchema).max(65536), importedAt: z.string(),
});
export type SpriteAsset = z.infer<typeof spriteAssetSchema>;
export const spriteReadSchema = z.object({ asset: spriteAssetSchema, imageBytes: bytesSchema,
  metadataBytes: bytesSchema.nullable(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/) });
export type SpriteRead = z.infer<typeof spriteReadSchema>;
export const spritePipelineRequests = [
  z.object({ operation: z.literal("sprites.list") }),
  z.object({ operation: z.literal("sprites.link"), nativePath: spriteAssetSchema.shape.nativePath,
    shapeIndex: spriteAssetSchema.shape.shapeIndex, name: spriteAssetSchema.shape.name,
    mode: z.enum(["managed", "external"]).default("managed") }),
  z.object({ operation: z.literal("sprites.read"), id: z.string().uuid() }),
  z.object({ operation: z.literal("sprites.commit"), id: z.string().uuid(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), revision: z.string(),
    files: z.array(z.object({ path: spritePathSchema, bytes: bytesSchema })).min(1).max(3), frames: z.array(spriteFrameSchema).max(65536) }),
  z.object({ operation: z.literal("sprites.external"), id: z.string().uuid(), action: z.enum(["open", "reveal"]) }),
  z.object({ operation: z.literal("sprites.configure-editor") }),
];
