import { z } from "zod";

export const resizeDirectionSchema = z.enum(["top", "bottom", "left", "right"]);

export const levelResizeWorkerRequestSchema = z.object({
  mode: z.enum(["tiles", "supertiles"]),
  levelData: z.unknown(),
  globals: z.object({
    TILES_PER_SUPERTILE: z.number().int().positive(),
    TILE_INGAME_SIZE: z.number().positive(),
    EMPTY_TILE_IDX: z.number().int(),
  }),
  options: z.object({
    direction: resizeDirectionSchema,
    tileCount: z.number().int(),
    defaultHeight: z.number(),
  }),
});

export type LevelResizeWorkerRequest = z.infer<
  typeof levelResizeWorkerRequestSchema
>;

export const levelResizeWorkerResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), levelData: z.unknown() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);
