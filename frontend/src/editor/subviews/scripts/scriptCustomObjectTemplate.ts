export const CUSTOM_OBJECT_EXPORT_PLACEHOLDER = "__PANGEA_CUSTOM_OBJECT_EXPORT__";

export function buildCustomObjectSourceTemplate(label: string): string {
  return [
    `-- ${label}`,
    "-- Generated script for customObject",
    "---@type CustomObjectBehavior",
    "local object = {}",
    "",
    "function object.onSpawn(self, ctx)",
    `  pangea.log.info(${JSON.stringify(`${label}: spawned`)})`,
    "end",
    "",
    "function object.onUpdate(self, ctx)",
    "  local state = pangea.object.state(self.handle)",
    "  state.elapsed = (state.elapsed or 0) + ctx.deltaSeconds",
    "end",
    "",
    "function object.onTrigger(self, ctx)",
    "  return nil",
    "end",
    "",
    "function object.onPickupCollected(self, ctx)",
    "  return { handled = true, consumePickup = true }",
    "end",
    "",
    "function object.onWeaponHit(self, ctx)",
    "  return nil",
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
