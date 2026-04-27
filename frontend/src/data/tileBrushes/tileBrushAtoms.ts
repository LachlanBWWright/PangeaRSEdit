import { atom } from "jotai";
import type { TileBrush, TileBrushAnchor, TileBrushMode } from "./tileBrushTypes";

export const tileBrushesAtom = atom<TileBrush[]>([]);
export const selectedTileBrushIdAtom = atom<string | null>(null);
export const tileBrushModeAtom = atom<TileBrushMode>("select");
export const tileBrushAnchorAtom = atom<TileBrushAnchor>("topLeft");
export const tileBrushPreviewAtom = atom<{ x: number; y: number } | null>(null);
export const tileBrushActiveLayerAtom = atom<1000 | 1001>(1000);
