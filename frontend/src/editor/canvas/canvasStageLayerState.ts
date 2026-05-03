import { CanvasViewMode } from "@/editor/canvas/CanvasStageLayers";

/** Returns true when the 2D/3D supertiles surface should be rendered. */
export function shouldRenderSupertiles(
  hasStgd: boolean,
  hasLayr: boolean,
): boolean {
  return hasStgd || hasLayr;
}

/** Returns true when the accessibility overlay should be visible. */
export function shouldRenderAccessibilityOverlay(
  view: CanvasViewMode,
): boolean {
  return view !== CanvasViewMode.tiles;
}

/** Returns true when the tile editor should be visible. */
export function shouldRenderTileEditor(view: CanvasViewMode): boolean {
  return view === CanvasViewMode.tiles;
}

/** Returns true when world layers should be shown in supertiles mode. */
export function shouldRenderWorldLayersInSupertilesView(
  view: CanvasViewMode,
): boolean {
  return view === CanvasViewMode.tiles || view === CanvasViewMode.supertiles;
}

/** Returns true when fence layers are relevant for the current canvas view. */
export function shouldRenderFences(view: CanvasViewMode): boolean {
  return (
    view === CanvasViewMode.fences ||
    view === CanvasViewMode.water ||
    view === CanvasViewMode.splines ||
    view === CanvasViewMode.items ||
    view === CanvasViewMode.supertiles ||
    view === CanvasViewMode.tiles
  );
}

/** Returns true when water layers are relevant for the current canvas view. */
export function shouldRenderWater(view: CanvasViewMode): boolean {
  return (
    view === CanvasViewMode.water ||
    view === CanvasViewMode.fences ||
    view === CanvasViewMode.splines ||
    view === CanvasViewMode.items ||
    view === CanvasViewMode.supertiles ||
    view === CanvasViewMode.tiles
  );
}

/** Returns true when item layers are relevant for the current canvas view. */
export function shouldRenderItems(view: CanvasViewMode): boolean {
  return (
    view === CanvasViewMode.items ||
    view === CanvasViewMode.fences ||
    view === CanvasViewMode.water ||
    view === CanvasViewMode.splines ||
    view === CanvasViewMode.supertiles ||
    view === CanvasViewMode.tiles
  );
}

/** Returns true when spline layers are relevant for the current canvas view. */
export function shouldRenderSplines(view: CanvasViewMode): boolean {
  return (
    view === CanvasViewMode.splines ||
    view === CanvasViewMode.fences ||
    view === CanvasViewMode.water ||
    view === CanvasViewMode.items ||
    view === CanvasViewMode.supertiles ||
    view === CanvasViewMode.tiles
  );
}
