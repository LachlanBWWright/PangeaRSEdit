export interface ZoomBounds {
  readonly min: number;
  readonly max: number;
}

export function clampZoom(zoom: number, bounds: ZoomBounds): number {
  return Math.min(bounds.max, Math.max(bounds.min, zoom));
}

export function getWheelZoom(
  currentZoom: number,
  deltaY: number,
  factor: number,
  bounds: ZoomBounds,
): number {
  if (deltaY === 0) return currentZoom;
  const nextZoom =
    deltaY < 0 ? currentZoom * factor : currentZoom / factor;
  return clampZoom(nextZoom, bounds);
}

export function getSteppedZoom(
  currentZoom: number,
  direction: 1 | -1,
  factor: number,
  bounds: ZoomBounds,
): number {
  const nextZoom =
    direction > 0 ? currentZoom * factor : currentZoom / factor;
  return clampZoom(nextZoom, bounds);
}
