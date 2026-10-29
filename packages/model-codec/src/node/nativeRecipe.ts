import type { Animation, Document } from "@gltf-transform/core";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { BG3DParseResult } from "../modelParsers/parseBG3D.js";

const animationEventSchema = z.object({
  time: z.number().int().min(0).max(32767), type: z.number().int().min(0).max(8), value: z.number().int().min(0).max(255),
});
const recipeSchema = z.object({
  materialMappings: z.array(z.object({ material: z.string().min(1), alwaysBlend: z.boolean().optional(),
    clampU: z.boolean().optional(), clampV: z.boolean().optional(),
    diffuseColor: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
  })).optional(),
  animationEvents: z.array(z.object({ clip: z.string().min(1), events: z.array(animationEventSchema).max(30) })).optional(),
});
export type NativeAssetRecipe = z.infer<typeof recipeSchema>;
export const materialName = (name: string, index: number) => name.trim() || `Material ${index + 1}`;
const animationName = (name: string, index: number) => name.trim() || `Animation ${index + 1}`;

export function readDocumentAnimationEvents(animation: Animation) {
  const extras = animation.getExtras();
  const container = z.object({ events: z.array(animationEventSchema) });
  const namespaced = container.safeParse(extras.pangears);
  if (namespaced.success) return namespaced.data.events;
  const legacy = container.safeParse(extras);
  return legacy.success ? legacy.data.events : [];
}

function matchingIndex(names: string[], name: string): Result<number, string> {
  const matches = names.flatMap((entry, index) => entry === name ? [index] : []);
  const index = matches[0];
  if (matches.length !== 1 || index === undefined) return err(`Import adjustment '${name}' is missing or ambiguous. Restore its source name or update the import settings.`);
  return ok(index);
}

export function applyNativeRecipe(parsed: BG3DParseResult, document: Document, recipe: NativeAssetRecipe,
  target: string): Result<BG3DParseResult, string> {
  const validated = recipeSchema.safeParse(recipe);
  if (!validated.success) return err("Invalid material or animation-event import settings");
  const mappings = validated.data.materialMappings ?? [];
  const clips = validated.data.animationEvents ?? [];
  if (new Set(mappings.map((entry) => entry.material)).size !== mappings.length
    || new Set(clips.map((entry) => entry.clip)).size !== clips.length) return err("Import adjustments must name each material and animation once");
  const materials = parsed.materials.map((entry) => ({ ...entry }));
  const names = document.getRoot().listMaterials().map((entry, index) => materialName(entry.getName(), index));
  for (const mapping of mappings) {
    const index = matchingIndex(names, mapping.material);
    if (index.isErr()) return err(index.error);
    const material = materials[index.value];
    if (!material) return err(`Native material '${mapping.material}' was not generated`);
    if (["bugdom", "nanosaur"].includes(target) && (mapping.clampU !== undefined || mapping.clampV !== undefined || mapping.alwaysBlend !== undefined))
      return err("3DMF cannot preserve BG3D blending or texture wrapping overrides. Adjust color opacity or the authoring material instead.");
    const flags: [boolean | undefined, number][] = [[mapping.alwaysBlend, 2], [mapping.clampU, 4], [mapping.clampV, 8]];
    for (const [enabled, flag] of flags) {
      if (enabled === undefined) continue;
      material.flags = enabled ? material.flags | flag : material.flags & ~flag;
    }
    if (mapping.diffuseColor) material.diffuseColor = mapping.diffuseColor;
  }
  const skeleton = parsed.skeleton;
  if (clips.length > 0 && !skeleton) return err("Animation events require an animated model with a skeleton");
  const animations = skeleton?.animations.map((entry) => ({ ...entry })) ?? [];
  const clipNames = animations.map((entry, index) => animationName(entry.name, index));
  const flagCount = ["bugdom", "nanosaur", "cromag"].includes(target) ? 4 : 5;
  for (const clip of clips) {
    const index = matchingIndex(clipNames, clip.clip);
    if (index.isErr()) return err(index.error);
    const animation = animations[index.value];
    if (!animation) return err(`Animation '${clip.clip}' was not generated`);
    if (clip.events.some((event) => (event.type === 6 || event.type === 7) && event.value >= flagCount))
      return err(`${target} supports animation flags 0 through ${flagCount - 1}`);
    if (["bugdom", "nanosaur", "cromag"].includes(target) && clip.events.some((event) => event.type === 8))
      return err(`${target} does not support pause animation events`);
    animation.events = [...clip.events].sort((left, right) => left.time - right.time);
    animation.numAnimEvents = animation.events.length;
  }
  return ok({ ...parsed, materials, skeleton: skeleton ? { ...skeleton, animations } : undefined });
}
