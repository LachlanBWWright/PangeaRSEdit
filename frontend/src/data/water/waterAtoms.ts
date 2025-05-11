import { atom } from "jotai";

export const SelectedWaterBody = atom<number | null>(null);
export const SelectedWaterNub = atom<number | null>(null); // New atom for selected nub index
