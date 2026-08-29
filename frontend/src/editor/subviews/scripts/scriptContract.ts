import { Result, err, ok } from "neverthrow";
import { z } from "zod";
import {
  ApiSchema,
  AUTHORITATIVE_API_SCHEMA,
} from "./scriptApiSchema";
import {
  CAPABILITY_MATRIX,
  getCapability,
  getHookCapabilityKey,
  type GameCapabilityRow,
} from "./scriptCapabilityMatrix";
import { scriptHookIdSchema } from "./scriptWorkspaceStateTypes";

export const SCRIPT_CONTRACT_VERSION = 1;
export const SCRIPT_API_VERSION = 1;
export const SCRIPT_RUNTIME_VERSION = "lua-5.4";

export const SCRIPT_RUNTIME_CAPABILITY_FIELDS = [
  { name: "contractVersion", luaType: "integer" },
  { name: "apiVersion", luaType: "integer" },
  { name: "runtimeFingerprint", luaType: "integer" },
  { name: "levelSettings", luaType: "boolean" },
  { name: "objectMutation", luaType: "boolean" },
  { name: "objectPosition", luaType: "boolean" },
  { name: "spawnNative", luaType: "boolean" },
  { name: "spawnScripted", luaType: "boolean" },
  { name: "objectQueries", luaType: "boolean" },
  { name: "timers", luaType: "boolean" },
  { name: "tasks", luaType: "boolean" },
  { name: "events", luaType: "boolean" },
  { name: "persistence", luaType: "boolean" },
  { name: "terrainItems", luaType: "boolean" },
  { name: "splineItems", luaType: "boolean" },
  { name: "mapItems", luaType: "boolean" },
  { name: "pickupScoreEffects", luaType: "boolean" },
  { name: "objectCollision", luaType: "boolean" },
  { name: "playerCommands", luaType: "boolean" },
  { name: "playerInvulnerability", luaType: "boolean" },
  { name: "memoryLimitBytes", luaType: "integer" },
  { name: "loadInstructionBudget", luaType: "integer" },
  { name: "eventInstructionBudget", luaType: "integer" },
  { name: "frameInstructionBudget", luaType: "integer" },
  { name: "timerLimit", luaType: "integer" },
  { name: "taskLimit", luaType: "integer" },
  { name: "subscriptionLimit", luaType: "integer" },
  { name: "playerLookup", luaType: "boolean" },
] satisfies readonly { readonly name: string; readonly luaType: "boolean" | "integer" }[];

const persistentStorageTypes = z.enum(["string", "boolean", "integer", "number"]);

export const SCRIPT_PERSISTENCE_LIMITS = {
  schemaVersion: 1,
  maxKeyBytes: 63,
  maxValueBytes: 4096,
  maxTotalBytes: 16384,
  supportedTypes: ["string", "boolean", "integer", "number"],
  versionMismatch: "discard",
} satisfies {
  schemaVersion: 1;
  maxKeyBytes: 63;
  maxValueBytes: 4096;
  maxTotalBytes: 16384;
  supportedTypes: readonly ["string", "boolean", "integer", "number"];
  versionMismatch: "discard";
};

const scriptFailureCodeSchema = z.enum([
  "ok",
  "not-enabled",
  "file-not-found",
  "parse-error",
  "runtime-error",
  "bad-argument",
  "budget-exceeded",
  "incompatible-item",
  "config-error",
]);

export const SCRIPT_FAILURE_CODES = scriptFailureCodeSchema.options;

const numericConstraintSchema = z.object({
  finite: z.boolean(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
});

const eventContractSchema = z.object({
  id: z.string().min(1),
  payload: z.record(z.string(), z.string()),
  result: z.string(),
  applicationPhase: z.enum(["callback", "next-engine-phase"]),
});

const objectCapabilitySchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  mutation: z.enum(["read-only", "transform", "motion", "animation", "collision", "delete"]),
});

const objectEventSchema = z.object({
  id: z.string().min(1),
  handler: z.string().min(1),
  applicationPhase: z.enum(["callback", "next-engine-phase"]),
  cleanup: z.enum(["none", "owner-resources"]),
  statePolicy: z.enum(["preserve", "clear"]),
  invalidatesHandle: z.boolean(),
});

const gameContractSchema = z.object({
  gameId: z.string().min(1),
  modes: z.array(z.string().min(1)),
  capabilities: z.record(z.string(), z.string()),
  assetKinds: z.array(z.enum(["bg3d", "3dmf", "shapes", "skeleton"])),
  multiplayer: z.enum(["unsupported", "unsafe", "deterministic-only"]),
});

const persistentStorageSchema = z.object({
  schemaVersion: z.literal(SCRIPT_PERSISTENCE_LIMITS.schemaVersion),
  maxKeyBytes: z.literal(SCRIPT_PERSISTENCE_LIMITS.maxKeyBytes),
  maxValueBytes: z.literal(SCRIPT_PERSISTENCE_LIMITS.maxValueBytes),
  maxTotalBytes: z.literal(SCRIPT_PERSISTENCE_LIMITS.maxTotalBytes),
  supportedTypes: z.array(persistentStorageTypes),
  versionMismatch: z.literal(SCRIPT_PERSISTENCE_LIMITS.versionMismatch),
});

const scriptingContractSchema = z.object({
  contractVersion: z.literal(SCRIPT_CONTRACT_VERSION),
  apiVersion: z.literal(SCRIPT_API_VERSION),
  runtime: z.literal(SCRIPT_RUNTIME_VERSION),
  failureCodes: z.array(scriptFailureCodeSchema),
  numericConstraints: z.record(z.string(), numericConstraintSchema),
  events: z.array(eventContractSchema),
  objectEvents: z.array(objectEventSchema),
  objectCapabilities: z.array(objectCapabilitySchema),
  persistentStorage: persistentStorageSchema,
  api: ApiSchema,
  games: z.record(z.string(), gameContractSchema),
});

export type ScriptingContract = z.infer<typeof scriptingContractSchema>;
export type ScriptEventContract = z.infer<typeof eventContractSchema>;

function multiplayerClassification(row: GameCapabilityRow): "unsupported" | "unsafe" | "deterministic-only" {
  if (row.multiplayer === "unsupported") return "unsupported";
  if (row.multiplayer === "unsafeInMultiplayer") return "unsafe";
  return "deterministic-only";
}

function gameModes(gameId: string): readonly string[] {
  if (gameId === "Nanosaur2-Android") return ["adventure", "race", "battle", "capture"];
  if (gameId === "CroMagRally-Android") return ["local", "practice", "network"];
  if (gameId === "BillyFrontier-Android" || gameId === "MightyMike-Android") {
    return ["local"];
  }
  return ["single-player"];
}

function assetKinds(gameId: string): readonly ("bg3d" | "3dmf" | "shapes" | "skeleton")[] {
  if (gameId === "MightyMike-Android") return ["shapes"];
  if (gameId === "Bugdom-android" || gameId === "Nanosaur-android") return ["3dmf", "skeleton"];
  return ["bg3d", "skeleton"];
}

function buildGameContracts(): Record<string, z.infer<typeof gameContractSchema>> {
  return Object.fromEntries(
    Object.entries(CAPABILITY_MATRIX).map(([gameId, capabilities]) => [
      gameId,
      {
        gameId,
        modes: [...gameModes(gameId)],
        capabilities: { ...capabilities },
        assetKinds: [...assetKinds(gameId)],
        multiplayer: multiplayerClassification(capabilities),
      },
    ]),
  );
}

export const SCRIPTING_CONTRACT: ScriptingContract = scriptingContractSchema.parse({
  contractVersion: SCRIPT_CONTRACT_VERSION,
  apiVersion: SCRIPT_API_VERSION,
  runtime: SCRIPT_RUNTIME_VERSION,
  failureCodes: [...SCRIPT_FAILURE_CODES],
  numericConstraints: {
    vector: { finite: true },
    timerSeconds: { finite: true, minimum: 0 },
    intervalSeconds: { finite: true, minimum: 0.000001 },
    scale: { finite: true, minimum: 0.000001, maximum: 100 },
    nativeParamByte: { finite: true, minimum: 0, maximum: 255 },
  },
  events: [
    {
      id: "onTriggerEnter",
      payload: { self: "ObjectHandle", other: "ObjectHandle|nil", sideBits: "integer" },
      result: "TriggerResult|nil",
      applicationPhase: "callback",
    },
    {
      id: "onPickupCollected",
      payload: { pickup: "ObjectHandle", player: "ObjectHandle|nil", position: "Vector3" },
      result: "PickupResult|nil",
      applicationPhase: "next-engine-phase",
    },
    {
      id: "onWeaponHit",
      payload: { weapon: "ObjectHandle|nil", target: "ObjectHandle|nil", damage: "number" },
      result: "WeaponHitResult|nil",
      applicationPhase: "next-engine-phase",
    },
    {
      id: "onDamage",
      payload: { target: "ObjectHandle", source: "ObjectHandle|nil", damage: "number", cause: "integer" },
      result: "DamageResult|nil",
      applicationPhase: "callback",
    },
    {
      id: "onDamageApplied",
      payload: { target: "ObjectHandle", source: "ObjectHandle|nil", damage: "number", cause: "integer" },
      result: "nil",
      applicationPhase: "callback",
    },
    {
      id: "onDeath",
      payload: { player: "ObjectHandle", eventValue: "integer" },
      result: "nil",
      applicationPhase: "callback",
    },
    {
      id: "onPlayerSpawn",
      payload: { player: "ObjectHandle", position: "Vector3" },
      result: "nil",
      applicationPhase: "callback",
    },
    {
      id: "onPlayerRespawn",
      payload: { player: "ObjectHandle", position: "Vector3" },
      result: "nil",
      applicationPhase: "callback",
    },
    {
      id: "onCheckpointReached",
      payload: { player: "ObjectHandle", eventValue: "integer", position: "Vector3" },
      result: "nil",
      applicationPhase: "callback",
    },
    {
      id: "onLapComplete",
      payload: { player: "ObjectHandle", eventValue: "integer", position: "Vector3" },
      result: "nil",
      applicationPhase: "callback",
    },
    {
      id: "onRaceFinish",
      payload: { player: "ObjectHandle", eventValue: "integer", position: "Vector3" },
      result: "nil",
      applicationPhase: "callback",
    },
    {
      id: "onObjectiveComplete",
      payload: { player: "ObjectHandle", eventValue: "integer", position: "Vector3" },
      result: "nil",
      applicationPhase: "callback",
    },
    {
      id: "animationComplete",
      payload: { object: "ObjectHandle" },
      result: "nil",
      applicationPhase: "callback",
    },
    {
      id: "destroy",
      payload: { object: "ObjectHandle" },
      result: "nil",
      applicationPhase: "callback",
    },
  ],
  objectEvents: [
    { id: "spawn", handler: "onSpawn", applicationPhase: "callback", cleanup: "none", statePolicy: "preserve", invalidatesHandle: false },
    { id: "update", handler: "onUpdate", applicationPhase: "callback", cleanup: "none", statePolicy: "preserve", invalidatesHandle: false },
    { id: "triggerEnter", handler: "onTriggerEnter", applicationPhase: "callback", cleanup: "none", statePolicy: "preserve", invalidatesHandle: false },
    { id: "triggerStay", handler: "onTriggerStay", applicationPhase: "callback", cleanup: "none", statePolicy: "preserve", invalidatesHandle: false },
    { id: "triggerExit", handler: "onTriggerExit", applicationPhase: "callback", cleanup: "none", statePolicy: "preserve", invalidatesHandle: false },
    { id: "animationEvent", handler: "onAnimationEvent", applicationPhase: "callback", cleanup: "none", statePolicy: "preserve", invalidatesHandle: false },
    { id: "animationComplete", handler: "onAnimationComplete", applicationPhase: "callback", cleanup: "none", statePolicy: "preserve", invalidatesHandle: false },
    { id: "activate", handler: "onActivate", applicationPhase: "callback", cleanup: "none", statePolicy: "preserve", invalidatesHandle: false },
    { id: "deactivate", handler: "onDeactivate", applicationPhase: "callback", cleanup: "owner-resources", statePolicy: "clear", invalidatesHandle: false },
    { id: "streamIn", handler: "onStreamIn", applicationPhase: "callback", cleanup: "none", statePolicy: "preserve", invalidatesHandle: false },
    { id: "streamOut", handler: "onStreamOut", applicationPhase: "callback", cleanup: "owner-resources", statePolicy: "clear", invalidatesHandle: true },
    { id: "checkpointReset", handler: "onCheckpointReset", applicationPhase: "callback", cleanup: "owner-resources", statePolicy: "preserve", invalidatesHandle: false },
    { id: "destroy", handler: "onDestroy", applicationPhase: "callback", cleanup: "owner-resources", statePolicy: "clear", invalidatesHandle: true },
  ],
  objectCapabilities: [
    { id: "position", description: "Read and set an object's position.", mutation: "transform" },
    { id: "velocity", description: "Set an object's velocity.", mutation: "motion" },
    { id: "rotation", description: "Set an object's Euler rotation.", mutation: "transform" },
    { id: "scale", description: "Set an object's uniform scale.", mutation: "transform" },
    { id: "animation", description: "Select an animation by index or declared name.", mutation: "animation" },
    { id: "collision", description: "Enable or disable native collision checks when the adapter supports them.", mutation: "collision" },
    { id: "delete", description: "Request safe deletion of an object.", mutation: "delete" },
  ],
  persistentStorage: SCRIPT_PERSISTENCE_LIMITS,
  api: AUTHORITATIVE_API_SCHEMA,
  games: buildGameContracts(),
});

export function getScriptingContractGame(gameId: string): ScriptingContract["games"][string] | null {
  return SCRIPTING_CONTRACT.games[gameId] ?? null;
}

export function validateScriptingContract(): Result<true, string> {
  const duplicate = (values: readonly string[]): readonly string[] => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) duplicates.add(value);
      seen.add(value);
    }
    return [...duplicates];
  };

  const duplicateApiFunctions = duplicate(
    SCRIPTING_CONTRACT.api.apis.map((api) => api.name),
  );
  if (duplicateApiFunctions.length > 0) {
    return err(`Duplicate API functions: ${duplicateApiFunctions.join(", ")}`);
  }

  const commandApis = SCRIPTING_CONTRACT.api.apis.filter(
    (api) => api.command !== undefined,
  );
  if (commandApis.length === 0) {
    return err("The API contract does not declare any typed commands");
  }
  const commandMetadata = new Map<string, string>();
  for (const api of commandApis) {
    const command = api.command;
    if (!command) continue;
    const signature = JSON.stringify(command);
    const priorSignature = commandMetadata.get(command.capability);
    if (priorSignature !== undefined && priorSignature !== signature) {
      return err(`Command metadata drift for capability '${command.capability}'`);
    }
    commandMetadata.set(command.capability, signature);
  }
  const incompleteCommands = commandApis
    .filter((api) => api.returnType !== "boolean" && api.returnType !== "ObjectCommandResult" && api.returnType !== "PlayerCommandResult")
    .map((api) => api.name);
  if (incompleteCommands.length > 0) {
    return err(`Command APIs must return boolean or ObjectCommandResult: ${incompleteCommands.join(", ")}`);
  }

  const duplicateHooks = duplicate(
    SCRIPTING_CONTRACT.api.hooks.map((hook) => hook.name),
  );
  if (duplicateHooks.length > 0) {
    return err(`Duplicate API hooks: ${duplicateHooks.join(", ")}`);
  }

  const duplicateEvents = duplicate(
    SCRIPTING_CONTRACT.events.map((event) => event.id),
  );
  if (duplicateEvents.length > 0) {
    return err(`Duplicate event contracts: ${duplicateEvents.join(", ")}`);
  }

  const duplicateObjectEvents = duplicate(
    SCRIPTING_CONTRACT.objectEvents.map((event) => event.id),
  );
  if (duplicateObjectEvents.length > 0) {
    return err(`Duplicate object event contracts: ${duplicateObjectEvents.join(", ")}`);
  }
  const invalidatingEventsWithoutCleanup = SCRIPTING_CONTRACT.objectEvents
    .filter((event) => event.invalidatesHandle && event.cleanup !== "owner-resources")
    .map((event) => event.id);
  if (invalidatingEventsWithoutCleanup.length > 0) {
    return err(`Handle-invalidating object events must clean owner resources: ${invalidatingEventsWithoutCleanup.join(", ")}`);
  }

  const duplicateFailureCodes = duplicate(SCRIPTING_CONTRACT.failureCodes);
  if (duplicateFailureCodes.length > 0) {
    return err(`Duplicate failure codes: ${duplicateFailureCodes.join(", ")}`);
  }

  const nativeRegistrationDrift = SCRIPTING_CONTRACT.api.games.flatMap((game) => {
    const explicitTypes = game.nativeSpawns
      .filter((spawn) => spawn.nativeType !== undefined)
      .map((spawn) => spawn.nativeType);
    const duplicateTypes = duplicate(explicitTypes.map((type) => String(type)));
    const missingTypes = game.nativeSpawns
      .filter(
        (spawn) =>
          spawn.nativeType === undefined &&
          !/^\d+$/.test(spawn.id),
      )
      .map((spawn) => `${game.gameId}:${spawn.id}`);
    return [
      ...duplicateTypes.map((type) => `${game.gameId}:duplicate native type ${type}`),
      ...missingTypes.map((id) => `${id}:missing native type`),
    ];
  });
  if (nativeRegistrationDrift.length > 0) {
    return err(`Native registration metadata drift: ${nativeRegistrationDrift.join(", ")}`);
  }

  const gameIds = new Set(SCRIPTING_CONTRACT.api.games.map((game) => game.gameId));
  const duplicateGames = duplicate(SCRIPTING_CONTRACT.api.games.map((game) => game.gameId));
  if (duplicateGames.length > 0) {
    return err(`Duplicate API game metadata: ${duplicateGames.join(", ")}`);
  }
  const missingCapabilityRows = Object.keys(SCRIPTING_CONTRACT.games).filter(
    (gameId) => !gameIds.has(gameId),
  );
  if (missingCapabilityRows.length > 0) {
    return err(`Missing API metadata for games: ${missingCapabilityRows.join(", ")}`);
  }

  const missingApiGames = SCRIPTING_CONTRACT.api.games
    .filter((game) => SCRIPTING_CONTRACT.games[game.gameId] === undefined)
    .map((game) => game.gameId);
  if (missingApiGames.length > 0) {
    return err(`Missing capability metadata for games: ${missingApiGames.join(", ")}`);
  }

  const missingApiHooks = SCRIPTING_CONTRACT.api.games.flatMap((game) =>
    game.supportedHooks
      .filter((hook) => !scriptHookIdSchema.safeParse(hook).success)
      .map((hook) => `${game.gameId}:${hook}`),
  );
  if (missingApiHooks.length > 0) {
    return err(`Unknown API hooks: ${missingApiHooks.join(", ")}`);
  }

  const capabilityDrift = Object.entries(SCRIPTING_CONTRACT.games).flatMap(
    ([gameId, contract]) => {
      const row = CAPABILITY_MATRIX[gameId];
      if (!row) return [`${gameId}:missing capability matrix row`];
      const keys: readonly (keyof GameCapabilityRow)[] = [
        "levelHooks",
        "globalFrameHooks",
        "terrainItemHooks",
        "splineItemHooks",
        "mapItemHooks",
        "objectFrameHooks",
        "objectTriggerEvents",
        "objectAnimationCompletionEvents",
        "objectAnimationMarkerEvents",
        "checkpointEvents",
        "raceProgressEvents",
        "objectiveEvents",
        "damageEvents",
        "playerLifecycleEvents",
        "pickupEvents",
        "pickupScoreEffects",
        "weaponHitEvents",
        "nativeSpawn",
        "scriptedSpawn",
        "playerLookup",
        "playerCommands",
        "playerInvulnerability",
        "raceMetadata",
        "objectiveMetadata",
        "objectCollision",
        "levelMetadata",
        "timeAPIs",
        "logging",
        "statusReporting",
        "persistence",
        "multiplayer",
      ];
      return keys
        .filter((key) => contract.capabilities[key] !== row[key])
        .map((key) => `${gameId}:${String(key)}`);
    },
  );
  if (capabilityDrift.length > 0) {
    return err(`Capability metadata drift: ${capabilityDrift.join(", ")}`);
  }

  const unavailableHooks = SCRIPTING_CONTRACT.api.games.flatMap((game) =>
    game.supportedHooks
      .filter(
        (hook) =>
          getCapability(game.gameId, getHookCapabilityKey(hook)) ===
          "unsupported",
      )
      .map((hook) => `${game.gameId}:${hook}`),
  );
  if (unavailableHooks.length > 0) {
    return err(`API advertises unavailable hooks: ${unavailableHooks.join(", ")}`);
  }

  return ok(true);
}
