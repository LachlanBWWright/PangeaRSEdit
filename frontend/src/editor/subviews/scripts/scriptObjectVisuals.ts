import { z } from "zod";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { getCustomModelFormat } from "./scriptObjectActions";

export const objectVisualKindSchema = z.enum(["none", "nativeDisplayGroup", "nativeSkeleton", "customDisplayGroup", "customSkeleton"]);

export function changeObjectVisual(definition: ScriptCustomObjectDefinition, value: string, gameId: string): ScriptCustomObjectDefinition {
  const parsed = objectVisualKindSchema.safeParse(value);
  if (!parsed.success) return definition;
  const kind = parsed.data;
  const format = getCustomModelFormat(gameId);
  if (format === "shapes" && (kind === "nativeSkeleton" || kind === "customSkeleton")) return definition;
  if (kind === "none") return { ...definition, visual: { kind } };
  const common = { scale: definition.visual.kind === "none" ? 1 : definition.visual.scale, slot: 450 };
  if (kind === "nativeDisplayGroup") return { ...definition, visual: { ...common, kind, group: "global", modelObject: 0 } };
  if (kind === "customDisplayGroup") return { ...definition, visual: { ...common, kind, modelPath: `Data/Scripts/assets/models/custom.${format}`, modelObject: 0 } };
  if (kind === "nativeSkeleton") return { ...definition, visual: { ...common, kind, skeletonType: 0, initialAnimation: 0, animationSpeed: 1 } };
  return { ...definition, visual: { ...common, kind, modelPath: `Data/Scripts/assets/skeletons/custom.${format}`, skeletonPath: "Data/Scripts/assets/skeletons/custom.skeleton", animations: { idle: 0 }, initialAnimation: "idle", animationSpeed: 1 } };
}
