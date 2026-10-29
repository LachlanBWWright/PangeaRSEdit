import { err, ok } from "neverthrow";
import { projectAssetSchema } from "@pangea/desktop-contracts";
import { applyProjectAsset, projectModelRuntimePaths } from "../../src/platform/desktop/projectModelAssignment";
import { materializeScriptProjectAssets } from "../../src/platform/desktop/projectScriptAssets";
import { OttoGlobals } from "../../src/data/globals/globals";
import { addScriptAsset, buildScriptPackageFilesAsync, buildScriptPackageZipAsync, importScriptPackageZipAsync, createScriptWorkspaceContext, ensureScriptWorkspace, placeCustomObject, updateCustomObjectDefinition, upsertScriptSourceFile } from "../../src/editor/subviews/scripts/scriptWorkspaceState";
import { createObjectDefinition } from "../../src/editor/subviews/scripts/scriptObjectActions";
import { createNativeActorVariant } from "../../src/editor/subviews/scripts/scriptNativeActorVariants";
import { setCustomObjectParameterDefault, setCustomPlacementParameter } from "../../src/editor/subviews/scripts/scriptObjectParameters";
import { placementWorldPosition } from "../../src/editor/subviews/scripts/scriptPlacementCoordinates";
import { customItemMeleeFixture } from "./customItemMeleeFixture";

export async function customItemRuntimeFixture(model: number[], skeleton: number[]) {
  let workspace = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
  const enemy = createObjectDefinition(workspace, "Runtime animated enemy", "otto.custom.enemy");
  if (enemy.isErr()) return err(enemy.error);
  workspace = enemy.value.state;
  const definition = workspace.customObjects.find((item) => item.id === enemy.value.id);
  if (!definition) return err("Runtime enemy definition missing");
  const assetId = "70b9bb86-85aa-4b2b-ae33-c60402a8af50";
  const revision = "bf822ad8-3539-43ba-a9d1-039f6b297772";
  const output = `Assets/Models/${assetId}/${revision}/model`;
  const asset = projectAssetSchema.safeParse({
    version: 1, id: assetId, revision, name: "Runtime enemy model", game: "OttoMatic",
    source: { mode: "managed", path: `AuthoringSources/${assetId}/enemy.glb`, originalName: "enemy.glb", format: "glb", dependencies: [], fingerprint: "acceptance" },
    outputs: { model: `${output}.bg3d`, skeleton: `${output}.skeleton.rsrc`, preview: `${output}.glb`, files: [`${output}.bg3d`, `${output}.skeleton.rsrc`, `${output}.glb`] },
    animations: [{ index: 0, name: "Idle" }, { index: 1, name: "Walk" }], warnings: [],
    recipe: { scale: 1, rotation: [0, 0, 0] }, importedAt: "2026-10-23T00:00:00Z", previousRevision: null,
  });
  if (!asset.success) return err(asset.error.message);
  const paths = projectModelRuntimePaths(asset.data);
  const modelPath = paths.model;
  const skeletonPath = paths.skeleton;
  workspace = addScriptAsset(workspace, modelPath, new Uint8Array(model), "runtime-enemy.bg3d");
  workspace = addScriptAsset(workspace, `${skeletonPath}.rsrc`, new Uint8Array(skeleton), "runtime-enemy.skeleton.rsrc");
  const assigned = applyProjectAsset(definition, asset.data);
  if (assigned.isErr()) return err(assigned.error);
  workspace = updateCustomObjectDefinition(workspace, assigned.value);
  const health = setCustomObjectParameterDefault(workspace, definition.id, "health", 3);
  if (health.isErr()) return err(health.error);
  const variant = createNativeActorVariant(health.value, "Runtime native enemy", "9");
  if (variant.isErr()) return err(variant.error);
  const override = setCustomObjectParameterDefault(variant.value.state, variant.value.id, "overrideHealth", true);
  if (override.isErr()) return err(override.error);
  const variantHealth = setCustomObjectParameterDefault(override.value, variant.value.id, "health", 3);
  if (variantHealth.isErr()) return err(variantHealth.error);
  const nativeDefinition = variantHealth.value.customObjects.find((item) => item.id === variant.value.id);
  if (!nativeDefinition) return err("Native variant definition missing");
  const source = variantHealth.value.sourceFiles[nativeDefinition.sourceFilePath];
  if (!source) return err("Native variant behavior missing");
  const frameCallback = `function ${nativeDefinition.exportName}.onUpdate(self, ctx)
  local state = pangea.object.state(self.handle)
  if not state.acceptanceFrame then
    state.acceptanceFrame = true
    local result = pangea.object.setDamageResult(self.handle, 0.125)
    if not result.ok then pangea.log.warn(result.message) end
    pangea.log.info("acceptance native variant frame")
  end
end

return {`;
  workspace = upsertScriptSourceFile(variantHealth.value, source.path, source.content.replace("return {", frameCallback));
  const platform = createObjectDefinition(workspace, "Runtime moving platform", "otto.custom.platform");
  if (platform.isErr()) return err(platform.error);
  workspace = platform.value.state;
  const platformDefinition = workspace.customObjects.find((item) => item.id === platform.value.id);
  if (!platformDefinition) return err("Platform definition missing");
  workspace = updateCustomObjectDefinition(workspace, { ...platformDefinition, visual: {
    kind: "customDisplayGroup", modelPath, modelObject: 0, scale: 1, slot: 450,
  } });
  const pickups: { id: string; reward: string; amount: number }[] = [];
  for (const reward of ["health", "fuel", "score"]) {
    const pickup = createObjectDefinition(workspace, `Runtime ${reward} pickup`, "otto.custom.pickup");
    if (pickup.isErr()) return err(pickup.error);
    const configured = setCustomObjectParameterDefault(pickup.value.state, pickup.value.id, "reward", reward);
    if (configured.isErr()) return err(configured.error);
    workspace = configured.value;
    pickups.push({ id: pickup.value.id, reward, amount: reward === "score" ? 100 : 0.25 });
  }
  const trigger = createObjectDefinition(workspace, "Runtime trigger", "otto.custom.trigger");
  if (trigger.isErr()) return err(trigger.error);
  const action = setCustomObjectParameterDefault(trigger.value.state, trigger.value.id, "action", "completeLevel");
  if (action.isErr()) return err(action.error);
  workspace = action.value;
  const position = { x: 120, y: 500, z: 180 };
  const world = placementWorldPosition(workspace.context.gameId, position);
  workspace = placeCustomObject(workspace, definition.id, "Authored enemy", position);
  const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
  if (!placement) return err("Authored enemy placement missing");
  const placementHealth = setCustomPlacementParameter(workspace, placement.id, "health", 7);
  if (placementHealth.isErr()) return err(placementHealth.error);
  workspace = placementHealth.value;
  const enemySource = workspace.sourceFiles[definition.sourceFilePath];
  if (!enemySource) return err("Enemy behavior missing");
  const placementCheck = `local originalSpawn = object.onSpawn
function object.onSpawn(self, ctx)
  originalSpawn(self, ctx)
  local position = pangea.object.position(self.handle)
  pangea.log.info("acceptance enemy spawn health=" .. tostring(self.parameters.health))
  if position and position.x == ${world.x} and position.y == ${world.y} and position.z == ${world.z} then
    assert(pangea.object.health(self.handle) == 7, "Authored placement health override was not applied")
    local state = pangea.object.state(self.handle)
    state.acceptanceSpawned = true
    state.acceptanceFrames = 0
    pangea.log.info("acceptance authored placement native health7")
  end
end

local originalUpdate = object.onUpdate
function object.onUpdate(self, ctx)
  originalUpdate(self, ctx)
  if self.parameters.health == 7 then
    local state = pangea.object.state(self.handle)
    assert(state.acceptanceSpawned, "Authored placement object state was reset")
    state.acceptanceFrames = state.acceptanceFrames + 1
    if state.acceptanceFrames % 3 == 0 then
      pangea.log.info("acceptance placement alive " .. self.handle.id .. ":" .. self.handle.generation .. ":" .. state.acceptanceFrames .. ":" .. pangea.object.health(self.handle))
    end
  end
end

return {`;
  workspace = upsertScriptSourceFile(workspace, enemySource.path, enemySource.content.replace("return {", placementCheck));
  const melee = customItemMeleeFixture(workspace, enemy.value.id);
  if (melee.isErr()) return err(melee.error);
  workspace = melee.value.workspace;
  const materialized = materializeScriptProjectAssets(workspace, [asset.data], [
    { path: asset.data.outputs.model, bytes: new Uint8Array(model) },
    { path: asset.data.outputs.skeleton ?? "", bytes: new Uint8Array(skeleton) },
  ]);
  if (materialized.isErr()) return err(materialized.error);
  const archive = await buildScriptPackageZipAsync(materialized.value);
  if (archive.isErr()) return err(archive.error);
  const restored = await importScriptPackageZipAsync(archive.value, workspace.context);
  if (restored.isErr()) return err(restored.error);
  const files = await buildScriptPackageFilesAsync(restored.value);
  if (files.isErr()) return err(files.error);
  return ok({ platformId: platform.value.id, pickups, triggerId: trigger.value.id, melee: melee.value.probes,
    probes: [{ id: enemy.value.id, damage: 0.1 }, { id: variant.value.id, damage: 0.125 }],
    files: files.value.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) })) });
}
