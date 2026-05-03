import { atom } from "jotai";

/** Currently selected water body index, or null when nothing is selected. */
export const SelectedWaterBody = atom<number | null>(null);
/** Currently selected water control nub index, or null when nothing is selected. */
export const SelectedWaterNub = atom<number | null>(null);
