import { atom } from "jotai";

export type BugdomVertexColorDisplayMode =
  | "none"
  | "in-game"
  | "half"
  | "colors-only";

export const bugdomVertexColorDisplayModeAtom =
  atom<BugdomVertexColorDisplayMode>("half");
export const editBugdomVertexColorsAtom = atom(false);
export const bugdomVertexColorBrushAtom = atom("#ffffff");
export const bugdomVertexColorBrushRadiusAtom = atom(1);
