import { z } from "zod";

const identifier = z.string().min(1).max(63).regex(/^(?!\.{1,2}$)[A-Za-z0-9_.-]+$/);
const displayName = z.string().min(1).max(127).refine((value) => new TextEncoder().encode(value).length <= 127, "Names must fit 127 UTF-8 bytes.");
export const enginePathSchema = z.string().min(1).max(511).regex(/^(?!\/)(?!.*\\)(?!.*\/\/)(?!.*\/$)(?!.*(?:^|\/)\.{1,2}(?:\/|$)).+$/).regex(/^[^\p{Cc}]+$/u).refine((value) => new TextEncoder().encode(value).length <= 511, "Paths must fit 511 UTF-8 bytes.");
const vector = z.object({ x: z.number().min(-1e7).max(1e7), y: z.number().min(-1e7).max(1e7), z: z.number().min(-1e7).max(1e7) }).strict();
export const engineEntitySchema = z.object({
  id: identifier, model: identifier,
  position: vector, rotation: vector.default({ x: 0, y: 0, z: 0 }), scale: z.number().min(.0001).max(10000).default(1),
  color: z.object({ r: z.number().min(0).max(1), g: z.number().min(0).max(1), b: z.number().min(0).max(1), a: z.number().min(0).max(1) }).strict().default({ r: 1, g: 1, b: 1, a: 1 }),
  body: z.object({ mode: z.enum(["dynamic", "kinematic", "static"]),
    halfExtents: z.object({ x: z.number().positive().max(1e7), y: z.number().positive().max(1e7), z: z.number().positive().max(1e7) }).strict(),
    layer: z.enum(["solid", "sensor"]).default("solid"), gravity: z.number().min(-1e7).max(1e7).default(-980), collision: z.boolean().default(true),
  }).strict().optional(),
}).strict();
export const engineManifestSchema = z.object({
  version: z.literal(1), id: identifier, name: displayName, entry: enginePathSchema,
  tickRate: z.number().int().min(1).max(240), initialScene: identifier,
  limits: z.object({ actors: z.number().int().min(1).max(2048).optional(),
    models: z.number().int().min(1).max(128).optional(),
    modelBytes: z.number().int().min(1024 * 1024).max(1024 * 1024 * 1024).optional(),
  }).strict().optional(),
  scriptBudgets: z.object({
    memoryBytes: z.number().int().min(1024 * 1024).max(512 * 1024 * 1024).optional(),
    loadInstructions: z.number().int().min(1000).max(500_000_000).optional(),
    eventInstructions: z.number().int().min(1000).max(500_000_000).optional(),
    frameInstructions: z.number().int().min(1000).max(5_000_000).optional(),
    aggregateFrameInstructions: z.number().int().min(1000).max(50_000_000).optional(),
  }).strict().refine(value => (value.aggregateFrameInstructions ?? 1_000_000) >= (value.frameInstructions ?? 50_000),
    { message: "Aggregate frame instructions must cover the per-callback frame budget" }).optional(),
  scenes: z.array(z.object({ id: identifier, name: displayName, file: enginePathSchema,
    controller: z.string().max(127).regex(/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/) }).strict()).min(1).max(32),
}).strict();
export const engineSceneSchema = z.object({
  version: z.literal(1),
  terrain: z.object({
    samplesX: z.number().int().min(2).max(1025), samplesZ: z.number().int().min(2).max(1025),
    sizeX: z.number().min(1).max(1e7), sizeZ: z.number().min(1).max(1e7), chunkSize: z.number().min(1).max(1e7),
    cellsPerChunk: z.number().int().min(1).max(256), heights: z.array(z.number().min(-1e7).max(1e7)).min(4).max(1025 * 1025),
    splits: z.array(z.number().int().min(0).max(1)).max(1024 * 1024).optional(),
  }).strict().refine(terrain => terrain.splits === undefined || terrain.splits.length === (terrain.samplesX - 1) * (terrain.samplesZ - 1),
    { message: "Terrain splits must contain one diagonal per sample cell." }),
  colliders: z.array(z.object({ min: vector, max: vector, layer: z.number().int().min(1).max(65535) }).strict()).max(128).default([]),
  assets: z.array(z.object({ id: identifier, file: enginePathSchema }).strict()).max(128).default([]),
  entities: z.array(engineEntitySchema).max(128).default([]),
}).strict();
export const engineSessionSchema = z.object({
  version: z.literal(1), packaged: z.boolean(), paused: z.boolean(), generation: z.number().int().nonnegative(),
  frame: z.number().int().nonnegative(), time: z.number().nonnegative(), packageId: z.string(), root: z.string(),
  scene: z.string(), error: z.string(), scenes: z.array(z.object({ id: z.string(), name: z.string() })),
});
export const engineMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pangea.ready"), version: z.literal(1) }),
  z.object({ type: z.literal("pangea.loaded"), version: z.literal(1), ok: z.boolean() }),
  z.object({ type: z.literal("pangea.session"), version: z.literal(1), session: engineSessionSchema,
    state: z.object({ actors: z.number().int(), models: z.number().int(), triangles: z.number().int(), chunks: z.number().int() }) }),
]);
export type EngineManifest = z.infer<typeof engineManifestSchema>;
export type EngineScene = z.infer<typeof engineSceneSchema>;
export type EngineEntity = z.infer<typeof engineEntitySchema>;
export type EngineSession = z.infer<typeof engineSessionSchema>;
export type EngineMessage = z.infer<typeof engineMessageSchema>;
