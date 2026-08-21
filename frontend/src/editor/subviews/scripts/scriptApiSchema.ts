import { z } from "zod";
import { billyFrontierItemTypeParams as billyItemParams, itemTypeNames as billyItemTypeNames } from "@/data/items/billyFrontierItemType";
import { bugdomItemTypeParams as bugdomItemParams, itemTypeNames as bugdomItemTypeNames } from "@/data/items/bugdomItemType";
import { bugdom2ItemTypeParams as bugdom2ItemParams, itemTypeNames as bugdom2ItemTypeNames } from "@/data/items/bugdom2ItemType";
import { croMagItemTypeParams as croMagItemParams, itemTypeNames as croMagItemTypeNames } from "@/data/items/croMagItemType";
import { itemTypeNames as mightyMikeItemTypeNames } from "@/data/items/mightyMikeItemType";
import { itemTypeNames as nanosaurItemTypeNames, nanosaurItemTypeParams as nanosaurItemParams } from "@/data/items/nanosaurItemType";
import { itemTypeNames as nanosaur2ItemTypeNames, nanosaur2ItemTypeParams as nanosaur2ItemParams } from "@/data/items/nanosaur2ItemType";
import { itemTypeNames as ottoItemTypeNames, TerrainItemTypeParams as ottoItemParams } from "@/data/items/ottoItemType";
import type { ItemParams, ParamDescription } from "@/data/items/itemParams";

export const FieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "vector2",
  "vector3",
  "objectHandle",
  "stringUnion",
  "table",
  "function",
  "unknown",
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
  command: z
    .object({
      capability: z.string().min(1),
      authority: z.enum(["local", "host", "owner", "disabled-network"]),
      applicationPhase: z.enum(["callback", "next-engine-phase"]),
      validation: z.array(z.string().min(1)).min(1),
    })
    .optional(),
});

export type ApiFunction = z.infer<typeof ApiFunctionSchema>;

type CommandMetadata = NonNullable<ApiFunction["command"]>;

const OBJECT_COMMAND_METADATA: Readonly<Record<"position" | "velocity" | "rotation" | "scale" | "animation" | "activation" | "delete", CommandMetadata>> = {
  position: {
    capability: "object-position",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite Vector3"],
  },
  velocity: {
    capability: "object-velocity",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite Vector3"],
  },
  rotation: {
    capability: "object-rotation",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite Vector3"],
  },
  scale: {
    capability: "object-scale",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite scale in range 0.000001..100"],
  },
  animation: {
    capability: "object-animation",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite speed and blend seconds", "declared animation index or name"],
  },
  activation: {
    capability: "object-activation",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "enabled-state transition"],
  },
  delete: {
    capability: "object-delete",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "delete capability"],
  },
};

export const NativeSpawnSchema = z.object({
  id: z.string(),
  nativeType: z.number().int().nonnegative().optional(),
  label: z.string(),
  category: z.string(),
  description: z.string(),
  params: z.array(z.object({ name: z.string(), description: z.string(), values: z.array(z.string()).optional() })).default([]),
  audit: z.object({
    classification: z.enum(["directly-replaceable", "replaceable-with-native-hooks", "native-only"]),
    replacementSurface: z.enum(["terrain", "spline", "map", "none"]),
    fallback: z.enum(["native-initializer", "skip-replacement"]),
    requiredCapabilities: z.array(z.string().min(1)).min(1),
    requiredAssets: z.array(z.string().min(1)).min(1),
    lifecycle: z.enum(["stateless", "pickup", "trigger", "native-owned"]),
    modeAudit: z.enum(["all-declared-modes", "subset-declared", "not-audited"]),
    streaming: z.enum(["source-driven", "native-owned", "not-audited"]),
    childObjects: z.enum(["none-observed", "native-owned", "not-audited"]),
    saveBehavior: z.enum(["not-persistent", "native-owned", "not-audited"]),
    auditBasis: z.string().min(1),
  }),
});

export type NativeSpawn = z.infer<typeof NativeSpawnSchema>;
export type NativeSpawnAudit = NativeSpawn["audit"];

const nativeOnlyAudit: NativeSpawnAudit = {
  classification: "native-only",
  replacementSurface: "none",
  fallback: "skip-replacement",
  requiredCapabilities: ["nativeSpawn"],
  requiredAssets: ["native-registry"],
  lifecycle: "native-owned",
  modeAudit: "not-audited",
  streaming: "native-owned",
  childObjects: "not-audited",
  saveBehavior: "not-audited",
  auditBasis: "Native spawn is registered, but no source-backed replacement entry point is advertised.",
};

function describeParam(param: ParamDescription): { readonly description: string; readonly values?: readonly string[] } | undefined {
  if (param === "Unused") return undefined;
  if (param === "Unknown") return { description: "Game-specific parameter; behavior is not yet documented." };
  if (param.type === "Bit Flags") return { description: "Bit flags: " + param.flags.map((flag) => `${flag.index}=${flag.description}`).join(", ") };
  if (param.type === "TypeSelector") return { description: param.description, values: Object.entries(param.options).map(([value, label]) => `${value} (${label})`) };
  if (param.type === "Rotation") return { description: `${param.description} (${param.divisions} steps, ${param.multiplier}).` };
  return { description: param.description };
}

function nativeParams(params: ItemParams | undefined): NativeSpawn["params"] {
  if (params === undefined) return [];
  return [describeParam(params.p0), describeParam(params.p1), describeParam(params.p2), describeParam(params.p3)]
    .flatMap((description, index) => description === undefined ? [] : [{ name: `param${index}`, ...description, values: description.values === undefined ? undefined : [...description.values] }]);
}

function nativeTerrainItems(
  itemNames: Readonly<Record<number, string>>,
  firstItemId: number,
  itemParams?: Readonly<Record<number, ItemParams>>,
  replacementSurface: "terrain" | "map" = "terrain",
): NativeSpawn[] {
  return Object.entries(itemNames)
    .map(([id, label]) => ({ id: Number(id), label }))
    .filter(({ id }) => Number.isInteger(id) && id >= firstItemId)
    .sort((left, right) => left.id - right.id)
    .map(({ id, label }) => ({
      id: String(id),
      label: `${id}: ${label}`,
      category: "Terrain item",
      description: "Dispatches through the game's native item initializer. Availability and required assets depend on the current level.",
      params: nativeParams(itemParams?.[id]),
      audit: {
        classification: "replaceable-with-native-hooks",
        replacementSurface,
        fallback: "native-initializer",
        requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
        requiredAssets: ["level-assets"],
        lifecycle: "stateless",
        modeAudit: "all-declared-modes",
        streaming: "source-driven",
        childObjects: "not-audited",
        saveBehavior: "not-audited",
        auditBasis: replacementSurface === "map"
          ? "Validated against the adapter's map-item replacement entry point and native fallback path."
          : "Validated against the adapter's terrain-item replacement entry point and native fallback path.",
      } satisfies NativeSpawnAudit,
    }));
}

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
      name: "onGameShutdown",
      description: "Triggered once before the scripting runtime is destroyed.",
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
      name: "onDamage",
      description: "Triggered before a supported adapter applies damage to a player.",
      contextType: "DamageContext",
      returnType: "DamageResult|nil",
    },
    {
      name: "onDamageApplied",
      description: "Triggered after a supported adapter applies damage to its player health state.",
      contextType: "DamageContext",
      returnType: "nil",
    },
    {
      name: "onDeath",
      description: "Triggered when a supported adapter player enters its death state.",
      contextType: "PlayerEventContext",
      returnType: "nil",
    },
    {
      name: "onPlayerSpawn",
      description: "Triggered when a supported adapter first registers its player object.",
      contextType: "PlayerEventContext",
      returnType: "nil",
    },
    {
      name: "onPlayerRespawn",
      description: "Triggered when a supported adapter restores its player at a checkpoint.",
      contextType: "PlayerEventContext",
      returnType: "nil",
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
    { name: "pangea.level.setting", description: "Reads a typed setting from the active level configuration.", parameters: [{ name: "key", type: "string" }], returnType: "string|number|boolean|nil" },
    { name: "pangea.api.capabilities", description: "Reports runtime features available for the selected game.", parameters: [], returnType: "PangeaCapabilities" },
    { name: "pangea.api.diagnostics", description: "Reports script memory, scheduler, subscription, frame, and deterministic command-stream diagnostics.", parameters: [], returnType: "PangeaDiagnostics" },
    { name: "pangea.api.requireVersion", description: "Fails script loading unless the runtime API is within the requested range.", parameters: [{ name: "minimum", type: "number" }, { name: "maximum", type: "number", optional: true }], returnType: "true" },
    { name: "pangea.time.frame", description: "Returns the current frame number.", parameters: [], returnType: "number" },
    { name: "pangea.time.delta", description: "Returns the current frame delta in seconds.", parameters: [], returnType: "number" },
    { name: "pangea.time.level", description: "Returns elapsed level time in seconds.", parameters: [], returnType: "number" },
    { name: "pangea.time.after", description: "Schedules a one-shot budgeted callback using level time.", parameters: [{ name: "delaySeconds", type: "number" }, { name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.time.every", description: "Schedules a drift-resistant repeating callback using level time.", parameters: [{ name: "intervalSeconds", type: "number" }, { name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.time.cancel", description: "Cancels a one-shot or repeating timer.", parameters: [{ name: "timerId", type: "number" }], returnType: "boolean" },
    { name: "pangea.time.isActive", description: "Checks whether a timer remains scheduled.", parameters: [{ name: "timerId", type: "number" }], returnType: "boolean" },
    { name: "pangea.task.start", description: "Starts a budgeted coroutine task immediately.", parameters: [{ name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.task.wait", description: "Suspends the current task for a level-time delay.", parameters: [{ name: "delaySeconds", type: "number" }], returnType: "nil" },
    { name: "pangea.task.cancel", description: "Cancels a suspended task.", parameters: [{ name: "taskId", type: "number" }], returnType: "boolean" },
    { name: "pangea.task.isActive", description: "Checks whether a task remains suspended or runnable.", parameters: [{ name: "taskId", type: "number" }], returnType: "boolean" },
    { name: "pangea.events.on", description: "Subscribes to a script-local event.", parameters: [{ name: "eventName", type: "string" }, { name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.events.once", description: "Subscribes for the next matching event emission only.", parameters: [{ name: "eventName", type: "string" }, { name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.events.off", description: "Removes an event subscription.", parameters: [{ name: "subscriptionId", type: "number" }], returnType: "boolean" },
    { name: "pangea.events.emit", description: "Synchronously emits an event with a read-only payload.", parameters: [{ name: "eventName", type: "string" }, { name: "payload", type: "unknown", optional: true }], returnType: "number" },
    { name: "pangea.random.number", description: "Returns a deterministic number from zero through one.", parameters: [], returnType: "number" },
    { name: "pangea.random.integer", description: "Returns a deterministic integer in an inclusive range.", parameters: [{ name: "minimum", type: "number" }, { name: "maximum", type: "number" }], returnType: "number" },
    { name: "pangea.random.seed", description: "Resets the deterministic random stream.", parameters: [{ name: "seed", type: "number" }], returnType: "nil" },
    { name: "pangea.persistence.get", description: "Reads a version-matched bounded persistent scalar, or nil when storage is unavailable or the version does not match.", parameters: [{ name: "key", type: "string" }, { name: "version", type: "number" }], returnType: "string|number|boolean|nil" },
    { name: "pangea.persistence.set", description: "Stores a versioned bounded persistent scalar when the host provides persistence callbacks.", parameters: [{ name: "key", type: "string" }, { name: "version", type: "number" }, { name: "value", type: "unknown" }], returnType: "boolean" },
    { name: "pangea.persistence.delete", description: "Deletes a persistent value through the host callback.", parameters: [{ name: "key", type: "string" }], returnType: "boolean" },
    {
      name: "pangea.player.count",
      description: "Returns the number of active players exposed by the selected game.",
      parameters: [],
      returnType: "number",
    },
    {
      name: "pangea.player.get",
      description: "Returns a normalized read-only player snapshot.",
      parameters: [{ name: "playerNum", type: "number" }],
      returnType: "PangeaPlayerSnapshot|nil",
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
      name: "pangea.spawn.nativeResult",
      description: "Spawns a native object and returns structured status and diagnostics.",
      parameters: [
        { name: "id", type: "unknown" },
        { name: "position", type: "vector3" },
        { name: "options", type: "table", optional: true },
      ],
      returnType: "NativeSpawnResult",
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
      name: "pangea.object.source",
      description: "Gets the validated terrain, spline, or map source record for a replacement object.",
      parameters: [{ name: "handle", type: "objectHandle" }],
      returnType: "ObjectSource|nil",
    },
    { name: "pangea.object.all", description: "Returns all currently registered object handles.", parameters: [], returnType: "ObjectHandle[]" },
    { name: "pangea.object.findByTag", description: "Returns registered object handles carrying a tag.", parameters: [{ name: "tag", type: "string" }], returnType: "ObjectHandle[]" },
    { name: "pangea.object.nearest", description: "Returns the nearest readable registered object, optionally filtered by tag.", parameters: [{ name: "origin", type: "vector3" }, { name: "tag", type: "string", optional: true }], returnType: "ObjectHandle|nil" },
    { name: "pangea.object.exists", description: "Checks whether a generation-checked object handle is live.", parameters: [{ name: "handle", type: "objectHandle" }], returnType: "boolean" },
    { name: "pangea.object.tags", description: "Returns the tags assigned to an object.", parameters: [{ name: "handle", type: "objectHandle" }], returnType: "string[]" },
    { name: "pangea.object.hasTag", description: "Checks whether an object has a tag.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "tag", type: "string" }], returnType: "boolean" },
    { name: "pangea.object.state", description: "Returns mutable script-owned state scoped to an object generation.", parameters: [{ name: "handle", type: "objectHandle" }], returnType: "table|nil" },
    {
      name: "pangea.object.setPosition",
      description: "Sets the position of an object.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "position", type: "vector3" },
      ],
      returnType: "boolean",
      command: OBJECT_COMMAND_METADATA.position,
    },
    {
      name: "pangea.object.setPositionResult",
      description: "Sets an object's position and returns structured status and diagnostics.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "position", type: "vector3" },
      ],
      returnType: "ObjectCommandResult",
      command: OBJECT_COMMAND_METADATA.position,
    },
    {
      name: "pangea.object.setVelocity",
      description: "Sets the velocity of an object.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "velocity", type: "vector3" },
      ],
      returnType: "boolean",
      command: OBJECT_COMMAND_METADATA.velocity,
    },
    {
      name: "pangea.object.setVelocityResult",
      description: "Sets an object's velocity and returns structured status and diagnostics.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "velocity", type: "vector3" },
      ],
      returnType: "ObjectCommandResult",
      command: OBJECT_COMMAND_METADATA.velocity,
    },
    { name: "pangea.object.setRotation", description: "Sets an object's Euler rotation.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "rotation", type: "vector3" }], returnType: "boolean", command: OBJECT_COMMAND_METADATA.rotation },
    { name: "pangea.object.setRotationResult", description: "Sets an object's Euler rotation and returns structured status and diagnostics.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "rotation", type: "vector3" }], returnType: "ObjectCommandResult", command: OBJECT_COMMAND_METADATA.rotation },
    { name: "pangea.object.setScale", description: "Sets an object's uniform scale.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "scale", type: "number" }], returnType: "boolean", command: OBJECT_COMMAND_METADATA.scale },
    { name: "pangea.object.setScaleResult", description: "Sets an object's uniform scale and returns structured status and diagnostics.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "scale", type: "number" }], returnType: "ObjectCommandResult", command: OBJECT_COMMAND_METADATA.scale },
    { name: "pangea.object.setAnimation", description: "Sets an object's animation by name or numeric ID.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "animation", type: "unknown" }, { name: "speed", type: "number", optional: true }, { name: "blendSeconds", type: "number", optional: true }], returnType: "boolean", command: OBJECT_COMMAND_METADATA.animation },
    { name: "pangea.object.setAnimationResult", description: "Sets an object's animation and returns structured status and diagnostics.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "animation", type: "unknown" }, { name: "speed", type: "number", optional: true }, { name: "blendSeconds", type: "number", optional: true }], returnType: "ObjectCommandResult", command: OBJECT_COMMAND_METADATA.animation },
    { name: "pangea.object.setActive", description: "Activates or deactivates an object through a validated enabled-state transition.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "active", type: "boolean" }], returnType: "boolean", command: OBJECT_COMMAND_METADATA.activation },
    { name: "pangea.object.setActiveResult", description: "Activates or deactivates an object and returns structured status and diagnostics.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "active", type: "boolean" }], returnType: "ObjectCommandResult", command: OBJECT_COMMAND_METADATA.activation },
    {
      name: "pangea.object.delete",
      description: "Deletes an object.",
      parameters: [{ name: "handle", type: "objectHandle" }],
      returnType: "boolean",
      command: OBJECT_COMMAND_METADATA.delete,
    },
    {
      name: "pangea.object.deleteResult",
      description: "Deletes an object and returns structured status and diagnostics.",
      parameters: [{ name: "handle", type: "objectHandle" }],
      returnType: "ObjectCommandResult",
      command: OBJECT_COMMAND_METADATA.delete,
    },
  ],
  games: [
    {
      gameId: "OttoMatic-Android",
      gameName: "Otto Matic",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onDamage", "onDamageApplied", "onPlayerSpawn", "onPlayerRespawn", "onDeath"],
      contextFields: [
        { name: "playerMode", type: "string", optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(ottoItemTypeNames, 1, ottoItemParams),
        { id: "ottomatic.human", nativeType: 4, label: "Human", category: "NPC", description: "Spawn a rescue human using the loaded level's human assets.", audit: nativeOnlyAudit },
        { id: "ottomatic.powerupPod", nativeType: 6, label: "Powerup Pod", category: "Pickup", description: "Spawn an Otto Matic health or weapon powerup pod.", audit: nativeOnlyAudit },
        { id: "ottomatic.checkpoint", nativeType: 27, label: "Checkpoint", category: "Trigger", description: "Spawn a level checkpoint trigger.", audit: nativeOnlyAudit },
        { id: "ottomatic.teleporter", nativeType: 57, label: "Teleporter", category: "Trigger", description: "Spawn a teleporter using the current level transition state.", audit: nativeOnlyAudit },
      ],
    },
    {
      gameId: "Bugdom-android",
      gameName: "Bugdom",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onDamage", "onDamageApplied", "onPlayerSpawn", "onPlayerRespawn", "onDeath"],
      contextFields: [],
      nativeSpawns: [
        ...nativeTerrainItems(bugdomItemTypeNames, 1, bugdomItemParams),
        { id: "bugdom.nut", nativeType: 2, label: "Nut", category: "Pickup", description: "Spawn a health nut pickup.", audit: nativeOnlyAudit },
        { id: "bugdom.clover", nativeType: 5, label: "Clover", category: "Pickup", description: "Spawn a clover key pickup.", audit: nativeOnlyAudit },
        { id: "bugdom.checkpoint", nativeType: 32, label: "Checkpoint", category: "Trigger", description: "Spawn a Bugdom checkpoint trigger.", audit: nativeOnlyAudit },
      ],
    },
    {
      gameId: "Bugdom2-Android",
      gameName: "Bugdom 2",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onWeaponHit", "onDamage", "onDamageApplied", "onDeath", "onPlayerSpawn", "onPlayerRespawn"],
      contextFields: [],
      nativeSpawns: [
        ...nativeTerrainItems(bugdom2ItemTypeNames, 1, bugdom2ItemParams),
        { id: "bugdom2.powerup", nativeType: 35, label: "Powerup", category: "Powerup", description: "Spawn a powerup; options.subtype selects the powerup kind.", audit: nativeOnlyAudit },
        { id: "bugdom2.dcell", nativeType: 49, label: "D-Cell", category: "Pickup", description: "Spawn a D-Cell using the current level's pickup assets.", audit: nativeOnlyAudit },
        { id: "bugdom2.gliderPart", nativeType: 85, label: "Glider Part", category: "Pickup", description: "Spawn a collectible glider part when its level assets are loaded.", audit: nativeOnlyAudit },
      ],
    },
    {
      gameId: "Nanosaur-android",
      gameName: "Nanosaur",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onDamage", "onDamageApplied", "onPlayerSpawn", "onPlayerRespawn", "onDeath"],
      contextFields: [],
      nativeSpawns: [
        ...nativeTerrainItems(nanosaurItemTypeNames, 1, nanosaurItemParams),
        { id: "nanosaur.powerup", nativeType: 1, label: "Powerup", category: "Powerup", description: "Spawn a Nanosaur powerup.", audit: nativeOnlyAudit },
        { id: "nanosaur.egg", nativeType: 5, label: "Egg", category: "Pickup", description: "Spawn a collectible dinosaur egg.", audit: nativeOnlyAudit },
        { id: "nanosaur.crystal", nativeType: 15, label: "Crystal", category: "Pickup", description: "Spawn a collectible crystal.", audit: nativeOnlyAudit },
      ],
    },
    {
      gameId: "Nanosaur2-Android",
      gameName: "Nanosaur 2",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onLevelComplete", "onLevelUnload", "onFrame", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onDamage", "onDamageApplied", "onPlayerSpawn", "onPlayerRespawn", "onDeath"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["adventure", "race", "battle", "capture"], optional: true },
        { name: "networked", type: "boolean", optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(nanosaur2ItemTypeNames, 1, nanosaur2ItemParams),
        { id: "nanosaur2.egg", nativeType: 3, label: "Egg", category: "Pickup", description: "Spawn a Nanosaur 2 objective egg.", audit: nativeOnlyAudit },
        { id: "nanosaur2.weaponPow", nativeType: 6, label: "Weapon Powerup", category: "Pickup", description: "Spawn a weapon powerup.", audit: nativeOnlyAudit },
        { id: "nanosaur2.healthPow", nativeType: 21, label: "Health Powerup", category: "Pickup", description: "Spawn a health powerup.", audit: nativeOnlyAudit },
      ],
    },
    {
      gameId: "CroMagRally-Android",
      gameName: "Cro-Mag Rally",
      supportedHooks: ["onGameStart", "onGameShutdown", "onRaceLoad", "onRaceStart", "onRaceFrame", "onRaceComplete", "onRaceUnload", "onTerrainItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onDamage", "onDamageApplied", "onPlayerSpawn", "onDeath"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["local", "practice", "network"], optional: true },
        { name: "trackName", type: "string", optional: true },
        { name: "networked", type: "boolean", optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(croMagItemTypeNames, 1, croMagItemParams),
        { id: "cromag.pow", nativeType: 5, label: "Powerup", category: "Pickup", description: "Spawn a general race powerup.", audit: nativeOnlyAudit },
        { id: "cromag.token", nativeType: 11, label: "Token", category: "Pickup", description: "Spawn a scoring token.", audit: nativeOnlyAudit },
        { id: "cromag.stickyTiresPow", nativeType: 12, label: "Sticky Tires", category: "Pickup", description: "Spawn a sticky-tires vehicle powerup.", audit: nativeOnlyAudit },
        { id: "cromag.suspensionPow", nativeType: 13, label: "Suspension", category: "Pickup", description: "Spawn a suspension vehicle powerup.", audit: nativeOnlyAudit },
        { id: "cromag.invisibilityPow", nativeType: 29, label: "Invisibility", category: "Pickup", description: "Spawn an invisibility powerup.", audit: nativeOnlyAudit },
      ],
    },
    {
      gameId: "BillyFrontier-Android",
      gameName: "Billy Frontier",
      supportedHooks: ["onGameStart", "onGameShutdown", "onAreaLoad", "onAreaStart", "onAreaFrame", "onAreaComplete", "onAreaUnload", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onDamage", "onDamageApplied", "onPlayerSpawn", "onDeath"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["duel", "shootout", "stampede", "targetPractice"], optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(billyItemTypeNames, 1, billyItemParams),
        { id: "billy.peso", nativeType: 36, label: "Peso", category: "Pickup", description: "Spawn a peso score pickup.", audit: nativeOnlyAudit },
        { id: "billy.freeLifePow", nativeType: 32, label: "Free Life", category: "Pickup", description: "Spawn a free-life powerup.", audit: nativeOnlyAudit },
        { id: "billy.boost", nativeType: 21, label: "Stampede Boost", category: "Pickup", description: "Spawn a speed boost for Stampede mode.", audit: nativeOnlyAudit },
      ],
    },
    {
      gameId: "MightyMike-Android",
      gameName: "Mighty Mike",
      supportedHooks: ["onGameStart", "onGameShutdown", "onAreaLoad", "onAreaStart", "onAreaFrame", "onAreaComplete", "onAreaUnload", "onMapItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter"],
      contextFields: [
        { name: "sceneName", type: "string", optional: true },
        { name: "areaName", type: "string", optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(mightyMikeItemTypeNames, 0, undefined, "map"),
        { id: "mightymike.bunny", nativeType: 3, label: "Bunny", category: "Pickup", description: "Spawn a bunny objective pickup.", audit: nativeOnlyAudit },
        { id: "mightymike.healthPow", nativeType: 15, label: "Health Powerup", category: "Pickup", description: "Spawn a Mighty Mike health powerup.", audit: nativeOnlyAudit },
        { id: "mightymike.key", nativeType: 19, label: "Key", category: "Pickup", description: "Spawn an inventory key pickup.", audit: nativeOnlyAudit },
      ],
    },
  ],
});
