import type { ApiFunction } from "./scriptApiSchema";

const player = { name: "playerNum", type: "number" } satisfies ApiFunction["parameters"][number];
const target = { name: "target", type: "objectHandle" } satisfies ApiFunction["parameters"][number];
const options = { name: "options", type: "table", optional: true } satisfies ApiFunction["parameters"][number];

function operation(method: string, description: string, parameters: ApiFunction["parameters"]): ApiFunction {
  return {
    name: `pangea.player.${method}`,
    description,
    parameters: [player, ...parameters],
    returnType: "GameplayOperationResult",
    command: {
      capability: `player-${method}`,
      authority: "disabled-network",
      applicationPhase: "callback",
      validation: ["integer player index", "advertised native action", "live target and valid operation options"],
    },
  };
}

export const PLAYER_OPERATION_APIS: ApiFunction[] = [
  { name: "pangea.player.actions", description: "Lists native player operation names supported by this game's adapter; an advertised action can still reject an incompatible actor or gameplay state.", parameters: [], returnType: "string[]" },
  { name: "pangea.player.relations", description: "Reads live native carrying, mounting, buddy and grabbing relationships, form and capture count; invalid players return nil.", parameters: [player], returnType: "PlayerRelations|nil" },
  operation("carry", "Establishes a native carrying relationship with a compatible live target.", [target]),
  operation("drop", "Releases the native carried object using supported position and velocity options.", [options]),
  operation("handover", "Hands a carried object to a compatible native recipient.", [target]),
  operation("mount", "Enters a compatible native ride or vehicle using supported operation options.", [target, options]),
  operation("dismount", "Leaves the player's native ride or vehicle with native relationship cleanup.", []),
  operation("fire", "Requests native weapon firing using supported aim, weapon and mode options.", [options]),
  operation("reload", "Requests native weapon reload where the adapter supports it.", []),
  operation("transform", "Requests a supported native player form transition with relationship cleanup.", [{ name: "form", type: "string" }, options]),
  operation("respawn", "Requests native player respawn using supported position options or the game's native checkpoint rules.", [options]),
  operation("capture", "Captures a compatible native target using the game's ownership rules.", [target]),
  operation("deliver", "Delivers the carried or captured object to an optional compatible native destination.", [{ ...target, optional: true }]),
  operation("resetCarried", "Resets the native carried object and its ownership relationship.", []),
  operation("releaseBuddy", "Releases the player's native buddy relationship.", []),
  operation("grab", "Establishes a native grabbing relationship with a compatible live target.", [target, options]),
  operation("interact", "Invokes a supported native interaction with a compatible live target.", [target, options]),
  operation("commandBuddy", "Commands the player's native buddy using a supported mode and optional live target.", [{ name: "mode", type: "string" }, { ...target, optional: true }]),
];

export const PLAYER_OPERATION_DECLARATIONS: readonly string[] = [
  "---@class GameplayOperationResult : CommandResult",
  "---@field object ObjectHandle|nil Live object affected or created by the operation, when available.",
  "---@class PlayerOperationOptions",
  "---@field position Vector3|nil",
  "---@field velocity Vector3|nil",
  "---@field aim Vector3|nil",
  "---@field weapon integer|nil",
  "---@field joint integer|nil",
  "---@field mode string|nil",
  "---@field target ObjectHandle|nil",
  "---@class PlayerRelations",
  "---@field carried ObjectHandle|nil",
  "---@field mounted ObjectHandle|nil",
  "---@field buddy ObjectHandle|nil",
  "---@field grabbed ObjectHandle|nil",
  "---@field form string",
  "---@field capturedCount integer",
];
