import { z } from "zod";

export const MAX_OBJECT_ANIMATION_ACTIONS = 16;
export const MAX_OBJECT_ANIMATION_ACTION_BYTES = 63;

export const objectAnimationActionSchema = z.string().min(1).refine(
  (value) => !value.includes("\0") && new TextEncoder().encode(value).length <= MAX_OBJECT_ANIMATION_ACTION_BYTES,
  "Animation action names must contain 1–63 UTF-8 bytes without null characters.",
);

export const objectAnimationActionsSchema = z.record(objectAnimationActionSchema, z.number().int().nonnegative()).refine(
  (value) => Object.keys(value).length <= MAX_OBJECT_ANIMATION_ACTIONS,
  "Objects support at most 16 animation actions. Remove an unused action before adding another.",
);

export function initialAssetAnimationActions(clips: readonly { name: string; index: number }[]): Record<string, number> {
  const used = new Set<string>();
  return Object.fromEntries(clips.slice(0, MAX_OBJECT_ANIMATION_ACTIONS).map((clip) => {
    const meaningful = objectAnimationActionSchema.safeParse(clip.name).success && clip.name.trim().length > 0 && clips.filter((entry) => entry.name === clip.name).length === 1;
    let action = meaningful ? clip.name : `clip${clip.index + 1}`;
    let suffix = 1;
    while (used.has(action)) action = `clip${clip.index + 1}_${suffix++}`;
    used.add(action);
    return [action, clip.index];
  }));
}
