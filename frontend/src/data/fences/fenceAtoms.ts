import { atom } from "jotai";

/** Currently selected fence index, or undefined when nothing is selected. */
export const SelectedFence = atom<number | undefined>(undefined);
/** Index of the currently-selected nub within the selected fence (null = none). */
export const SelectedFenceNub = atom<number | null>(null);
