import { atom } from "jotai";
import { z } from "zod";

export const ITEM_PALETTE_MIME = "application/x-pangea-map-item";
export const itemPaletteEntrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("native"), type: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("custom"), objectId: z.string().min(1) }),
]);
export type ItemPaletteEntry = z.infer<typeof itemPaletteEntrySchema>;
export const draggedItemPaletteEntryAtom = atom<ItemPaletteEntry | null>(null);
