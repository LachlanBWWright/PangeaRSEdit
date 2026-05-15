import { atom } from "jotai";

/** Available canvas presentation modes. */
export enum CanvasView {
  TWO_D,
  THREE_D,
}

/** Currently selected canvas view mode. */
export const CanvasViewMode = atom<CanvasView>(CanvasView.TWO_D);

// 3D View layer visibility toggles
/** Controls whether 3D spline geometry is visible. */
export const Show3DSplines = atom<boolean>(true);
/** Controls whether 3D item geometry is visible. */
export const Show3DItems = atom<boolean>(true);
/** Controls whether 3D fence geometry is visible. */
export const Show3DFences = atom<boolean>(true);
/** Controls whether 3D liquid geometry is visible. */
export const Show3DLiquid = atom<boolean>(true);

// 3D item model visualization toggle
/** Controls whether 3D item models are visible in the canvas. */
export const Show3DItemModels = atom<boolean>(true);

// Incrementing trigger to request the current 3D scene be exported/downloaded as a GLB
// Components should increment this atom to request an export; the Three scene listens for
// changes and performs the export when it sees a new value.
/** Increment to request exporting the current 3D scene as a GLB. */
export const Export3DScene = atom<number>(0);
