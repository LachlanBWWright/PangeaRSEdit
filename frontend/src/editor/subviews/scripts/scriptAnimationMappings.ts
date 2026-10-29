import { err, ok, type Result } from "neverthrow";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { objectAnimationActionsSchema } from "./scriptAnimationLimits";

export interface ObjectAnimationClip {
  name: string;
  index: number;
  duration?: number;
}

export interface AnimationMappingIssue {
  action: string;
  clip: string;
  reason: "missing" | "ambiguous" | "unknownPreviousClip";
}

export const suggestedAnimationActions = ["idle", "walk", "attack", "hurt", "death"];

export function animationClipLabel(clip: ObjectAnimationClip): string {
  const name = clip.name.trim() || `Unnamed clip ${clip.index + 1}`;
  return clip.duration === undefined ? name : `${name} (${clip.duration.toFixed(2)} s)`;
}

export function animationClipIndex(value: string, clips: readonly ObjectAnimationClip[]): number | undefined {
  if (!value.trim()) return undefined;
  const index = Number(value);
  return clips.some((clip) => clip.index === index) ? index : undefined;
}

export function createObjectAnimationBindings(
  mappings: Readonly<Record<string, number>>,
  clips: readonly ObjectAnimationClip[],
): Record<string, string> {
  return Object.fromEntries(Object.entries(mappings).flatMap(([action, index]) => {
    const clip = clips.find((candidate) => candidate.index === index);
    return clip?.name.trim() && clips.filter((candidate) => candidate.name === clip.name).length === 1 ? [[action, clip.name]] : [];
  }));
}

export function setObjectAnimationBinding(
  definition: ScriptCustomObjectDefinition,
  action: string,
  index: number,
  clips: readonly ObjectAnimationClip[],
): ScriptCustomObjectDefinition {
  const visual = definition.visual;
  if (visual.kind !== "customSkeleton") return definition;
  const clip = clips.find((candidate) => candidate.index === index);
  if (clips.length > 0 && !clip) return definition;
  const animations = { ...visual.animations, [action]: index };
  if (!objectAnimationActionsSchema.safeParse(animations).success) return definition;
  if (!definition.assetId || !clip?.name.trim()) return { ...definition, visual: { ...visual, animations } };
  return {
    ...definition,
    visual: { ...visual, animations },
    assetAnimations: {
      ...createObjectAnimationBindings(visual.animations, clips),
      ...definition.assetAnimations,
      [action]: clip.name,
    },
  };
}

export function removeObjectAnimationBinding(definition: ScriptCustomObjectDefinition, action: string): ScriptCustomObjectDefinition {
  const visual = definition.visual;
  if (visual.kind !== "customSkeleton" || visual.initialAnimation === action) return definition;
  return {
    ...definition,
    visual: { ...visual, animations: Object.fromEntries(Object.entries(visual.animations).filter(([key]) => key !== action)) },
    assetAnimations: definition.assetAnimations ? Object.fromEntries(Object.entries(definition.assetAnimations).filter(([key]) => key !== action)) : undefined,
  };
}

export function reconcileAnimationMappings(
  mappings: Readonly<Record<string, number>>,
  previous: readonly ObjectAnimationClip[],
  next: readonly ObjectAnimationClip[],
): Result<Record<string, number>, AnimationMappingIssue[]> {
  const updated: Record<string, number> = {};
  const issues: AnimationMappingIssue[] = [];
  for (const [action, index] of Object.entries(mappings)) {
    const previousClips = previous.filter((clip) => clip.index === index);
    const oldClip = previousClips[0];
    if (previousClips.length !== 1 || !oldClip) {
      issues.push({ action, clip: String(index), reason: "unknownPreviousClip" });
      continue;
    }
    if (!oldClip.name.trim() || previous.filter((clip) => clip.name === oldClip.name).length !== 1) {
      issues.push({ action, clip: oldClip.name, reason: "ambiguous" });
      continue;
    }
    const matches = next.filter((clip) => clip.name === oldClip.name);
    const match = matches[0];
    if (matches.length !== 1 || !match) {
      issues.push({ action, clip: oldClip.name, reason: matches.length === 0 ? "missing" : "ambiguous" });
      continue;
    }
    updated[action] = match.index;
  }
  return issues.length > 0 ? err(issues) : ok(updated);
}
