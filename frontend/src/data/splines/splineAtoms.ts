import { atom } from "jotai";

/** Currently selected spline index, or undefined when nothing is selected. */
export const SelectedSpline = atom<number | undefined>(undefined);
/** Currently selected spline item index, or undefined when nothing is selected. */
export const SelectedSplineItem = atom<number | undefined>(undefined);
/** Index of the currently-selected nub within the selected spline (null = none). */
export const SelectedSplineNub = atom<number | null>(null);
