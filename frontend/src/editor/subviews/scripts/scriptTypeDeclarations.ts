import { strToU8 } from "fflate";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { buildNativeSpawnDeclarations, buildNativeSpawnOverloads } from "./scriptNativeDeclarations";
import type { ApiFunction, Field } from "./scriptApiSchema";
import { SCRIPT_FAILURE_CODES, SCRIPTING_CONTRACT, SCRIPT_RUNTIME_CAPABILITY_FIELDS } from "./scriptContract";
import { getAvailableApiFunctions } from "./scriptApiAvailability";

export interface ScriptTypeDeclarationFile {
  readonly path: string;
  readonly content: string;
}

function mapFieldToLuaLS(field: Field): string {
  const optionalSuffix = field.optional ? "|nil" : "";
  if (field.type === "stringUnion" && field.unionValues) {
    const unionStr = field.unionValues.map((v) => `"${v}"`).join("|");
    return `---@field ${field.name} ${unionStr}${optionalSuffix}`;
  }
  const typeMap: Record<string, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    vector2: "Vector2",
    vector3: "Vector3",
    objectHandle: "ObjectHandle",
    table: "table",
    function: "function",
    unknown: "unknown",
  };
  const luaType = typeMap[field.type] ?? "unknown";
  return `---@field ${field.name} ${luaType}${optionalSuffix}`;
}

function buildContextFields(gameId: string): readonly string[] {
  const commonFields = [
    "---@field gameId string",
    "---@field gameName string",
    "---@field levelNum number",
    "---@field levelName string|nil",
  ];
  const game = SCRIPTING_CONTRACT.api.games.find((g) => g.gameId === gameId);
  if (!game) return commonFields;
  return [...commonFields, ...game.contextFields.map(mapFieldToLuaLS)];
}

function buildFrameFields(gameId: string): readonly string[] {
  const commonFields = [
    "---@field frameNum number",
    "---@field deltaSeconds number",
    "---@field levelTimeSeconds number",
  ];
  const game = SCRIPTING_CONTRACT.api.games.find((g) => g.gameId === gameId);
  if (!game) return commonFields;
  return [...commonFields, ...game.contextFields.map(mapFieldToLuaLS)];
}

function buildHookSignatures(state: ScriptWorkspaceState): string {
  return state.context.supportedHooks
    .map((hookId) => {
      const hook = SCRIPTING_CONTRACT.api.hooks.find((h) => h.name === hookId);
      if (!hook) {
        return `---@field ${hookId} fun(ctx: LevelContext): nil`;
      }
      return `---@field ${hook.name} fun(ctx: ${hook.contextType}): ${hook.returnType}`;
    })
    .join("\n");
}

function buildStringAlias(values: readonly string[]): string {
  const uniqueValues = [...new Set(values)];
  return uniqueValues.length > 0
    ? uniqueValues.map((value) => JSON.stringify(value)).join(" | ")
    : "string";
}

function buildTagDeclarations(state: ScriptWorkspaceState): string {
  return buildStringAlias(
    state.context.allowedTags
      .concat(
        state.behaviorCatalog.flatMap((behavior) => behavior.contributedTags),
      )
      .map((tag) => tag.id),
  );
}

function buildObjectTypeDeclarations(state: ScriptWorkspaceState): string {
  return buildStringAlias([
    ...state.context.allowedTags
      .filter((tag) => tag.targetKinds.includes("customObject"))
      .map((tag) => tag.id),
    ...state.customObjects.map((objectDefinition) => objectDefinition.id),
  ]);
}

function objectEventContextType(eventId: string): string {
  if (eventId === "animationEvent") return "AnimationMarkerObjectFrameContext";
  if (eventId === "animationComplete") return "AnimationCompleteObjectFrameContext";
  return "ObjectFrameContext";
}

function buildNativeSpawnIdDeclarations(state: ScriptWorkspaceState): string {
  const game = SCRIPTING_CONTRACT.api.games.find(
    (candidate) => candidate.gameId === state.context.gameId,
  );
  if (game === undefined || game.nativeSpawns.length === 0) {
    return "---@alias NativeSpawnId integer Numeric terrain item type ID.";
  }
  return [
    "---@alias NativeSpawnId",
    "---| integer # Numeric terrain item type ID from the game's item dispatch table.",
    ...game.nativeSpawns.map(
      (nativeSpawn) =>
        `---| ${JSON.stringify(nativeSpawn.id)} # ${nativeSpawn.label}: ${nativeSpawn.description}`,
    ),
  ].join("\n");
}

function buildPangeaModuleDeclaration(): readonly string[] {
  return [
    "---@type PangeaApi",
    "pangea = {}",
    "",
    "---@type PangeaApi",
    "local pangeaModule = pangea",
    "return pangeaModule",
  ];
}

function luaFunctionFieldType(field: Field): string {
  if (field.type === "stringUnion" && field.unionValues && field.unionValues.length > 0) {
    return (
      field.unionValues.map((value) => JSON.stringify(value)).join("|") +
      (field.optional ? "|nil" : "")
    );
  }
  const types: Record<Field["type"], string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    vector2: "Vector2",
    vector3: "Vector3",
    objectHandle: "ObjectHandle",
    stringUnion: "string",
    table: "table",
    function: "function",
    unknown: "unknown",
  };
  return types[field.type] + (field.optional ? "|nil" : "");
}

function luaApiParameterType(
  namespace: string,
  methodName: string,
  field: Field,
): string {
  if (field.type === "function") {
    const callbackType = namespace === "events" ? "fun(payload: unknown)" : "fun()";
    return callbackType + (field.optional ? "|nil" : "");
  }
  const integerParameters = new Set([
    "playerNum",
    "timerId",
    "taskId",
    "subscriptionId",
  ]);
  const methodUsesIntegerParameters =
    (namespace === "random" && ["integer", "seed"].includes(methodName)) ||
    (namespace === "persistence" && field.name === "version") ||
    (namespace === "api" && methodName === "requireVersion");
  if (integerParameters.has(field.name) || methodUsesIntegerParameters) {
    return "integer" + (field.optional ? "|nil" : "");
  }
  return luaFunctionFieldType(field);
}

function luaApiReturnType(namespace: string, methodName: string, returnType: string): string {
  const integerMethods = new Set([
    "level.current",
    "time.frame",
    "time.after",
    "time.every",
    "task.start",
    "events.on",
    "events.once",
    "events.emit",
    "random.integer",
    "player.count",
  ]);
  return integerMethods.has(`${namespace}.${methodName}`) ? "integer" : returnType;
}

function buildApiFunctionDeclaration(
  api: ApiFunction,
  namespace: string,
  methodName: string,
  tagType?: string,
  overrides?: {
    readonly parameterTypes?: Readonly<Record<string, string>>;
    readonly returnType?: string;
  },
): string {
  const parameters = api.parameters
    .map((parameter) => {
      const overriddenType = overrides?.parameterTypes?.[parameter.name];
      const parameterType = overriddenType === undefined
        ? parameter.name === "tag" && tagType !== undefined
          ? tagType + (parameter.optional ? "|nil" : "")
          : luaApiParameterType(namespace, methodName, parameter)
        : overriddenType;
      return `${parameter.name}: ${parameterType}`;
    })
    .join(", ");
  const description = api.description === undefined ? "" : ` ${api.description}`;
  const returnType = methodName === "tags" && tagType !== undefined
    ? `${tagType}[]`
    : overrides?.returnType ?? luaApiReturnType(namespace, methodName, api.returnType);
  return `---@field ${methodName} fun(${parameters}): ${returnType}${description}`;
}

function buildApiClassDeclarations(namespace: string, gameId: string): readonly string[] {
  const prefix = `pangea.${namespace}.`;
  return getAvailableApiFunctions(gameId, SCRIPTING_CONTRACT.api.apis)
    .filter((api) => api.name.startsWith(prefix))
    .map((api) => buildApiFunctionDeclaration(api, namespace, api.name.slice(prefix.length)));
}

function buildObjectApiDeclarations(tagType: string, gameId: string): readonly string[] {
  const prefix = "pangea.object.";
  return getAvailableApiFunctions(gameId, SCRIPTING_CONTRACT.api.apis)
    .filter((api) => api.name.startsWith(prefix))
    .map((api) => {
      const methodName = api.name.slice(prefix.length);
      return buildApiFunctionDeclaration(api, "object", methodName, tagType);
    });
}

function buildSpawnApiDeclarations(gameId: string): readonly string[] {
  const prefix = "pangea.spawn.";
  const overrides: Readonly<Record<string, { readonly parameterTypes: Readonly<Record<string, string>>; readonly returnType: string }>> = {
    nativeResult: {
      parameterTypes: { id: "NativeSpawnId", options: "NativeSpawnOptions|nil" },
      returnType: "NativeSpawnResult",
    },
    scripted: {
      parameterTypes: { options: "ScriptedSpawnOptions|nil" },
      returnType: "ObjectHandle|nil",
    },
  };
  return getAvailableApiFunctions(gameId, SCRIPTING_CONTRACT.api.apis)
    .filter((api) => api.name.startsWith(prefix) && !api.name.endsWith(".native"))
    .map((api) => {
      const methodName = api.name.slice(prefix.length);
      const override = overrides[methodName];
      return buildApiFunctionDeclaration(api, "spawn", methodName, undefined, override);
    });
}

function buildRuntimeDeclaration(state: ScriptWorkspaceState): string {
  const game = SCRIPTING_CONTRACT.api.games.find((candidate) => candidate.gameId === state.context.gameId);
  const gameFields = buildContextFields(state.context.gameId);
  const frameFields = buildFrameFields(state.context.gameId);
  const tagType = buildTagDeclarations(state);
  const objectType = buildObjectTypeDeclarations(state);
  const nativeSpawnIdDeclaration = buildNativeSpawnIdDeclarations(state);
  const nativeItems = game?.nativeSpawns ?? [];
  const nativeOptionDeclarations = buildNativeSpawnDeclarations(nativeItems);
  const nativeOverloads = buildNativeSpawnOverloads(nativeItems);
  const objectEventType = SCRIPTING_CONTRACT.objectEvents
    .map((event) => JSON.stringify(event.id))
    .join("|");

  return [
    "---@class Vector2",
    "---@field x number",
    "---@field y number",
    "",
    "---@class Vector3",
    "---@field x number",
    "---@field y number",
    "---@field z number",
    "",
    "---@class ObjectHandle",
    "---@field id number",
    "---@field generation number",
    "",
    `---@alias ObjectTag ${tagType}`,
    `---@alias ObjectTypeId ${objectType}`,
    nativeSpawnIdDeclaration,
    "",
    "---@class GameContext",
    "---@field gameId string",
    "---@field gameName string",
    "",
    "---@class LevelContext : GameContext",
    ...gameFields,
    "",
    "---@class FrameContext : LevelContext",
    ...frameFields,
    "",
    "---@class ObjectFrameContext : FrameContext",
    "---@field object ObjectHandle",
    "---@field objectType ObjectTypeId",
    "---@field position Vector3",
    `---@field tags ${tagType}[]`,
    `---@field event ${objectEventType}`,
    "---@field eventValue integer|nil",
    "---@field other ObjectHandle|nil",
    "---@field sideBits integer",
    "",
    "---@class AnimationMarkerObjectFrameContext : ObjectFrameContext",
    "---@field event \"animationEvent\"",
    "---@field eventValue integer",
    "",
    "---@class AnimationCompleteObjectFrameContext : ObjectFrameContext",
    "---@field event \"animationComplete\"",
    "---@field eventValue nil",
    "",
    "---@class ObjectBehaviorSelf",
    "---@field handle ObjectHandle",
    "",
    "---@class CustomObjectBehavior",
    ...SCRIPTING_CONTRACT.objectEvents.map(
      (event) =>
        `---@field ${event.handler} fun(self: ObjectBehaviorSelf, ctx: ${objectEventContextType(event.id)})|nil`,
    ),
    "",
    "---@class TerrainItemContext : LevelContext",
    "---@field itemType number",
    "---@field remappedItemType number",
    "---@field position Vector3",
    "---@field flags number",
    "---@field params number[]",
    "",
    "---@class SplineItemContext : LevelContext",
    "---@field itemType number",
    "---@field splineNum number",
    "---@field placement number",
    "---@field params number[]",
    "",
    "---@class MikeMapItemContext : GameContext",
    "---@field scene number",
    "---@field area number",
    "---@field itemType number",
    "---@field position Vector2",
    "---@field params number[]",
    "",
    "---@class PickupContext : LevelContext",
    "---@field playerNum number",
    "---@field pickupId string|nil",
    "---@field pickupType number",
    "---@field amount number",
    "---@field pickup ObjectHandle",
    "---@field player ObjectHandle|nil",
    "---@field position Vector3",
    "",
    "---@class WeaponHitContext : LevelContext",
    "---@field playerNum number",
    "---@field weaponId string|nil",
    "---@field weaponType number",
    "---@field damage number",
    "---@field weapon ObjectHandle|nil",
    "---@field target ObjectHandle|nil",
    "---@field position Vector3",
    "---@field targetType number",
    "---@field targetFlags number",
    "",
    "---@class TriggerContext : LevelContext",
    "---@field playerNum number",
    "---@field triggerId string|nil",
    "---@field triggerType number",
    "---@field self ObjectHandle",
    "---@field other ObjectHandle|nil",
    "---@field position Vector3",
    "---@field sideBits number",
    "---@field otherType number",
    "---@field otherFlags number",
    "",
    "---@class RacePlayer",
    "---@field playerNum number",
    "---@field local boolean",
    "",
    "---@class RaceContext : LevelContext",
    '---@field mode "local"|"practice"|"network"|nil',
    "---@field trackName string|nil",
    "",
    "---@class RaceConfigContext : RaceContext",
    "---@field lapCount number",
    "",
    "---@class ItemSpawnResult",
    "---@field handled boolean",
    "---@field markInUse boolean|nil",
    "",
    "---@class PickupResult",
    "---@field handled boolean",
    "---@field consumePickup boolean|nil",
    "---@field scoreDelta number|nil",
    "---@field healthDelta number|nil",
    "",
    "---@class WeaponHitResult",
    "---@field handled boolean",
    "---@field applyDamage boolean|nil",
    "---@field damage number|nil",
    "---@field destroyTarget boolean|nil",
    "---@field scoreDelta number|nil",
    "",
    "---@class TriggerResult",
    "---@field handled boolean",
    "---@field solid boolean|nil",
    "---@field deleteSelf boolean|nil",
    "---@field deleteOther boolean|nil",
    "---@field damagePlayer number|nil",
    "---@field healthDelta number|nil",
    "---@field scoreDelta number|nil",
    "",
    "---@class DamageContext : LevelContext",
    "---@field playerNum number",
    "---@field cause number",
    "---@field damage number",
    "---@field source ObjectHandle|nil",
    "---@field target ObjectHandle",
    "---@field position Vector3",
    "",
    "---@class DamageResult",
    "---@field handled boolean|nil",
    "---@field applyDamage boolean|nil",
    "---@field damage number|nil",
    "",
    "---@class PlayerEventContext : LevelContext",
    "---@field playerNum number",
    "---@field player ObjectHandle",
    "---@field position Vector3|nil",
    "---@field eventValue number|nil",
    "",
    "---@alias ObjectiveOutcome 0|1|2",
    "",
    "---@class ObjectiveEventContext : PlayerEventContext",
    "---@field eventValue ObjectiveOutcome",
    "",
    "---@class PangeaLogApi",
    ...buildApiClassDeclarations("log", state.context.gameId),
    "",
    "---@class ObjectSource",
    "---@field kind \"terrain\"|\"spline\"|\"map\"",
    "---@field itemIndex integer",
    "---@field nativeType integer",
    "---@field splineNum integer",
    "---@field x number",
    "---@field y number",
    "---@field z number",
    "---@field placement number",
    "",
    "---@class PangeaObjectApi",
    ...buildObjectApiDeclarations(tagType, state.context.gameId),
    "",
    "---@class ObjectCommandResult",
    "---@field ok boolean",
    "---@field code integer",
    `---@field reason ${SCRIPT_FAILURE_CODES.map((code) => JSON.stringify(code)).join("|")}|"unknown"`,
    "---@field message string",
    "---@field primary ObjectHandle|nil",
    "",
    "---@class PlayerCommandResult",
    "---@field ok boolean",
    "---@field code integer",
    `---@field reason ${SCRIPT_FAILURE_CODES.map((code) => JSON.stringify(code)).join("|")}|"unknown"`,
    "---@field message string",
    "---@field playerNum integer",
    "",
    "---@class NativeSpawnOptions",
    "---@field subtype integer|nil Game-specific subtype, such as a powerup kind.",
    "---@field amount integer|nil Game-specific quantity when supported.",
    "---@field param0 integer|nil Terrain item parameter 0; overrides subtype.",
    "---@field param1 integer|nil Terrain item parameter 1; overrides amount.",
    "---@field param2 integer|nil Terrain item parameter 2.",
    "---@field param3 integer|nil Terrain item parameter 3.",
    "",
    "---@class NativeSpawnResult",
    "---@field ok boolean",
    "---@field code integer",
    `---@field reason ${SCRIPT_FAILURE_CODES.map((code) => JSON.stringify(code)).join("|")}|"unknown"`,
    "---@field message string",
    "---@field primary ObjectHandle|nil",
    "",
    "---@class PangeaNativeSpawn",
    ...nativeOverloads,
    "---@overload fun(id: NativeSpawnId, position: Vector3, options: NativeSpawnOptions|nil): ObjectHandle|nil",
    "",
    "---@class PangeaSpawnApi",
    "---@field native PangeaNativeSpawn",
    ...buildSpawnApiDeclarations(state.context.gameId),
    "",
    "---@class ScriptedSpawnOptions",
    "---@field scale number|nil",
    "---@field animation string|integer|nil",
    "---@field animationSpeed number|nil",
    "---@field blendSeconds number|nil",
    "",
    "---@class PangeaCapabilities",
    ...SCRIPT_RUNTIME_CAPABILITY_FIELDS.map((field) => `---@field ${field.name} ${field.luaType}`),
    "",
    "---@class PangeaRuntimeApi",
    "---@field contractVersion integer",
    "---@field apiVersion integer",
    "---@field runtimeFingerprint integer",
    "---@field version integer",
    "---@field minimumVersion integer",
    ...buildApiClassDeclarations("api", state.context.gameId),
    "",
    "---@class PangeaDiagnostics",
    "---@field memoryUsedBytes integer",
    "---@field memoryLimitBytes integer",
    "---@field activeTimers integer",
    "---@field activeTasks integer",
    "---@field activeSubscriptions integer",
    "---@field frameNum integer",
    "---@field commandCount integer",
    "---@field commandHash integer",
    "---@field commandTraceOverflow boolean",
    "---@field commandTrace PangeaCommandTraceEntry[]",
    "---@field persistentBytes integer",
    "---@field persistentEntries integer",
    "",
    "---@class PangeaCommandTraceEntry",
    "---@field id string",
    "---@field objectId integer",
    "---@field generation integer",
    "---@field status integer",
    "",
    "---@class PangeaLevelApi",
    ...buildApiClassDeclarations("level", state.context.gameId),
    "",
    "---@class PangeaTimeApi",
    ...buildApiClassDeclarations("time", state.context.gameId),
    "",
    "---@class PangeaTaskApi",
    ...buildApiClassDeclarations("task", state.context.gameId),
    "",
    "---@class PangeaEventsApi",
    ...buildApiClassDeclarations("events", state.context.gameId),
    "",
    "---@class PangeaRandomApi",
    ...buildApiClassDeclarations("random", state.context.gameId),
    "",
    "---@class PangeaPlayerSnapshot",
    "---@field playerNum integer",
    "---@field position Vector3",
    "---@field health number|nil",
    "---@field lapNum integer|nil",
    "---@field checkpointNum integer|nil",
    "---@field placement integer|nil",
    "---@field raceComplete boolean|nil",
    "",
    "---@class PangeaRaceResult",
    "---@field playerNum integer",
    "---@field lapNum integer",
    "---@field checkpointNum integer",
    "---@field placement integer",
    "---@field raceComplete boolean",
    "",
    "---@class PangeaObjectiveResult",
    "---@field levelNum integer",
    "---@field playerNum integer",
    "---@field outcome 0|1|2",
    "",
    "---@class PangeaPlayerApi",
    ...buildApiClassDeclarations("player", state.context.gameId),
    "",
    "---@class PangeaPersistenceApi",
    ...buildApiClassDeclarations("persistence", state.context.gameId),
    "",
    nativeOptionDeclarations,
    "---@class PangeaApi",
    "---@field api PangeaRuntimeApi",
    "---@field game PangeaGameApi",
    "---@field level PangeaLevelApi",
    "---@field time PangeaTimeApi",
    "---@field task PangeaTaskApi",
    "---@field events PangeaEventsApi",
    "---@field random PangeaRandomApi",
    "---@field persistence PangeaPersistenceApi",
    "---@field player PangeaPlayerApi",
    "---@field log PangeaLogApi",
    "---@field object PangeaObjectApi",
    "---@field spawn PangeaSpawnApi",
    "",
    "---@class ScriptModule",
    buildHookSignatures(state),
    "",
    ...buildPangeaModuleDeclaration(),
  ].join("\n");
}

export function buildScriptTypeDeclarationFiles(
  state: ScriptWorkspaceState,
): readonly ScriptTypeDeclarationFile[] {
  return [
    {
      path: "Data/Scripts/types/pangea-runtime.lua",
      content: buildRuntimeDeclaration(state),
    },
    {
      path: "Data/Scripts/types/pangea-games.lua",
      content: [
        '---@alias GameId "BillyFrontier-Android"|"Bugdom-android"|"Bugdom2-Android"|"CroMagRally-Android"|"MightyMike-Android"|"Nanosaur-android"|"Nanosaur2-Android"|"OttoMatic-Android"',
        "",
        "---@class PangeaGameApi",
        "---@field id GameId",
        "---@field name string",
        "---@field supportedHooks string[]",
        "---@field tags string[]",
        "",
        "local game = {}",
        "return game",
      ].join("\n"),
    },
  ];
}

export function buildScriptTypePackageFiles(
  state: ScriptWorkspaceState,
): readonly { readonly path: string; readonly bytes: Uint8Array }[] {
  return buildScriptTypeDeclarationFiles(state).map((file) => ({
    path: file.path,
    bytes: strToU8(file.content),
  }));
}
