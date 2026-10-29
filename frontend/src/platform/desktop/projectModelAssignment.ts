import { err, ok, type Result } from "neverthrow";
import type { ProjectAsset } from "@pangea/desktop-contracts";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { getObjectUsage } from "@/editor/subviews/scripts/scriptObjectActions";
import { initialAssetAnimationActions, objectAnimationActionsSchema } from "@/editor/subviews/scripts/scriptAnimationLimits";

export function projectModelRuntimePaths(asset: ProjectAsset) {
  const extension = asset.outputs.model.toLowerCase().endsWith(".3dmf") ? "3dmf" : "bg3d";
  const stem = `Data/Scripts/assets/project/${asset.id}/model`;
  return { model: `${stem}.${extension}`, skeleton: `${stem}.skeleton` };
}

export function applyProjectAsset(definition: ScriptCustomObjectDefinition, asset: ProjectAsset): Result<ScriptCustomObjectDefinition, string> {
  if (!/\.(bg3d|3dmf)$/i.test(asset.outputs.model)) return err("This asset does not contain a supported native model.");
  const paths = projectModelRuntimePaths(asset);
  const scale = definition.visual.kind === "none" ? 1 : definition.visual.scale;
  const slot = definition.visual.kind === "none" || definition.visual.kind === "nativeActor" ? 450 : definition.visual.slot;
  if (!asset.outputs.skeleton) return ok({ ...definition, assetId: asset.id, assetAnimations: undefined, visual: {
    kind: "customDisplayGroup", modelPath: paths.model, modelObject: 0, scale, slot,
  } });
  const previous = definition.visual.kind === "customSkeleton" ? definition.visual : null;
  const sourceBindings = previous ? definition.assetAnimations ?? {} : {};
  const aliases = Object.fromEntries(Object.entries(sourceBindings).map(([action, name]) => {
    const matches = asset.animations.filter((entry) => entry.name === name);
    return [action, matches.length === 1 ? matches[0]?.index ?? 0 : previous?.animations[action] ?? 0];
  }));
  const animations = Object.keys(aliases).length ? aliases : initialAssetAnimationActions(asset.animations);
  if (!objectAnimationActionsSchema.safeParse(animations).success) return err("Objects support at most 16 animation actions with names up to 63 UTF-8 bytes. Repair the action mappings before assigning this asset.");
  const first = Object.keys(animations)[0] ?? "idle";
  const assetAnimations = { ...Object.fromEntries(Object.entries(animations).flatMap(([action, index]) => {
    const clip = asset.animations.find((entry) => entry.index === index);
    return clip ? [[action, clip.name]] : [];
  })), ...sourceBindings };
  return ok({ ...definition, assetId: asset.id, assetAnimations, visual: {
    kind: "customSkeleton", modelPath: paths.model, skeletonPath: paths.skeleton, scale, slot,
    animations, initialAnimation: previous && animations[previous.initialAnimation] !== undefined ? previous.initialAnimation : first,
    animationSpeed: previous?.animationSpeed ?? 1,
  } });
}

export function projectAssetUsage(workspace: ScriptWorkspaceState, assetId: string) {
  return workspace.customObjects.filter((definition) => definition.assetId === assetId).map((definition) => ({
    id: definition.id, label: definition.label, placements: getObjectUsage(workspace, definition.id).length,
  }));
}
