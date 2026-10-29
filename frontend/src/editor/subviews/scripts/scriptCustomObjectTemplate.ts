import { customObjectSelfType } from "./scriptObjectParameterDeclarations";

export const CUSTOM_OBJECT_EXPORT_PLACEHOLDER = "__PANGEA_CUSTOM_OBJECT_EXPORT__";

export function buildCustomObjectSourceTemplate(label: string): string {
  return [
    `-- ${label}`,
    'local pangea = require("pangea")',
    "local object = {}",
    "",
    "---@param self ObjectBehaviorSelf",
    "---@param ctx ObjectFrameContext",
    "function object.onSpawn(self, ctx)",
    `  pangea.log.info(${JSON.stringify(`${label}: spawned`)})`,
    "end",
    "",
    "---@param self ObjectBehaviorSelf",
    "---@param ctx ObjectFrameContext",
    "function object.onUpdate(self, ctx)",
    "",
    "end",
    "",
    `return { ${CUSTOM_OBJECT_EXPORT_PLACEHOLDER} = object }`,
    "",
  ].join("\n");
}

export function materializeCustomObjectSourceTemplate(
  template: string,
  exportName: string,
): string {
  return template.replaceAll(CUSTOM_OBJECT_EXPORT_PLACEHOLDER, exportName).replaceAll("---@param self ObjectBehaviorSelf", `---@param self ${customObjectSelfType({ exportName })}`);
}
