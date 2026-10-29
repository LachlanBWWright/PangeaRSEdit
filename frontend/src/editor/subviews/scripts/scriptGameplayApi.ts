import type { ApiFunction } from "./scriptApiSchema";
import { PLAYER_OPERATION_APIS, PLAYER_OPERATION_DECLARATIONS } from "./scriptPlayerOperations";

const handle = { name: "handle", type: "objectHandle" } satisfies ApiFunction["parameters"][number];
const player = { name: "playerNum", type: "number" } satisfies ApiFunction["parameters"][number];

function objectMutation(method: string, value: ApiFunction["parameters"][number], validation: string): ApiFunction[] {
  const command = {
    capability: `object-${method}`,
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", validation],
  } satisfies NonNullable<ApiFunction["command"]>;
  return [
    { name: `pangea.object.${method}`, description: `Applies ${method} through the native adapter; false indicates rejection or missing support.`, parameters: [handle, value], returnType: "boolean", command },
    { name: `pangea.object.${method}Result`, description: `Applies ${method} and returns structured diagnostics.`, parameters: [handle, value], returnType: "ObjectCommandResult", command },
  ];
}

function gameplayCommand(capability: string, validation: string[]): NonNullable<ApiFunction["command"]> {
  return { capability, authority: "disabled-network", applicationPhase: "callback", validation };
}

export function gameplayParameterType(namespace: string, method: string, parameter: string): string | undefined {
  if (namespace === "world" && parameter === "bounds") return "WorldBounds";
  if (namespace === "object" && method === "attach" && parameter === "options") return "AttachmentOptions";
  if (namespace === "object" && parameter === "joint") return "integer";
  if (namespace === "player" && method === "setState" && parameter === "value") return "number|boolean";
  if (namespace === "player" && parameter === "options" && ["drop", "mount", "fire", "respawn", "transform", "grab", "interact"].includes(method)) return "PlayerOperationOptions";
  return undefined;
}

export const GAMEPLAY_APIS: ApiFunction[] = [
  ...PLAYER_OPERATION_APIS,
  { name: "pangea.input.get", description: "Reads semantic gameplay input for a player; unavailable input returns nil. Call during the frame before object simulation.", parameters: [{ ...player, optional: true }], returnType: "GameplayInput|nil" },
  { name: "pangea.world.sampleTerrain", description: "Samples native terrain height, normal and optional water height at world x/z without moving an actor.", parameters: [{ name: "x", type: "number" }, { name: "z", type: "number" }], returnType: "TerrainSample|nil" },
  { name: "pangea.world.sampleTile", description: "Samples native tile type, flags and solidity at world x/y; unsupported games return nil.", parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }], returnType: "TileSample|nil" },
  { name: "pangea.world.categories", description: "Lists supported semantic collision category names for this game.", parameters: [], returnType: "string[]" },
  { name: "pangea.world.overlapBox", description: "Returns at most 64 live handles and a structured query status. An empty list with status.ok means no overlap. Invalid, unavailable, incomplete or overflowing queries return nil and a failed status; partial lists are never returned.", parameters: [{ name: "bounds", type: "table" }, { name: "category", type: "string" }], returnType: "ObjectHandle[]|nil, ObjectCommandResult" },
  { name: "pangea.world.raycast", description: "Finds the nearest segment hit against native object boxes and supported terrain or fence triangles. Returns hit or nil plus a structured query status; nil with status.ok means clear space. Invalid, unavailable or incomplete queries return a failed status without a partial hit. Static hits have a surface and no object handle.", parameters: [{ name: "from", type: "vector3" }, { name: "to", type: "vector3" }, { name: "category", type: "string" }, { name: "ignore", type: "objectHandle", optional: true }], returnType: "CollisionHit|nil, ObjectCommandResult" },
  { name: "pangea.world.sweepBox", description: "Sweeps a world box against native object boxes and supported terrain or fence triangles. Returns hit or nil plus a structured query status; nil with status.ok means clear space. Invalid, unavailable or incomplete queries return a failed status without a partial hit. Static contacts have surface, fraction, position and normal.", parameters: [{ name: "bounds", type: "table" }, { name: "delta", type: "vector3" }, { name: "category", type: "string" }, { name: "ignore", type: "objectHandle", optional: true }], returnType: "CollisionHit|nil, ObjectCommandResult" },
  { name: "pangea.player.stateFields", description: "Lists native state fields, value domains, player scope and writable support for this game.", parameters: [], returnType: "GameplayStateField[]" },
  { name: "pangea.player.getState", description: "Reads a named native gameplay state field. Unknown fields and invalid players return nil.", parameters: [player, { name: "key", type: "string" }], returnType: "number|boolean|nil" },
  { name: "pangea.player.setState", description: "Writes a named native gameplay field within its advertised domain and returns structured status.", parameters: [player, { name: "key", type: "string" }, { name: "value", type: "unknown" }], returnType: "CommandResult", command: gameplayCommand("player-state", ["integer player index", "advertised writable field", "matching scalar type and domain"]) },
  { name: "pangea.level.complete", description: "Requests native level or mode completion with a success outcome; unsupported boundaries return failure.", parameters: [player, { name: "success", type: "boolean" }], returnType: "CommandResult", command: gameplayCommand("level-completion", ["integer player index", "boolean success outcome", "adapter completion support"]) },
  { name: "pangea.level.rulesControlled", description: "Checks whether Lua owns the adapter's automatic mode rules, separately from object movement controllers.", parameters: [], returnType: "boolean" },
  { name: "pangea.level.setRulesControlled", description: "Claims or restores automatic mode rule ownership while preserving engine updates and explicit state/completion commands. Ownership resets on level load.", parameters: [{ name: "enabled", type: "boolean" }], returnType: "CommandResult", command: gameplayCommand("level-rule-ownership", ["boolean state"]) },
  { name: "pangea.object.jointPosition", description: "Reads a skeleton joint's world position; invalid joints and nonskeletal actors return nil.", parameters: [handle, { name: "joint", type: "number" }], returnType: "Vector3|nil" },
  { name: "pangea.object.attach", description: "Attaches a child to a live parent origin by default, or a skeleton joint, with a world-space offset. Cycles and chains beyond 64 relationships are rejected.", parameters: [{ name: "child", type: "objectHandle" }, { name: "parent", type: "objectHandle" }, { name: "options", type: "table", optional: true }], returnType: "ObjectCommandResult", command: gameplayCommand("object-attachment", ["generation-checked child and parent", "acyclic relationship", "valid joint and finite offset"]) },
  { name: "pangea.object.detach", description: "Removes an object's script-owned attachment while preserving its current position.", parameters: [handle], returnType: "ObjectCommandResult", command: gameplayCommand("object-detachment", ["generation-checked handle"]) },
  { name: "pangea.object.bounds", description: "Reads a live object's world collision bounds; unavailable native bounds return nil.", parameters: [handle], returnType: "WorldBounds|nil" },
  { name: "pangea.object.moveKinematic", description: "Moves a script-controlled actor through at most three box sliding passes against the selected native object, terrain and fence surfaces. Returns position and contacts without applying native damage, pickup or trigger effects. Invalid or incomplete geometry queries fail.", parameters: [handle, { name: "delta", type: "vector3" }, { name: "category", type: "string" }], returnType: "KinematicResult", command: gameplayCommand("object-kinematic", ["generation-checked script-controlled handle", "finite Vector3 delta", "supported collision category and native bounds"]) },
  { name: "pangea.object.scriptControlled", description: "Checks whether Lua owns an object's movement controller. Native rendering and animation continue.", parameters: [handle], returnType: "boolean" },
  ...objectMutation("setScriptControlled", { name: "enabled", type: "boolean" }, "boolean controller ownership"),
  ...objectMutation("setHealth", { name: "health", type: "number" }, "finite nonnegative health"),
  ...objectMutation("setDamage", { name: "damage", type: "number" }, "finite nonnegative damage"),
];

export const GAMEPLAY_DECLARATIONS: readonly string[] = [
  ...PLAYER_OPERATION_DECLARATIONS,
  "---@class GameplayCapabilities",
  "---@field input boolean",
  "---@field terrain boolean",
  "---@field tile boolean",
  "---@field overlap boolean",
  "---@field states boolean",
  "---@field completion boolean",
  "---@field attachments boolean",
  "---@class WorldBounds",
  "---@field min Vector3",
  "---@field max Vector3",
  "---@class CollisionHit",
  "---@field object ObjectHandle|nil",
  '---@field surface "object"|"terrain"|"fence"',
  "---@field fraction number",
  "---@field position Vector3",
  "---@field normal Vector3",
  "---@class KinematicResult : CommandResult",
  "---@field position Vector3|nil",
  "---@field contacts CollisionHit[]",
  "---@class GameplayStateField",
  "---@field key string",
  '---@field type "number"|"boolean"',
  "---@field writable boolean",
  "---@field min number",
  "---@field max number",
  "---@field playerScoped boolean",
  "---@class AttachmentOptions",
  "---@field joint integer|nil Defaults to -1 (parent origin).",
  "---@field offset Vector3|nil Defaults to zero.",
  "---@class CommandResult",
  "---@field ok boolean",
  "---@field code integer",
  "---@field reason string",
  "---@field message string",
  "---@class GameplayAction",
  "---@field held boolean",
  "---@field pressed boolean",
  "---@field released boolean",
  "---@class GameplayInput",
  "---@field moveX number",
  "---@field moveY number",
  "---@field lookX number",
  "---@field lookY number",
  "---@field aim Vector3|nil",
  "---@field actions table<string, GameplayAction> Action names are game-specific.",
  "---@class TerrainSample",
  "---@field height number",
  "---@field normal Vector3",
  "---@field surfaceType integer",
  "---@field waterHeight number|nil",
  "---@class TileSample",
  "---@field tileType integer",
  "---@field flags integer",
  "---@field solid boolean",
];
