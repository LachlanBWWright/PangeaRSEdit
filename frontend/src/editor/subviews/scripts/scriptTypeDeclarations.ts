import { strToU8 } from "fflate";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { AUTHORITATIVE_API_SCHEMA, Field } from "./scriptApiSchema";

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
  };
  const luaType = typeMap[field.type] ?? "any";
  return `---@field ${field.name} ${luaType}${optionalSuffix}`;
}

function buildContextFields(gameId: string): readonly string[] {
  const commonFields = [
    "---@field gameId string",
    "---@field gameName string",
    "---@field levelNum number",
    "---@field levelName string|nil",
  ];
  const game = AUTHORITATIVE_API_SCHEMA.games.find((g) => g.gameId === gameId);
  if (!game) return commonFields;
  return [...commonFields, ...game.contextFields.map(mapFieldToLuaLS)];
}

function buildFrameFields(gameId: string): readonly string[] {
  const commonFields = [
    "---@field frameNum number",
    "---@field deltaSeconds number",
    "---@field levelTimeSeconds number",
  ];
  const game = AUTHORITATIVE_API_SCHEMA.games.find((g) => g.gameId === gameId);
  if (!game) return commonFields;
  return [...commonFields, ...game.contextFields.map(mapFieldToLuaLS)];
}

function buildHookSignatures(state: ScriptWorkspaceState): string {
  return state.context.supportedHooks
    .map((hookId) => {
      const hook = AUTHORITATIVE_API_SCHEMA.hooks.find((h) => h.name === hookId);
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

function buildNativeSpawnIdDeclarations(state: ScriptWorkspaceState): string {
  const game = AUTHORITATIVE_API_SCHEMA.games.find(
    (candidate) => candidate.gameId === state.context.gameId,
  );
  if (game === undefined || game.nativeSpawns.length === 0) {
    return "---@alias NativeSpawnId string";
  }
  return [
    "---@alias NativeSpawnId",
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

function buildRuntimeDeclaration(state: ScriptWorkspaceState): string {
  const gameFields = buildContextFields(state.context.gameId);
  const frameFields = buildFrameFields(state.context.gameId);
  const tagType = buildTagDeclarations(state);
  const objectType = buildObjectTypeDeclarations(state);
  const nativeSpawnIdDeclaration = buildNativeSpawnIdDeclarations(state);

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
    "---@field player ObjectHandle",
    "---@field position Vector3",
    "",
    "---@class WeaponHitContext : LevelContext",
    "---@field playerNum number",
    "---@field weaponId string|nil",
    "---@field weaponType number",
    "---@field damage number",
    "---@field weapon ObjectHandle",
    "---@field target ObjectHandle",
    "---@field position Vector3",
    "---@field targetType number",
    "---@field targetFlags number",
    "",
    "---@class TriggerContext : LevelContext",
    "---@field playerNum number",
    "---@field triggerId string|nil",
    "---@field triggerType number",
    "---@field self ObjectHandle",
    "---@field other ObjectHandle",
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
    '---@field mode "local"|"practice"|"network"',
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
    "---@class PangeaLogApi",
    "---@field info fun(message: string)",
    "---@field warn fun(message: string)",
    "---@field error fun(message: string)",
    "",
    "---@class PangeaObjectApi",
    "---@field exists fun(handle: ObjectHandle): boolean",
    "---@field position fun(handle: ObjectHandle): Vector3|nil",
    "---@field setPosition fun(handle: ObjectHandle, position: Vector3): boolean",
    "---@field setVelocity fun(handle: ObjectHandle, velocity: Vector3): boolean",
    "---@field setRotation fun(handle: ObjectHandle, rotation: Vector3): boolean",
    "---@field setScale fun(handle: ObjectHandle, scale: number): boolean",
    "---@field setAnimation fun(handle: ObjectHandle, animation: string, speed: number|nil, blendSeconds: number|nil): boolean",
    `---@field tags fun(handle: ObjectHandle): ${tagType}[]`,
    `---@field hasTag fun(handle: ObjectHandle, tag: ${tagType}): boolean`,
    "---@field state fun(handle: ObjectHandle): table|nil",
    "---@field delete fun(handle: ObjectHandle): boolean",
    "",
    "---@class NativeSpawnOptions",
    "---@field subtype integer|nil Game-specific subtype, such as a powerup kind.",
    "---@field amount integer|nil Game-specific quantity when supported.",
    "",
    "---@class PangeaSpawnApi",
    "---@field native fun(id: NativeSpawnId, position: Vector3, options: NativeSpawnOptions|nil): ObjectHandle|nil",
    "---@field scripted fun(id: string, position: Vector3, options: table|nil): ObjectHandle|nil",
    "",
    "---@class PangeaApi",
    "---@field api table",
    "---@field game table",
    "---@field level table",
    "---@field time table",
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
