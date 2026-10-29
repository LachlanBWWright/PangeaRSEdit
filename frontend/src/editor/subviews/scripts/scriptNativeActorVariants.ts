import { err, ok, type Result } from "neverthrow";
import { AUTHORITATIVE_API_SCHEMA, type NativeSpawn } from "./scriptApiSchema";
import { createObjectDefinition } from "./scriptObjectActions";
import { updateCustomObjectDefinition, upsertScriptSourceFile, type ScriptWorkspaceContext, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { customObjectSelfType } from "./scriptObjectParameterDeclarations";

const ottoActorTypes = new Set([3, 7, 8, 9, 10, 30, 38, 49, 50, 51, 52, 59, 60, 78, 81, 89, 92, 93, 94, 95].map(String));

export function nativeActorChoices(context: Pick<ScriptWorkspaceContext, "gameId">): readonly NativeSpawn[] {
  if (context.gameId !== "OttoMatic-Android") return [];
  const game = AUTHORITATIVE_API_SCHEMA.games.find((entry) => entry.gameId === context.gameId);
  return game?.nativeSpawns.filter((entry) => ottoActorTypes.has(entry.id)) ?? [];
}

function nativeActorSource(exportName: string): string {
  return [
    'local pangea = require("pangea")',
    `local ${exportName} = {}`,
    "",
    `---@param self ${customObjectSelfType({ exportName })}`,
    "---@param ctx ObjectFrameContext",
    `function ${exportName}.onSpawn(self, ctx)`,
    "  if self.parameters.overrideHealth then",
    "    local result = pangea.object.setHealthResult(self.handle, self.parameters.health)",
    "    if not result.ok then pangea.log.warn(result.message) end",
    "  end",
    "  if self.parameters.overrideDamage then",
    "    local result = pangea.object.setDamageResult(self.handle, self.parameters.damage)",
    "    if not result.ok then pangea.log.warn(result.message) end",
    "  end",
    "end",
    "",
    `return { ${exportName} = ${exportName} }`,
    "",
  ].join("\n");
}

export function createNativeActorVariant(state: ScriptWorkspaceState, label: string, spawnId: string): Result<{ state: ScriptWorkspaceState; id: string }, string> {
  const native = nativeActorChoices(state.context).find((entry) => entry.id === spawnId);
  if (!native) return err("Choose a supported native enemy for this game.");
  const created = createObjectDefinition(state, label, "blank");
  if (created.isErr()) return err(created.error);
  const definition = created.value.state.customObjects.find((entry) => entry.id === created.value.id);
  if (!definition) return err("The enemy definition could not be created.");
  const next = updateCustomObjectDefinition(created.value.state, {
    ...definition,
    description: `A variant of ${native.label}, preserving its native movement and combat.`,
    controllerOwnership: "native",
    visual: { kind: "nativeActor", spawnId, scale: 1 },
    collision: { kind: "none" },
    parameterDefinitions: [
      { id: "overrideHealth", label: "Override health", kind: "boolean", defaultValue: false },
      { id: "health", label: "Health", kind: "number", defaultValue: 1, min: 0, step: 0.1 },
      { id: "overrideDamage", label: "Override contact damage", kind: "boolean", defaultValue: false },
      { id: "damage", label: "Contact damage", kind: "number", defaultValue: 0.1, min: 0, step: 0.05 },
    ],
  });
  return ok({ id: definition.id, state: upsertScriptSourceFile(next, definition.sourceFilePath, nativeActorSource(definition.exportName)) });
}
