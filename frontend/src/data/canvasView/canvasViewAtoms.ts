import { atom } from "jotai";

export enum CanvasView {
  TWO_D,
  THREE_D,
}

export const CanvasViewMode = atom<CanvasView>(CanvasView.TWO_D);

// 3D View layer visibility toggles
export const Show3DSplines = atom<boolean>(true);
export const Show3DItems = atom<boolean>(true);
export const Show3DFences = atom<boolean>(true);
export const Show3DLiquid = atom<boolean>(true);

// 3D item model visualization toggle (off by default)
export const Show3DItemModels = atom<boolean>(false);
