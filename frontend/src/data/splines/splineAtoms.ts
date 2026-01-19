import { atom } from "jotai";
import { SplineType } from "./splineTypeDetection";

export const SelectedSpline = atom<number | undefined>(undefined);
export const SelectedSplineItem = atom<number | undefined>(undefined);
