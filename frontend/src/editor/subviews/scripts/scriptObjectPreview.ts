import type { Game } from "@/data/globals/globals";
import { customThumbnailSource } from "../items/customItemThumbnailSource";
import { catalogObjectLabel, selectedCatalogModel } from "./scriptGameModelCatalog";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";

export function objectPreviewSelection(game: Game, workspace: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition,
  metadata?: Readonly<Record<string, string>>) {
  const source = customThumbnailSource(game, workspace.context.levelNumber ?? 0, definition, metadata);
  return { modelPath: source?.modelPath ?? "", skeletonPath: source?.skeletonPath ?? "", modelObject: source?.modelObject ?? 0 };
}

export function objectPlayback(definition: ScriptCustomObjectDefinition) {
  const visual = definition.visual;
  if (visual.kind === "nativeSkeleton") return { initialClip: visual.initialAnimation, speed: visual.animationSpeed };
  if (visual.kind === "customSkeleton") return { initialClip: visual.animations[visual.initialAnimation] ?? 0, speed: visual.animationSpeed };
  return { initialClip: 0, speed: 1 };
}

export function objectAppearanceName(game: Game, workspace: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition,
  metadata?: Readonly<Record<string, string>>): string {
  const model = selectedCatalogModel(game, workspace.context.levelNumber, definition, metadata);
  const visual = definition.visual;
  if (model) {
    const index = visual.kind === "nativeDisplayGroup" || visual.kind === "customDisplayGroup" ? visual.modelObject : 0;
    return model.skeletonFile ? model.name : `${model.name} / ${catalogObjectLabel(game, model, index)}`;
  }
  if (visual.kind === "none") return "Invisible / logic only";
  if (visual.kind === "nativeActor") return `Native actor ${visual.spawnId}`;
  if (visual.kind === "customDisplayGroup" || visual.kind === "customSkeleton") return visual.modelPath.split("/").at(-1) ?? "Custom model";
  return visual.kind === "nativeSkeleton" ? `Skeleton ${visual.skeletonType}` : `${visual.group === "global" ? "Global" : "Level"} object ${visual.modelObject + 1}`;
}
