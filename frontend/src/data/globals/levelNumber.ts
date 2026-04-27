import { atom } from "jotai";

/** Tracks the currently selected level number in the editor. */
export const LevelNumber = atom<number | undefined>();
