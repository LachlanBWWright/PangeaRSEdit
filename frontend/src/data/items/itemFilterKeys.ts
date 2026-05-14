import { z } from "zod";

export const filterableItemKindSchema = z.enum(["item", "splineItem"]);

export type FilterableItemKind = z.infer<typeof filterableItemKindSchema>;

export interface FilterableItemKeyParts {
  readonly kind: FilterableItemKind;
  readonly type: number;
}

const filterableItemKeySchema = z.object({
  kind: filterableItemKindSchema,
  type: z.number().int().nonnegative(),
});

const serializedFilterableItemKeySchema = z
  .string()
  .regex(/^(item|splineItem):\d+$/)
  .transform((value) => {
    const [kind, type] = value.split(":");
    return filterableItemKeySchema.parse({
      kind,
      type: Number(type),
    });
  });

export type FilterableItemKey = `${FilterableItemKind}:${number}`;

export function toFilterableItemKey(parts: FilterableItemKeyParts): FilterableItemKey {
  return `${parts.kind}:${parts.type}`;
}

export function parseFilterableItemKey(
  value: unknown,
): ReturnType<typeof serializedFilterableItemKeySchema.safeParse> {
  return serializedFilterableItemKeySchema.safeParse(value);
}

export function getFilterableItemKindLabel(kind: FilterableItemKind): string {
  return kind === "item" ? "Item" : "Spline";
}

export function getFilterableItemLabel(parts: FilterableItemKeyParts, name: string): string {
  return `${getFilterableItemKindLabel(parts.kind)}: ${name}`;
}
