import { atom } from "jotai";

export enum CanvasView {
  TWO_D,
  THREE_D,
}

export const CanvasViewMode = atom<CanvasView>(CanvasView.TWO_D);
