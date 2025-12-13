import { atom } from "jotai";

/**
 * Game-specific data atoms
 * Stores non-serializable data like DOM elements that shouldn't go through Immer
 */

export const BackgroundImageAtom = atom<HTMLCanvasElement | null>(null);
