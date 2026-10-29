import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { fileSchema, projectAssetSchema, type ProjectAsset, type ProjectFile } from "@pangea/desktop-contracts";
import type { ScriptAssetFile, ScriptCustomObjectDefinition, ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceStateTypes";
import { desktopRequest } from "./client";

const runtimeAssetPrefix = "Data/Scripts/assets/project/";

function matchingAsset(workspace: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition,
  assets: readonly ProjectAsset[]): Result<ProjectAsset, string> {
  const asset = assets.find((candidate) => candidate.id === definition.assetId);
  if (!asset) return err(`${definition.label}: its project asset is missing. Restore or assign an asset before building.`);
  const game = workspace.context.gameId.replace(/-android$/i, "").toLowerCase();
  if (asset.game.toLowerCase() !== game) return err(`${definition.label}: its model was built for another game. Import it for ${workspace.context.gameLabel}.`);
  return ok(asset);
}

function materializeDefinition(definition: ScriptCustomObjectDefinition, asset: ProjectAsset): Result<ScriptCustomObjectDefinition, string> {
  const visual = definition.visual;
  if (visual.kind !== "customDisplayGroup" && visual.kind !== "customSkeleton")
    return err(`${definition.label}: choose an imported model appearance before building.`);
  if (visual.kind === "customDisplayGroup") {
    if (asset.outputs.skeleton) return err(`${definition.label}: the model now has a skeleton. Assign the updated asset before building.`);
    return ok(definition);
  }
  if (!asset.outputs.skeleton) return err(`${definition.label}: the imported asset no longer has a skeleton.`);
  const animations: Record<string, number> = {};
  for (const [action, clipName] of Object.entries(definition.assetAnimations ?? {})) {
    const matches = asset.animations.filter((clip) => clip.name === clipName);
    const clip = matches[0];
    if (matches.length !== 1 || !clip)
      return err(`${definition.label}: animation '${action}' needs a unique '${clipName}' clip. Review its animation mapping.`);
    animations[action] = clip.index;
  }
  if (!Object.keys(animations).length) return err(`${definition.label}: map the imported model's animations before building.`);
  if (animations[visual.initialAnimation] === undefined)
    return err(`${definition.label}: choose an initial animation from its mapped clips.`);
  return ok({ ...definition, visual: { ...visual, animations } });
}

export function scriptProjectAssetPaths(workspace: ScriptWorkspaceState, assets: readonly ProjectAsset[]): Result<string[], string> {
  const paths = new Set<string>();
  for (const definition of workspace.customObjects) {
    if (!definition.assetId) continue;
    const asset = matchingAsset(workspace, definition, assets);
    if (asset.isErr()) return err(asset.error);
    paths.add(asset.value.outputs.model);
    if (asset.value.outputs.skeleton) paths.add(asset.value.outputs.skeleton);
  }
  return ok([...paths]);
}

export function materializeScriptProjectAssets(workspace: ScriptWorkspaceState, assets: readonly ProjectAsset[],
  files: readonly ProjectFile[]): Result<ScriptWorkspaceState, string> {
  const nextAssets: Record<string, ScriptAssetFile> = Object.fromEntries(Object.entries(workspace.assets)
    .filter(([relative]) => !relative.startsWith(runtimeAssetPrefix)));
  const definitions: ScriptCustomObjectDefinition[] = [];
  for (const definition of workspace.customObjects) {
    if (!definition.assetId) { definitions.push(definition); continue; }
    const matched = matchingAsset(workspace, definition, assets);
    if (matched.isErr()) return err(matched.error);
    const asset = matched.value;
    const mapped = materializeDefinition(definition, asset);
    if (mapped.isErr()) return err(mapped.error);
    const visual = mapped.value.visual;
    if (visual.kind !== "customDisplayGroup" && visual.kind !== "customSkeleton") return err("Imported asset has no model appearance.");
    const model = files.find((file) => file.path === asset.outputs.model);
    if (!model) return err(`${definition.label}: the generated model is missing. Reimport the asset.`);
    const expectedExtension = asset.outputs.model.toLowerCase().endsWith(".3dmf") ? ".3dmf" : ".bg3d";
    if (!visual.modelPath.startsWith(`${runtimeAssetPrefix}${asset.id}/`) || !visual.modelPath.endsWith(expectedExtension))
      return err(`${definition.label}: the model reference does not match its project asset. Assign the asset again.`);
    nextAssets[visual.modelPath] = { path: visual.modelPath, bytes: model.bytes, sourceName: asset.source.originalName };
    if (visual.kind === "customSkeleton") {
      const skeleton = files.find((file) => file.path === asset.outputs.skeleton);
      if (!skeleton) return err(`${definition.label}: the generated skeleton is missing. Reimport the asset.`);
      const relative = `${visual.skeletonPath}.rsrc`;
      if (!relative.startsWith(`${runtimeAssetPrefix}${asset.id}/`)) return err(`${definition.label}: assign the skeleton asset again.`);
      nextAssets[relative] = { path: relative, bytes: skeleton.bytes, sourceName: asset.source.originalName };
    }
    definitions.push(mapped.value);
  }
  return ok({ ...workspace, customObjects: definitions, assets: nextAssets });
}

export async function resolveDesktopProjectAssets(workspace: ScriptWorkspaceState): Promise<Result<ScriptWorkspaceState, string>> {
  if (!workspace.customObjects.some((definition) => definition.assetId)) return ok(workspace);
  if (!globalThis.window?.pangeaDesktop) return ok(workspace);
  const assets = await desktopRequest({ operation: "assets.list" }, z.array(projectAssetSchema));
  if (assets.isErr()) return err(`Cannot resolve project assets: ${assets.error.message}`);
  const paths = scriptProjectAssetPaths(workspace, assets.value);
  if (paths.isErr()) return err(paths.error);
  const files = await desktopRequest({ operation: "project.read", paths: paths.value }, z.array(fileSchema));
  return files.isErr() ? err(`Cannot read project assets: ${files.error.message}`)
    : materializeScriptProjectAssets(workspace, assets.value, files.value);
}
