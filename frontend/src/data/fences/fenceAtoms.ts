import { atom } from "jotai";

export const SelectedFence = atom<number | undefined>(undefined);
/** Index of the currently-selected nub within the selected fence (null = none). */
export const SelectedFenceNub = atom<number | null>(null);
