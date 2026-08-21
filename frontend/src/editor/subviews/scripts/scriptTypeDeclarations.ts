import { strToU8 } from "fflate";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { buildNativeSpawnDeclarations, buildNativeSpawnOverloads } from "./scriptNativeDeclarations";
import { Field } from "./scriptApiSchema";
import { SCRIPT_FAILURE_CODES, SCRIPTING_CONTRACT } from "./scriptContract";

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

function buildObjectCommandDeclarations(): readonly string[] {
  return SCRIPTING_CONTRACT.api.apis
    .filter((api) => api.command !== undefined && api.name.startsWith("pangea.object."))
    .map((api) => {
      const methodName = api.name.slice("pangea.object.".length);
      const parameters = api.parameters
        .map((parameter) => `${parameter.name}: ${luaFunctionFieldType(parameter)}`)
        .join(", ");
      return `---@field ${methodName} fun(${parameters}): ${api.returnType}`;
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
    "---@class ObjectFrameResult",
    "---@field positionOffset Vector3|nil",
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
    "---@class PangeaLogApi",
    "---@field info fun(message: string)",
    "---@field warn fun(message: string)",
    "---@field error fun(message: string)",
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
    "---@field exists fun(handle: ObjectHandle): boolean",
    "---@field position fun(handle: ObjectHandle): Vector3|nil",
    "---@field source fun(handle: ObjectHandle): ObjectSource|nil",
    "---@field all fun(): ObjectHandle[]",
    "---@field findByTag fun(tag: string): ObjectHandle[]",
    "---@field nearest fun(origin: Vector3, tag: string|nil): ObjectHandle|nil",
    ...buildObjectCommandDeclarations(),
    `---@field tags fun(handle: ObjectHandle): ${tagType}[]`,
    `---@field hasTag fun(handle: ObjectHandle, tag: ${tagType}): boolean`,
    "---@field state fun(handle: ObjectHandle): table|nil",
    "",
    "---@class ObjectCommandResult",
    "---@field ok boolean",
    "---@field code integer",
    `---@field reason ${SCRIPT_FAILURE_CODES.map((code) => JSON.stringify(code)).join("|")}|"unknown"`,
    "---@field message string",
    "---@field primary ObjectHandle|nil",
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
    "---@field nativeResult fun(id: NativeSpawnId, position: Vector3, options: NativeSpawnOptions|nil): NativeSpawnResult",
    "---@field scripted fun(id: string, position: Vector3, options: ScriptedSpawnOptions|nil): ObjectHandle|nil",
    "",
    "---@class ScriptedSpawnOptions",
    "---@field scale number|nil",
    "---@field animation string|integer|nil",
    "---@field animationSpeed number|nil",
    "---@field blendSeconds number|nil",
    "",
    "---@class PangeaCapabilities",
    "---@field levelSettings boolean",
    "---@field objectMutation boolean",
    "---@field objectPosition boolean",
    "---@field spawnNative boolean",
    "---@field spawnScripted boolean",
    "---@field objectQueries boolean",
    "---@field timers boolean",
    "---@field tasks boolean",
    "---@field events boolean",
    "---@field persistence boolean",
    "---@field terrainItems boolean",
    "---@field splineItems boolean",
    "---@field mapItems boolean",
    "---@field memoryLimitBytes integer",
    "---@field loadInstructionBudget integer",
    "---@field eventInstructionBudget integer",
    "---@field frameInstructionBudget integer",
    "---@field timerLimit integer",
    "---@field taskLimit integer",
    "---@field subscriptionLimit integer",
    "---@field playerLookup boolean",
    "",
    "---@class PangeaRuntimeApi",
    "---@field contractVersion integer",
    "---@field apiVersion integer",
    "---@field version integer",
    "---@field minimumVersion integer",
    "---@field requireVersion fun(minimum: integer, maximum: integer|nil): true Raise a clear load error when the runtime API is incompatible.",
    "---@field capabilities fun(): PangeaCapabilities",
    "---@field diagnostics fun(): PangeaDiagnostics",
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
    "---@field current fun(): integer",
    "---@field setting fun(key: string): string|number|boolean|nil",
    "",
    "---@class PangeaTimeApi",
    "---@field frame fun(): integer",
    "---@field delta fun(): number",
    "---@field level fun(): number",
    "---@field after fun(delaySeconds: number, callback: fun()): integer Schedule a one-shot callback using level time.",
    "---@field every fun(intervalSeconds: number, callback: fun()): integer Schedule a repeating callback without accumulating frame drift.",
    "---@field cancel fun(timerId: integer): boolean",
    "---@field isActive fun(timerId: integer): boolean",
    "",
    "---@class PangeaTaskApi",
    "---@field start fun(callback: fun()): integer Start a budgeted coroutine immediately.",
    "---@field wait fun(delaySeconds: number) Suspend the current task until level time advances by the delay.",
    "---@field cancel fun(taskId: integer): boolean",
    "---@field isActive fun(taskId: integer): boolean",
    "",
    "---@class PangeaEventsApi",
    "---@field on fun(eventName: string, callback: fun(payload: unknown)): integer Subscribe and return a removable subscription ID.",
    "---@field once fun(eventName: string, callback: fun(payload: unknown)): integer Subscribe for the next matching emission only.",
    "---@field off fun(subscriptionId: integer): boolean",
    "---@field emit fun(eventName: string, payload: unknown|nil): integer Emit synchronously and return the number of listeners called.",
    "",
    "---@class PangeaRandomApi",
    "---@field number fun(): number Returns a deterministic value in the range 0 through 1.",
    "---@field integer fun(minimum: integer, maximum: integer): integer",
    "---@field seed fun(seed: integer) Reset the deterministic script random stream.",
    "",
    "---@class PangeaPlayerSnapshot",
    "---@field playerNum integer",
    "---@field position Vector3",
    "---@field health number|nil",
    "",
    "---@class PangeaPlayerApi",
    "---@field count fun(): integer",
    "---@field get fun(playerNum: integer): PangeaPlayerSnapshot|nil",
    "",
    "---@class PangeaPersistenceApi",
    "---@field get fun(key: string, version: integer): string|number|boolean|nil Read a version-matched bounded scalar value.",
    "---@field set fun(key: string, version: integer, value: string|number|boolean): boolean Store a bounded scalar value.",
    "---@field delete fun(key: string): boolean Remove a stored value.",
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
