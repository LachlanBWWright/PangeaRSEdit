import { getScriptParameterDefaults } from "./scriptParameters";
import type { ScriptCustomObjectDefinition, ScriptCustomObjectPlacement, ScriptParameterValues, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

function luaString(value: string): string {
  const escaped = Array.from(value, escapeLuaCharacter).join("");
  return `"${escaped}"`;
}
function escapeLuaCharacter(character: string): string {
  if (character === "\\") return "\\\\";
  if (character === '"') return '\\"';
  const code = character.charCodeAt(0);
  return code < 32 || code === 127 ? `\\${String(code).padStart(3, "0")}` : character;
}
function luaParameters(values: ScriptParameterValues): string {
  return `{ ${Object.entries(values).map(([key, value]) => `[${luaString(key)}] = ${typeof value === "string" ? luaString(value) : String(value)}`).join(", ")} }`;
}
export function resolvedObjectParameters(state: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition, placement?: ScriptCustomObjectPlacement): ScriptParameterValues {
  return { ...getScriptParameterDefaults(state.params), ...definition.parameters, ...placement?.parameters };
}
export function buildObjectParameterHelpers(state: ScriptWorkspaceState): string {
  const definitions = state.customObjects.map((definition) => `  [${JSON.stringify(definition.id)}] = ${luaParameters(resolvedObjectParameters(state, definition))},`);
  return [
    "local __objectParameterDefaults = {", ...definitions, "}",
    "local __objectParameters = {}",
    "local __pendingObjectParameters = nil",
    "local function __objectParameterKey(handle)",
    "  return tostring(handle.id) .. ':' .. tostring(handle.generation)",
    "end",
    "local function __makeObjectSelf(handle, objectType)",
    "  local key = __objectParameterKey(handle)",
    "  local parameters = __objectParameters[key]",
    "  if parameters == nil then",
    "    local pending = __pendingObjectParameters",
    "    local defaults = __objectParameterDefaults[objectType] or {}",
    "    if pending and pending.objectType == objectType and not pending.used then",
    "      defaults = pending.values",
    "      pending.used = true",
    "    end",
    "    parameters = {}",
    "    for name, value in pairs(defaults) do parameters[name] = value end",
    "    __objectParameters[key] = parameters",
    "  end",
    "  return { handle = handle, parameters = parameters }",
    "end",
  ].join("\n");
}
export function buildParameterizedPlacementSpawn(state: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition, placement: ScriptCustomObjectPlacement): readonly string[] {
  return [
    "  do",
    "    local previousParameters = __pendingObjectParameters",
    `    __pendingObjectParameters = { objectType = ${JSON.stringify(definition.id)}, values = ${luaParameters(resolvedObjectParameters(state, definition, placement))} }`,
    `    local placedObject = pangea.spawn.scripted(${JSON.stringify(placement.objectId)}, { x = ${placement.position.x}, y = ${placement.position.y}, z = ${placement.position.z} })`,
    `    if placedObject then __makeObjectSelf(placedObject, ${JSON.stringify(definition.id)}) end`,
    "    __pendingObjectParameters = previousParameters",
    "  end",
  ];
}
