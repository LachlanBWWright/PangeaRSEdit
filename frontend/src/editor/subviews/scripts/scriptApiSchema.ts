import { z } from "zod";

export const FieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "vector2",
  "vector3",
  "objectHandle",
  "stringUnion"
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  description: z.string().optional(),
  optional: z.boolean().optional(),
  unionValues: z.array(z.string()).optional(),
});

export type Field = z.infer<typeof FieldSchema>;

export const HookSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  contextType: z.string(),
  returnType: z.string(),
});

export type Hook = z.infer<typeof HookSchema>;

export const ApiFunctionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  parameters: z.array(FieldSchema),
  returnType: z.string(),
});

export type ApiFunction = z.infer<typeof ApiFunctionSchema>;

export const GameSchema = z.object({
  gameId: z.string(),
  gameName: z.string(),
  supportedHooks: z.array(z.string()),
  contextFields: z.array(FieldSchema),
});

export type Game = z.infer<typeof GameSchema>;

export const ApiSchema = z.object({
  hooks: z.array(HookSchema),
  apis: z.array(ApiFunctionSchema),
  games: z.array(GameSchema),
});

export type ApiSchemaType = z.infer<typeof ApiSchema>;

// The single source of truth for the scripting APIs
export const AUTHORITATIVE_API_SCHEMA: ApiSchemaType = ApiSchema.parse({
  hooks: [
    {
      name: "onGameStart",
      description: "Triggered when the game boots.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onLevelLoad",
      description: "Triggered when a level is being loaded.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onLevelStart",
      description: "Triggered when gameplay starts in a level.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onLevelComplete",
      description: "Triggered when a level is successfully completed.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onLevelUnload",
      description: "Triggered when a level is unloaded.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onFrame",
      description: "Triggered every frame.",
      contextType: "FrameContext",
      returnType: "nil",
    },
    {
      name: "onTerrainItem",
      description: "Triggered when a terrain item is spawned.",
      contextType: "TerrainItemContext",
      returnType: "ItemSpawnResult|nil",
    },
    {
      name: "onSplineItem",
      description: "Triggered when a spline item is spawned.",
      contextType: "SplineItemContext",
      returnType: "ItemSpawnResult|nil",
    },
    {
      name: "onMapItem",
      description: "Triggered when a map item is spawned.",
      contextType: "MikeMapItemContext",
      returnType: "ItemSpawnResult|nil",
    },
    {
      name: "onObjectFrame",
      description: "Triggered every frame for scripted objects.",
      contextType: "ObjectFrameContext",
      returnType: "ObjectFrameResult|nil",
    },
  ],
  apis: [
    {
      name: "pangea.log.info",
      description: "Logs an informational message.",
      parameters: [{ name: "message", type: "string" }],
      returnType: "nil",
    },
    {
      name: "pangea.log.warn",
      description: "Logs a warning message.",
      parameters: [{ name: "message", type: "string" }],
      returnType: "nil",
    },
    {
      name: "pangea.log.error",
      description: "Logs an error message.",
      parameters: [{ name: "message", type: "string" }],
      returnType: "nil",
    },
    {
      name: "pangea.level.current",
      description: "Returns the current active level number.",
      parameters: [],
      returnType: "number",
    },
    {
      name: "pangea.spawn.native",
      description: "Spawns a native object.",
      parameters: [
        { name: "id", type: "string" },
        { name: "position", type: "vector3" },
        { name: "options", type: "stringUnion", optional: true, unionValues: [] },
      ],
      returnType: "ObjectHandle|nil",
    },
    {
      name: "pangea.spawn.scripted",
      description: "Spawns a custom scripted object.",
      parameters: [
        { name: "id", type: "string" },
        { name: "position", type: "vector3" },
        { name: "options", type: "stringUnion", optional: true, unionValues: [] },
      ],
      returnType: "ObjectHandle|nil",
    },
    {
      name: "pangea.object.position",
      description: "Gets the position of an object.",
      parameters: [{ name: "handle", type: "objectHandle" }],
      returnType: "Vector3|nil",
    },
    {
      name: "pangea.object.setPosition",
      description: "Sets the position of an object.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "position", type: "vector3" },
      ],
      returnType: "boolean",
    },
    {
      name: "pangea.object.setVelocity",
      description: "Sets the velocity of an object.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "velocity", type: "vector3" },
      ],
      returnType: "boolean",
    },
    {
      name: "pangea.object.delete",
      description: "Deletes an object.",
      parameters: [{ name: "handle", type: "objectHandle" }],
      returnType: "boolean",
    },
  ],
  games: [
    {
      gameId: "OttoMatic-Android",
      gameName: "Otto Matic",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame"],
      contextFields: [
        { name: "playerMode", type: "string", optional: true },
      ],
    },
    {
      gameId: "Bugdom-android",
      gameName: "Bugdom",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame"],
      contextFields: [],
    },
    {
      gameId: "Bugdom2-Android",
      gameName: "Bugdom 2",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame"],
      contextFields: [],
    },
    {
      gameId: "Nanosaur-android",
      gameName: "Nanosaur",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onObjectFrame"],
      contextFields: [],
    },
    {
      gameId: "Nanosaur2-Android",
      gameName: "Nanosaur 2",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["adventure", "race", "battle", "capture"] },
        { name: "networked", type: "boolean" },
      ],
    },
    {
      gameId: "CroMagRally-Android",
      gameName: "Cro-Mag Rally",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onObjectFrame"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["local", "practice", "network"] },
        { name: "trackName", type: "string", optional: true },
        { name: "networked", type: "boolean" },
      ],
    },
    {
      gameId: "BillyFrontier-Android",
      gameName: "Billy Frontier",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["duel", "shootout", "stampede", "targetPractice"] },
      ],
    },
    {
      gameId: "MightyMike-Android",
      gameName: "Mighty Mike",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onMapItem", "onObjectFrame"],
      contextFields: [
        { name: "sceneName", type: "string", optional: true },
        { name: "areaName", type: "string", optional: true },
      ],
    },
  ],
});
