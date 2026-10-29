import { err, ok } from "neverthrow";
import { createNativeActorVariant } from "../../src/editor/subviews/scripts/scriptNativeActorVariants";
import { createObjectDefinition } from "../../src/editor/subviews/scripts/scriptObjectActions";
import { setCustomObjectParameterDefault } from "../../src/editor/subviews/scripts/scriptObjectParameters";
import { updateCustomObjectDefinition, upsertScriptSourceFile, type ScriptWorkspaceState } from "../../src/editor/subviews/scripts/scriptWorkspaceState";

export function customItemMeleeFixture(initial: ScriptWorkspaceState, originalEnemyId: string) {
  let workspace = initial;
  const probes: { id: string; weaponType: number; damage: number; mode: string }[] = [];
  for (const mode of ["unchanged", "zero", "fraction", "equal", "destroy"]) {
    const created = mode === "destroy"
      ? createObjectDefinition(workspace, "Runtime melee destroy", "otto.custom.enemy")
      : createNativeActorVariant(workspace, `Runtime melee ${mode}`, mode === "equal" ? "8" : "9");
    if (created.isErr()) return err(created.error);
    workspace = created.value.state;
    const definition = workspace.customObjects.find((entry) => entry.id === created.value.id);
    if (!definition) return err("Melee definition missing");
    if (mode === "destroy") {
      const original = workspace.customObjects.find((entry) => entry.id === originalEnemyId);
      if (!original) return err("Original enemy missing");
      workspace = updateCustomObjectDefinition(workspace, { ...definition, visual: original.visual, collision: original.collision });
    } else {
      const override = setCustomObjectParameterDefault(workspace, definition.id, "overrideHealth", true);
      if (override.isErr()) return err(override.error);
      workspace = override.value;
    }
    const health = setCustomObjectParameterDefault(workspace, definition.id, "health", 3);
    if (health.isErr()) return err(health.error);
    workspace = health.value;
    const source = workspace.sourceFiles[definition.sourceFilePath];
    if (!source) return err("Melee source missing");
    const table = mode === "destroy" ? "object" : definition.exportName;
    const callback = `local originalSpawn = ${table}.onSpawn
function ${table}.onSpawn(self, ctx)
  originalSpawn(self, ctx)
  pangea.object.state(self.handle).acceptanceMelee = ${JSON.stringify(mode)}
end

return {`;
    workspace = upsertScriptSourceFile(workspace, source.path, source.content.replace("return {", callback));
    for (const weaponType of [5, 6]) probes.push({ id: definition.id, mode, weaponType,
      damage: mode === "destroy" ? -1 : mode === "zero" ? 0 : mode === "fraction" ? 0.125 : mode === "equal" ? 0.2 : weaponType === 5 ? 0.2 : -1 });
  }
  workspace = upsertScriptSourceFile(workspace, "Data/Scripts/src/acceptance-melee.lua", `local pangea = require("pangea")
local entry = {}
function entry.onWeaponHit(ctx)
  if not ctx.target then return end
  local mode = pangea.object.state(ctx.target).acceptanceMelee
  if mode == "zero" then return { applyDamage = true, damage = 0 } end
  if mode == "fraction" then return { applyDamage = true, damage = 0.125 } end
  if mode == "equal" then return { applyDamage = true, damage = 0.2 } end
  if mode == "unchanged" then return { applyDamage = true } end
  if mode == "destroy" then return { destroyTarget = true } end
end
return entry
`);
  return ok({ workspace, probes });
}
