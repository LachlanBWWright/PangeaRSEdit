import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { Game } from "@/data/globals/globals";
import { GENERATED_ITEM_SCREENSHOT_MANIFEST } from "@/data/items/itemScreenshotManifest.generated";

export type ParamSlot = "p0" | "p1" | "p2" | "p3" | "flags";
export type ItemScreenshotKind = "terrainItem" | "splineItem";

const itemScreenshotKeySchema = z.object({
  game: z.nativeEnum(Game),
  kind: z.enum(["terrainItem", "splineItem"]),
  itemType: z.number().int(),
  variantKey: z.string().min(1),
});

const generatedFromSchema = z.object({
  modelFile: z.string().min(1),
  modelIndex: z.number().int(),
  params: z
    .object({
      p0: z.number().int().optional(),
      p1: z.number().int().optional(),
      p2: z.number().int().optional(),
      p3: z.number().int().optional(),
      flags: z.number().int().optional(),
    })
    .optional(),
});

export const itemScreenshotManifestEntrySchema = itemScreenshotKeySchema.extend(
  {
    imageUrl: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    generatedFrom: generatedFromSchema,
    verificationStatus: z.enum(["verified", "approximate"]),
  },
);

const itemScreenshotManifestSchema = z.array(itemScreenshotManifestEntrySchema);

export type ItemScreenshotKey = z.infer<typeof itemScreenshotKeySchema>;
export type ItemScreenshotManifestEntry = z.infer<
  typeof itemScreenshotManifestEntrySchema
>;

interface ItemScreenshotQuery {
  readonly game: Game;
  readonly kind: ItemScreenshotKind;
  readonly itemType: number;
  readonly levelNum?: number;
  readonly params?: Partial<Record<ParamSlot, number>>;
}

let staticManifest: Result<readonly ItemScreenshotManifestEntry[], string> | undefined;
const manifestIndexes = new WeakMap<readonly ItemScreenshotManifestEntry[], ReadonlyMap<string, ItemScreenshotManifestEntry>>();

function screenshotKey(game: Game, kind: ItemScreenshotKind, itemType: number, variant: string): string {
  return `${game}:${kind}:${itemType}:${variant}`;
}

function screenshotIndex(manifest: readonly ItemScreenshotManifestEntry[]): ReadonlyMap<string, ItemScreenshotManifestEntry> {
  const cached = manifestIndexes.get(manifest);
  if (cached) return cached;
  const index = new Map<string, ItemScreenshotManifestEntry>();
  for (const entry of manifest) {
    const key = screenshotKey(entry.game, entry.kind, entry.itemType, entry.variantKey);
    if (!index.has(key)) index.set(key, entry);
  }
  manifestIndexes.set(manifest, index);
  return index;
}

function normalizeVariantParts(
  levelNum: number | undefined,
  params: Partial<Record<ParamSlot, number>> | undefined,
): readonly string[] {
  const parts: string[] = [];
  if (levelNum !== undefined) {
    parts.push(`level=${String(levelNum)}`);
  }

  const orderedSlots: readonly ParamSlot[] = ["p0", "p1", "p2", "p3", "flags"];
  orderedSlots.forEach((slot) => {
    const value = params?.[slot];
    if (value !== undefined && value !== 0) {
      parts.push(`${slot}=${String(value)}`);
    }
  });

  return parts;
}

export function buildItemScreenshotVariantKey(input: {
  readonly levelNum?: number;
  readonly params?: Partial<Record<ParamSlot, number>>;
}): string {
  const parts = normalizeVariantParts(input.levelNum, input.params);
  return parts.length === 0 ? "default" : parts.join(",");
}

export function parseItemScreenshotManifest(
  value: unknown,
): Result<readonly ItemScreenshotManifestEntry[], string> {
  const parsed = itemScreenshotManifestSchema.safeParse(value);
  if (!parsed.success) {
    return err(parsed.error.message);
  }
  return ok(parsed.data);
}

export function getItemScreenshotManifest(): Result<
  readonly ItemScreenshotManifestEntry[],
  string
> {
  staticManifest ??= parseItemScreenshotManifest(GENERATED_ITEM_SCREENSHOT_MANIFEST);
  return staticManifest;
}

export function findBestItemScreenshot(
  manifest: readonly ItemScreenshotManifestEntry[],
  query: ItemScreenshotQuery,
): ItemScreenshotManifestEntry | null {
  const exactVariantKey = buildItemScreenshotVariantKey({
    levelNum: query.levelNum,
    params: query.params,
  });

  const index = screenshotIndex(manifest);
  return index.get(screenshotKey(query.game, query.kind, query.itemType, exactVariantKey))
    ?? index.get(screenshotKey(query.game, query.kind, query.itemType, "default"))
    ?? null;
}
