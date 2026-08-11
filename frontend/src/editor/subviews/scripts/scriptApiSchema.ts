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

export const NativeSpawnSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.string(),
  description: z.string(),
});

export type NativeSpawn = z.infer<typeof NativeSpawnSchema>;

export const GameSchema = z.object({
  gameId: z.string(),
  gameName: z.string(),
  supportedHooks: z.array(z.string()),
  contextFields: z.array(FieldSchema),
  nativeSpawns: z.array(NativeSpawnSchema),
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
    {
      name: "onPickupCollected",
      description: "Triggered when a registered pickup is collected.",
      contextType: "PickupContext",
      returnType: "PickupResult|nil",
    },
    {
      name: "onWeaponHit",
      description: "Triggered when a weapon or projectile hits a target.",
      contextType: "WeaponHitContext",
      returnType: "WeaponHitResult|nil",
    },
    {
      name: "onTriggerEnter",
      description: "Triggered when an object or player enters a scripted trigger.",
      contextType: "TriggerContext",
      returnType: "TriggerResult|nil",
    },
    {
      name: "onAreaLoad",
      description: "Triggered when an area is being loaded.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onAreaStart",
      description: "Triggered when gameplay starts in an area.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onAreaFrame",
      description: "Triggered every frame during an area.",
      contextType: "FrameContext",
      returnType: "nil",
    },
    {
      name: "onAreaComplete",
      description: "Triggered when an area is successfully completed.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onAreaUnload",
      description: "Triggered when an area is unloaded.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onRaceLoad",
      description: "Triggered when a race is being loaded.",
      contextType: "RaceContext",
      returnType: "nil",
    },
    {
      name: "onRaceStart",
      description: "Triggered when a race starts.",
      contextType: "RaceContext",
      returnType: "nil",
    },
    {
      name: "onRaceFrame",
      description: "Triggered every frame during a race.",
      contextType: "RaceContext",
      returnType: "nil",
    },
    {
      name: "onRaceComplete",
      description: "Triggered when a race completes.",
      contextType: "RaceContext",
      returnType: "nil",
    },
    {
      name: "onRaceUnload",
      description: "Triggered when a race is unloaded.",
      contextType: "RaceContext",
      returnType: "nil",
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
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onWeaponHit", "onTriggerEnter"],
      contextFields: [
        { name: "playerMode", type: "string", optional: true },
      ],
      nativeSpawns: [
        { id: "ottomatic.human", label: "Human", category: "NPC", description: "Spawn a rescue human using the loaded level's human assets." },
        { id: "ottomatic.powerupPod", label: "Powerup Pod", category: "Pickup", description: "Spawn an Otto Matic health or weapon powerup pod." },
        { id: "ottomatic.checkpoint", label: "Checkpoint", category: "Trigger", description: "Spawn a level checkpoint trigger." },
        { id: "ottomatic.teleporter", label: "Teleporter", category: "Trigger", description: "Spawn a teleporter using the current level transition state." },
      ],
    },
    {
      gameId: "Bugdom-android",
      gameName: "Bugdom",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onWeaponHit", "onTriggerEnter"],
      contextFields: [],
      nativeSpawns: [
        { id: "bugdom.nut", label: "Nut", category: "Pickup", description: "Spawn a health nut pickup." },
        { id: "bugdom.clover", label: "Clover", category: "Pickup", description: "Spawn a clover key pickup." },
        { id: "bugdom.checkpoint", label: "Checkpoint", category: "Trigger", description: "Spawn a Bugdom checkpoint trigger." },
      ],
    },
    {
      gameId: "Bugdom2-Android",
      gameName: "Bugdom 2",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onWeaponHit", "onTriggerEnter"],
      contextFields: [],
      nativeSpawns: [
        { id: "bugdom2.powerup", label: "Powerup", category: "Powerup", description: "Spawn a powerup; options.subtype selects the powerup kind." },
        { id: "bugdom2.dcell", label: "D-Cell", category: "Pickup", description: "Spawn a D-Cell using the current level's pickup assets." },
        { id: "bugdom2.gliderPart", label: "Glider Part", category: "Pickup", description: "Spawn a collectible glider part when its level assets are loaded." },
      ],
    },
    {
      gameId: "Nanosaur-android",
      gameName: "Nanosaur",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onObjectFrame", "onPickupCollected", "onWeaponHit", "onTriggerEnter"],
      contextFields: [],
      nativeSpawns: [
        { id: "nanosaur.powerup", label: "Powerup", category: "Powerup", description: "Spawn a Nanosaur powerup." },
        { id: "nanosaur.egg", label: "Egg", category: "Pickup", description: "Spawn a collectible dinosaur egg." },
        { id: "nanosaur.crystal", label: "Crystal", category: "Pickup", description: "Spawn a collectible crystal." },
      ],
    },
    {
      gameId: "Nanosaur2-Android",
      gameName: "Nanosaur 2",
      supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onWeaponHit", "onTriggerEnter"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["adventure", "race", "battle", "capture"] },
        { name: "networked", type: "boolean" },
      ],
      nativeSpawns: [
        { id: "nanosaur2.egg", label: "Egg", category: "Pickup", description: "Spawn a Nanosaur 2 objective egg." },
        { id: "nanosaur2.weaponPow", label: "Weapon Powerup", category: "Pickup", description: "Spawn a weapon powerup." },
        { id: "nanosaur2.healthPow", label: "Health Powerup", category: "Pickup", description: "Spawn a health powerup." },
      ],
    },
    {
      gameId: "CroMagRally-Android",
      gameName: "Cro-Mag Rally",
      supportedHooks: ["onRaceLoad", "onRaceStart", "onRaceFrame", "onRaceComplete", "onRaceUnload", "onTerrainItem", "onObjectFrame", "onPickupCollected", "onWeaponHit", "onTriggerEnter"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["local", "practice", "network"] },
        { name: "trackName", type: "string", optional: true },
        { name: "networked", type: "boolean" },
      ],
      nativeSpawns: [
        { id: "cromag.pow", label: "Powerup", category: "Pickup", description: "Spawn a general race powerup." },
        { id: "cromag.token", label: "Token", category: "Pickup", description: "Spawn a scoring token." },
        { id: "cromag.stickyTiresPow", label: "Sticky Tires", category: "Pickup", description: "Spawn a sticky-tires vehicle powerup." },
        { id: "cromag.suspensionPow", label: "Suspension", category: "Pickup", description: "Spawn a suspension vehicle powerup." },
        { id: "cromag.invisibilityPow", label: "Invisibility", category: "Pickup", description: "Spawn an invisibility powerup." },
      ],
    },
    {
      gameId: "BillyFrontier-Android",
      gameName: "Billy Frontier",
      supportedHooks: ["onAreaLoad", "onAreaStart", "onAreaFrame", "onAreaComplete", "onAreaUnload", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onWeaponHit", "onTriggerEnter"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["duel", "shootout", "stampede", "targetPractice"] },
      ],
      nativeSpawns: [
        { id: "billy.peso", label: "Peso", category: "Pickup", description: "Spawn a peso score pickup." },
        { id: "billy.freeLifePow", label: "Free Life", category: "Pickup", description: "Spawn a free-life powerup." },
        { id: "billy.boost", label: "Stampede Boost", category: "Pickup", description: "Spawn a speed boost for Stampede mode." },
      ],
    },
    {
      gameId: "MightyMike-Android",
      gameName: "Mighty Mike",
      supportedHooks: ["onAreaLoad", "onAreaStart", "onAreaFrame", "onAreaComplete", "onAreaUnload", "onMapItem", "onObjectFrame", "onPickupCollected", "onWeaponHit", "onTriggerEnter"],
      contextFields: [
        { name: "sceneName", type: "string", optional: true },
        { name: "areaName", type: "string", optional: true },
      ],
      nativeSpawns: [
        { id: "mightymike.bunny", label: "Bunny", category: "Pickup", description: "Spawn a bunny objective pickup." },
        { id: "mightymike.healthPow", label: "Health Powerup", category: "Pickup", description: "Spawn a Mighty Mike health powerup." },
        { id: "mightymike.key", label: "Key", category: "Pickup", description: "Spawn an inventory key pickup." },
      ],
    },
  ],
});
