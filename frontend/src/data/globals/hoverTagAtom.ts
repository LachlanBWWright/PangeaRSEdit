import { atom } from "jotai";
import type { HoverTagInfo } from "@/editor/subviews/shared/nodeVisuals";

/**
 * Shared hover tag state used across all Konva layers.
 * Rendered in a dedicated top-level overlay layer so it always appears above
 * items from every other layer, regardless of z-order.
 */
export const ActiveHoverTag = atom<HoverTagInfo | null>(null);
