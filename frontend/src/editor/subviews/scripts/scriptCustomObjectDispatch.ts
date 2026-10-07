import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";

export function buildCustomObjectGameplayDispatch(
  definitions: readonly ScriptCustomObjectDefinition[],
): string {
  const entries = definitions.map(
    (definition, index) =>
      `  [${JSON.stringify(definition.id)}] = type(__customObjectModule${index}) == 'table' and __customObjectModule${index}.${definition.exportName} or nil,`,
  );
  return [
    "local __customObjectBehaviors = {",
    ...entries,
    "}",
    "local function __gameplayModules(ctx, hookName, object)",
    "  local candidates = {}",
    "  local objectType = object and pangea.object.type(object)",
    "  local behavior = objectType and __customObjectBehaviors[objectType]",
    "  local handlerName = hookName == 'onTriggerEnter' and 'onTrigger' or hookName",
    "  local handler = type(behavior) == 'table' and behavior[handlerName] or nil",
    "  if type(handler) == 'function' then",
    "    candidates[1] = { [hookName] = function(context)",
      "      return handler(__makeObjectSelf(object, objectType), context)",
    "    end }",
    "  end",
    "  for _, candidate in ipairs(__modules) do",
    "    candidates[#candidates + 1] = candidate",
    "  end",
    "  return candidates",
    "end",
  ].join("\n");
}
