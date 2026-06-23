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
      if (
        hookId === "onCheckpoint" ||
        hookId === "onLapComplete" ||
        hookId === "onPowerupCollected" ||
        hookId === "onRaceFinish"
      ) {
        return `---@field ${hookId} fun(player: RacePlayer, checkpoint: number, ctx: RaceContext): nil`;
      }
      return `---@field ${hook.name} fun(ctx: ${hook.contextType}): ${hook.returnType}`;
    })
    .join("\n");
}

function buildTagDeclarations(state: ScriptWorkspaceState): string {
  const tags = state.context.allowedTags
    .concat(
      state.behaviorCatalog.flatMap((behavior) => behavior.contributedTags),
    )
    .map((tag) => JSON.stringify(tag.id));

  return tags.length > 0 ? tags.join(" | ") : "string";
}

function buildRuntimeDeclaration(state: ScriptWorkspaceState): string {
  const gameFields = buildContextFields(state.context.gameId);
  const frameFields = buildFrameFields(state.context.gameId);
  const tagType = buildTagDeclarations(state);

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
    "---@field objectType string",
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
    "---@class PangeaLogApi",
    "---@field info fun(message: string)",
    "---@field warn fun(message: string)",
    "---@field error fun(message: string)",
    "",
    "---@class PangeaObjectApi",
    "---@field position fun(handle: ObjectHandle): Vector3|nil",
    "---@field setPosition fun(handle: ObjectHandle, position: Vector3): boolean",
    "---@field setVelocity fun(handle: ObjectHandle, velocity: Vector3): boolean",
    "---@field delete fun(handle: ObjectHandle): boolean",
    "",
    "---@class PangeaSpawnApi",
    "---@field native fun(id: string, position: Vector3, options: table|nil): ObjectHandle|nil",
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
    "local pangea = {}",
    "return pangea",
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
