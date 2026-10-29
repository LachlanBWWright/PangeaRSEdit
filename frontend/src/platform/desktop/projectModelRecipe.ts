import type { AssetImportRecipe } from "@pangea/desktop-contracts";
import type { AnimationEvent } from "@/components/AnimationViewer/types";

export type MaterialMapping = NonNullable<AssetImportRecipe["materialMappings"]>[number];

export function setMaterialMapping(recipe: AssetImportRecipe, material: string, patch: Partial<Omit<MaterialMapping, "material">>): AssetImportRecipe {
  const mappings = recipe.materialMappings ?? [];
  const previous = mappings.find((entry) => entry.material === material);
  const next = { material, ...previous, ...patch };
  const remaining = mappings.filter((entry) => entry.material !== material);
  const active = next.alwaysBlend !== undefined || next.clampU !== undefined || next.clampV !== undefined || next.diffuseColor !== undefined;
  return { ...recipe, materialMappings: active ? [...remaining, next] : remaining };
}

export function setAssetAnimationEvents(recipe: AssetImportRecipe, clip: string, events: AnimationEvent[] | undefined): AssetImportRecipe {
  const remaining = (recipe.animationEvents ?? []).filter((entry) => entry.clip !== clip);
  return { ...recipe, animationEvents: events ? [...remaining, { clip, events }] : remaining };
}

export function materialColorHex(color: readonly number[]): string {
  return `#${[0, 1, 2].map((index) => Math.round((color[index] ?? 1) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function materialColorChannels(hex: string, alpha: number): [number, number, number, number] {
  return [Number.parseInt(hex.slice(1, 3), 16) / 255, Number.parseInt(hex.slice(3, 5), 16) / 255, Number.parseInt(hex.slice(5, 7), 16) / 255, alpha];
}
