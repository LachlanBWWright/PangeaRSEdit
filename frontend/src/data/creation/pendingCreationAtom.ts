import { atom } from "jotai";

export type CreationKind = "fence" | "water" | "spline";

export interface CreationPoint {
  x: number;
  z: number;
}

export interface PendingCreationState {
  kind: CreationKind;
  points: CreationPoint[];
}

/** Active click-to-place creation state for fence/water/spline. */
export const PendingCreation = atom<PendingCreationState | null>(null);
