import { err, ok } from "neverthrow";
import { OttoGlobals } from "../../src/data/globals/globals";
import { createObjectDefinition } from "../../src/editor/subviews/scripts/scriptObjectActions";
import { setCustomPlacementActivation } from "../../src/editor/subviews/scripts/scriptPlacementActivation";
import { setCustomPlacementParameter } from "../../src/editor/subviews/scripts/scriptObjectParameters";
import { addScriptAsset, buildScriptPackageFilesAsync, buildScriptPackageZipAsync, createScriptWorkspaceContext, ensureScriptWorkspace, importScriptPackageZipAsync,
  placeCustomObject, setScriptSourceExecutionScope, updateCustomObjectDefinition, updateWorkspaceLevel, upsertScriptSourceFile } from "../../src/editor/subviews/scripts/scriptWorkspaceState";
import driver from "./brainPortEncounter.lua?raw";

export async function buildBrainPortEncounter(model: number[]) {
  const context = createScriptWorkspaceContext(OttoGlobals, 0);
  const created = createObjectDefinition(ensureScriptWorkspace({}, context), "Brain Port", "otto.custom.spawner");
  if (created.isErr()) return err(created.error);
  let workspace = created.value.state;
  const definition = workspace.customObjects.find((object) => object.id === created.value.id);
  if (!definition) return err("Spawner definition missing");
  const modelPath = "Data/Scripts/assets/models/brain-port.bg3d";
  workspace = updateCustomObjectDefinition(workspace, { ...definition, visual: {
    kind: "customDisplayGroup", modelPath, modelObject: 5, scale: 3.5, slot: 450,
  } });
  workspace = addScriptAsset(workspace, modelPath, new Uint8Array(model), "level10_brainboss.bg3d");
  workspace = placeCustomObject(workspace, definition.id, "Fast port", {x:340,y:0,z:2150});
  workspace = placeCustomObject(workspace, definition.id, "Slow port", {x:370,y:0,z:2150});
  workspace = updateWorkspaceLevel(workspace, context.levelKey, (level) => ({ ...level,
    customPlacements: level.customPlacements.map((placement, index) => ({ ...placement, id: index === 0 ? "port-fast" : "port-slow" })),
  }));
  for (const id of ["port-fast", "port-slow"]) {
    for (const [key, value] of Object.entries({ spawnInterval: id === "port-fast" ? 0.2 : 0.7, quota: 12, maxAlive: 12,
      checkpointPolicy: id === "port-fast" ? "restart" : "preserve" })) {
      const changed = setCustomPlacementParameter(workspace, id, key, value);
      if (changed.isErr()) return err(changed.error);
      workspace = changed.value;
    }
    const activated = setCustomPlacementActivation(workspace, id, { kind: "near-player", radius: 2500 });
    if (activated.isErr()) return err(activated.error);
    workspace = activated.value;
  }
  const observer = createObjectDefinition(workspace, "Encounter Observer", "blank");
  if (observer.isErr()) return err(observer.error);
  workspace = observer.value.state;
  const driverPath = "Data/Scripts/src/encounter-driver.lua";
  workspace = upsertScriptSourceFile(workspace, driverPath, driver);
  workspace = setScriptSourceExecutionScope(workspace, driverPath, "game");
  const archive = await buildScriptPackageZipAsync(workspace);
  if (archive.isErr()) return err(archive.error);
  const restored = await importScriptPackageZipAsync(archive.value, context);
  if (restored.isErr()) return err(restored.error);
  const files = await buildScriptPackageFilesAsync(restored.value);
  if (files.isErr()) return err(files.error);
  return ok({ files: files.value.map((file) => ({path:file.path,bytes:Array.from(file.bytes)})),
    placements: restored.value.levels[context.levelKey]?.customPlacements ?? [],
  });
}
