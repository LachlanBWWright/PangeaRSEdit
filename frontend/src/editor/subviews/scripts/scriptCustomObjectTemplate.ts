export const CUSTOM_OBJECT_EXPORT_PLACEHOLDER = "__PANGEA_CUSTOM_OBJECT_EXPORT__";

export function buildCustomObjectSourceTemplate(label: string): string {
  return [
    `-- ${label}`,
    "-- Generated script for customObject",
    "---@type ScriptModule",
    "local object = {}",
    "",
    "function object.onSpawn(self, ctx)",
    `  pangea.log.info(${JSON.stringify(`${label}: spawned`)})`,
    "end",
    "",
    "function object.onUpdate(self, ctx)",
    `  pangea.log.info(${JSON.stringify(`${label}: updated`)})`,
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
  return template.replaceAll(CUSTOM_OBJECT_EXPORT_PLACEHOLDER, exportName);
}
