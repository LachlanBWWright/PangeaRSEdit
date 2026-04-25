import { CanvasViewMode } from "@/editor/canvas/CanvasStageLayers";

export function shouldRenderSupertiles(
  hasStgd: boolean,
  hasLayr: boolean,
): boolean {
  return hasStgd || hasLayr;
}

export function shouldRenderAccessibilityOverlay(
  view: CanvasViewMode,
): boolean {
  return view !== CanvasViewMode.tiles;
}

export function shouldRenderTileEditor(view: CanvasViewMode): boolean {
  return view === CanvasViewMode.tiles;
}

export function shouldRenderWorldLayersInSupertilesView(
  view: CanvasViewMode,
): boolean {
  return view === CanvasViewMode.tiles || view === CanvasViewMode.supertiles;
}

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
