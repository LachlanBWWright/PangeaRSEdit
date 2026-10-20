import { AUTHORITATIVE_API_SCHEMA, type ApiFunction } from "./scriptApiSchema";
import { SCRIPTING_CONTRACT, SCRIPT_API_VERSION, SCRIPT_CONTRACT_VERSION } from "./scriptContract";
import { getAvailableApiFunctions } from "./scriptApiAvailability";
import { buildApiSignature, getApiParameterType } from "./scriptCompletionText";
import { buildScriptReferenceTypes, referenceTypeFields } from "./scriptReferenceTypes";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { objectEventContextType } from "./scriptTypeDeclarations";

function functionReference(api: ApiFunction, gameId: string): string {
  const available = getAvailableApiFunctions(gameId, [api]).length > 0;
  const supportedGames = AUTHORITATIVE_API_SCHEMA.games.filter((game) => getAvailableApiFunctions(game.gameId, [api]).length > 0).map((game) => game.gameName);
  const parameters = api.parameters.map((parameter) => `- \`${parameter.name}${parameter.optional ? "?" : ""}: ${getApiParameterType(api, parameter)}\` — ${parameter.description ?? "See the type declaration."}`);
  return [
    `### ${api.name}`, "", "```lua", buildApiSignature(api), "```", "",
    api.description ?? "", "", `Selected game: ${available ? "advertised" : "not advertised"}. Supported games: ${supportedGames.join(", ")}.`, "",
    ...parameters, "", `Returns: \`${api.returnType}\`.`, "",
    ...(api.command ? [`Command phase: \`${api.command.applicationPhase}\`; authority: \`${api.command.authority}\`; capability: \`${api.command.capability}\`.`, "", ...api.command.validation.map((rule) => `- ${rule}`), ""] : []),
  ].join("\n");
}

export function buildFullApiReference(state: ScriptWorkspaceState): string {
  const types = buildScriptReferenceTypes(state);
  return [
    `# Lua API reference for ${state.context.gameLabel}`, "",
    `API version ${SCRIPT_API_VERSION}; contract version ${SCRIPT_CONTRACT_VERSION}.`, "",
    "This reference includes every advertised API entry across games and marks availability for the selected game. Runtime capabilities, actor state and mode can still reject an operation. Read scripting-runtime.md before taking over native controllers or rules.", "",
    "## Reading path", "",
    "1. [Runtime model and lifecycle](scripting-runtime.md)",
    "2. [Working Lua examples](script-examples.md)",
    "3. [Detailed gameplay and presentation semantics](lua-scripting.md)",
    "4. [Game/mode restrictions](script-game-matrix.md)", "",
    "## Functions", "",
    ...AUTHORITATIVE_API_SCHEMA.apis.map((api) => functionReference(api, state.context.gameId)),
    "## Global hooks", "",
    ...AUTHORITATIVE_API_SCHEMA.hooks.flatMap((hook) => [
      `### ${hook.name}`, "", hook.description ?? "", "",
      `Context: \`${hook.contextType}\`. Return: \`${hook.returnType}\`.`, "",
      `Selected game: ${state.context.supportedHooks.some((id) => id === hook.name) ? "advertised" : "not advertised"}.`, "",
    ]),
    "## Custom object methods", "",
    "Methods take (self, ctx). Keep per-instance state in pangea.object.state(self.handle). Context snapshots are read-only.", "",
    ...SCRIPTING_CONTRACT.objectEvents.flatMap((event) => [
      `### ${event.handler}`, "", `Signature: \`${event.handler}(self: ObjectBehaviorSelf, ctx: ${objectEventContextType(event.id)})\`. Returns: nil.`, "",
      `Event: \`${event.id}\`; phase: \`${event.applicationPhase}\`; state: \`${event.statePolicy}\`; cleanup: \`${event.cleanup}\`; invalidates handle: ${event.invalidatesHandle}.`, "",
    ]),
    "## Types for the selected game", "",
    "These fields come from the exported LuaLS declarations. Inherited fields are included; Lua parameter arrays are one-based and player indices are zero-based.", "",
    ...[...types].sort(([left], [right]) => left.localeCompare(right)).flatMap(([name, type]) => [
      `### ${name}`, "", ...(type.parent ? [`Extends \`${type.parent}\`.`, ""] : []),
      "```lua", ...(type.alias ? [type.alias] : referenceTypeFields(types, name)), "```", "",
    ]),
  ].join("\n");
}
