import type { MapItemPoint } from "./mapItemCoordinates";

export type MapItemArrangement = "alignX" | "alignZ" | "distributeX" | "distributeZ";
export function arrangeMapItemPoints(points: readonly MapItemPoint[], action: MapItemArrangement): readonly MapItemPoint[] {
  if (points.length < 2) return points;
  const axis = action === "alignX" || action === "distributeX" ? "x" : "z";
  if (action === "alignX" || action === "alignZ") {
    const center = Math.round(points.reduce((sum, point) => sum + point[axis], 0) / points.length);
    return points.map(point => ({...point, [axis]: center}));
  }
  const ordered = points.map((point, index) => ({point, index})).sort((a, b) => a.point[axis] - b.point[axis]);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last) return points;
  const step = (last.point[axis] - first.point[axis]) / (points.length - 1);
  const positions = new Map(ordered.map((entry, order) => [entry.index, Math.round(first.point[axis] + order * step)]));
  return points.map((point, index) => ({...point, [axis]: positions.get(index) ?? point[axis]}));
}
