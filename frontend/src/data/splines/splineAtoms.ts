import { atom } from "jotai";

export const SelectedSpline = atom<number | undefined>(undefined);
export const SelectedSplineItem = atom<number | undefined>(undefined);
/** Index of the currently-selected nub within the selected spline (null = none). */
export const SelectedSplineNub = atom<number | null>(null);
