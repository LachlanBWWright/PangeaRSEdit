import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";

export function customObjectSelfType(definition: Pick<ScriptCustomObjectDefinition, "exportName">): string {
  return `CustomObject_${definition.exportName.replace(/[^A-Za-z0-9_]/g, "_")}Self`;
}

export function buildObjectParameterDeclarations(definitions: readonly ScriptCustomObjectDefinition[]): readonly string[] {
  return definitions.flatMap((definition) => {
    const selfType = customObjectSelfType(definition);
    const parametersType = `${selfType}Parameters`;
    const fields = (definition.parameterDefinitions ?? []).map((parameter) => {
      const type = parameter.kind === "enum" ? parameter.options.map((option) => JSON.stringify(option.value)).join("|") : parameter.kind;
      return `---@field ${parameter.id} ${type}`;
    });
    return [`---@class ${parametersType}`, ...fields, `---@class ${selfType}: ObjectBehaviorSelf`, `---@field parameters ${parametersType}`, ""];
  });
}
