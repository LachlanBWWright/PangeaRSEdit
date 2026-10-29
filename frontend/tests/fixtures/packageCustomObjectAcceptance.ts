import { err, ok } from "neverthrow";
import {
  OttoGlobals, BugdomGlobals, Bugdom2Globals, CroMagGlobals, BillyFrontierGlobals,
  NanosaurGlobals, Nanosaur2Globals, MightyMikeGlobals, type GlobalsInterface,
} from "../../src/data/globals/globals";
import {
  addScriptAsset, buildScriptPackageFilesAsync, buildScriptPackageZipAsync,
  createScriptWorkspaceContext, ensureScriptWorkspace, importScriptPackageZipAsync,
  placeCustomObject, updateCustomObjectDefinition, upsertScriptSourceFile,
} from "../../src/editor/subviews/scripts/scriptWorkspaceState";
import { createObjectDefinition } from "../../src/editor/subviews/scripts/scriptObjectActions";
import { placementWorldPosition } from "../../src/editor/subviews/scripts/scriptPlacementCoordinates";
import { setCustomPlacementParameter } from "../../src/editor/subviews/scripts/scriptObjectParameters";
import { scriptCustomObjectDefinitionSchema } from "../../src/editor/subviews/scripts/scriptWorkspaceStateTypes";
import type { PackageAcceptanceTarget } from "./packageAcceptanceTargets";
export { packageAcceptanceTargets } from "./packageAcceptanceTargets";

const gameGlobals: Readonly<Record<string, GlobalsInterface>> = {
  "Otto Matic": OttoGlobals, Bugdom: BugdomGlobals, "Bugdom 2": Bugdom2Globals,
  "Cro-Mag Rally": CroMagGlobals, "Billy Frontier": BillyFrontierGlobals,
  Nanosaur: NanosaurGlobals, "Nanosaur 2": Nanosaur2Globals, "Mighty Mike": MightyMikeGlobals,
};

export async function buildPackageAcceptanceFixture(target: PackageAcceptanceTarget, model: number[], skeleton?: number[]) {
  const globals = gameGlobals[target.name];
  if (!globals) return err("Unknown acceptance game");
  const context = createScriptWorkspaceContext(globals, 0);
  const created = createObjectDefinition(ensureScriptWorkspace({}, context), "Round trip sentinel", "blank");
  if (created.isErr()) return err(created.error);
  let workspace = created.value.state;
  const definition = workspace.customObjects.find((object) => object.id === created.value.id);
  if (!definition) return err("Round trip definition missing");
  const modelPath = `Data/Scripts/assets/${target.format === "shapes" ? "models" : "skeletons"}/sentinel.${target.format}`;
  const skeletonPath = "Data/Scripts/assets/skeletons/sentinel.skeleton";
  const visual = target.format === "shapes"
    ? { kind: "customDisplayGroup", modelPath, modelObject: 0, scale: 1, slot: 450 }
    : { kind: "customSkeleton", modelPath, skeletonPath, initialAnimation: "idle", animations: { idle: 0 }, animationSpeed: 1, scale: 1, slot: 450 };
  const configured = scriptCustomObjectDefinitionSchema.safeParse({ ...definition, visual, parameterDefinitions: [
    { id: "sentinel", label: "Sentinel", kind: "number", defaultValue: 1, min: 0, max: 10, step: 1 },
  ] });
  if (!configured.success) return err(configured.error.message);
  workspace = updateCustomObjectDefinition(workspace, configured.data);
  workspace = addScriptAsset(workspace, modelPath, new Uint8Array(model), `sentinel.${target.format}`);
  if (skeleton) workspace = addScriptAsset(workspace, `${skeletonPath}.rsrc`, new Uint8Array(skeleton), "sentinel.skeleton.rsrc");
  const position = { x: 120, y: 500, z: 180 };
  const world = placementWorldPosition(context.gameId, position);
  workspace = placeCustomObject(workspace, definition.id, "Placed sentinel", position);
  const placement = workspace.levels[context.levelKey]?.customPlacements[0];
  if (!placement) return err("Round trip placement missing");
  const overridden = setCustomPlacementParameter(workspace, placement.id, "sentinel", 7);
  if (overridden.isErr()) return err(overridden.error);
  workspace = upsertScriptSourceFile(overridden.value, definition.sourceFilePath, `local pangea = require("pangea")
local object = {}
function object.onSpawn(self, ctx)
  assert(self.parameters.sentinel == 7, "Placement parameter lost in archive")
  local position = pangea.object.position(self.handle)
  assert(position and math.abs(position.x - ${world.x}) < 0.01 and math.abs(position.y - ${world.y}) < 0.01${target.format === "shapes" ? "" : ` and math.abs(position.z - ${world.z}) < 0.01`}, "Placement native coordinates changed")
  local state = pangea.object.state(self.handle)
  state.frames = 0
  pangea.log.info("package acceptance spawned")
end
function object.onUpdate(self, ctx)
  local state = pangea.object.state(self.handle)
  assert(state.frames ~= nil, "Object state disappeared")
  state.frames = state.frames + 1
  if state.frames == 30 then
    pangea.log.info("package acceptance updated 30")
    assert(pangea.object.delete(self.handle), "Custom object deletion failed")
  end
end
function object.onDestroy(self, ctx)
  pangea.log.info("package acceptance deleted")
end
return { ${definition.exportName} = object }
`);
  const archive = await buildScriptPackageZipAsync(workspace);
  if (archive.isErr()) return err(archive.error);
  const restored = await importScriptPackageZipAsync(archive.value, context);
  if (restored.isErr()) return err(restored.error);
  const files = await buildScriptPackageFilesAsync(restored.value);
  if (files.isErr()) return err(files.error);
  return ok({ workspace, restored: restored.value, archive: archive.value,
    files: files.value.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) })) });
}
