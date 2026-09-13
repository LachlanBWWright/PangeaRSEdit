import type {
  FenceData,
  ItemData,
  LiquidData,
  SplineData,
} from "@/python/structSpecs/LevelTypes";

interface TerrainEntityOverlayInput {
  width: number;
  height: number;
  itemData: ItemData | null;
  fenceData: FenceData | null;
  splineData: SplineData | null;
  liquidData: LiquidData | null;
}

const MARKER_SIZE = 12;

export function buildTerrainEntityOverlay({
  width,
  height,
  itemData,
  fenceData,
  splineData,
  liquidData,
}: TerrainEntityOverlayInput): HTMLCanvasElement | null {
  if (width <= 0 || height <= 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.lineCap = "round";
  context.lineJoin = "round";

  if (liquidData) {
    context.strokeStyle = "#2563eb";
    context.fillStyle = "#2563eb33";
    context.lineWidth = 3;
    for (const liquid of liquidData.Liqd[1000].obj) {
      const points = liquid.nubs.slice(0, liquid.numNubs).flat();
      if (points.length < 4) continue;
      context.beginPath();
      context.moveTo(points[0] ?? 0, points[1] ?? 0);
      for (let index = 2; index < points.length; index += 2) {
        context.lineTo(points[index] ?? 0, points[index + 1] ?? 0);
      }
      context.closePath();
      context.fill();
      context.stroke();
    }
  }

  if (fenceData) {
    context.strokeStyle = "#db2777";
    context.lineWidth = 3;
    for (let index = 0; index < fenceData.Fenc[1000].obj.length; index++) {
      const nubs = fenceData.FnNb[1000 + index]?.obj;
      if (!nubs || nubs.length < 2) continue;
      context.beginPath();
      context.moveTo(nubs[0]?.[0] ?? 0, nubs[0]?.[1] ?? 0);
      for (const nub of nubs.slice(1)) context.lineTo(nub[0], nub[1]);
      context.stroke();
    }
  }

  if (splineData) {
    context.strokeStyle = "#06b6d4";
    context.lineWidth = 3;
    for (const splinePoints of Object.values(splineData.SpPt)) {
      const points = splinePoints.obj;
      if (points.length < 2) continue;
      context.beginPath();
      context.moveTo(points[0]?.x ?? 0, points[0]?.z ?? 0);
      for (const point of points.slice(1)) context.lineTo(point.x, point.z);
      context.stroke();
    }
  }

  if (itemData) {
    context.fillStyle = "#f59e0b";
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
    for (const item of itemData.Itms[1000].obj) {
      context.fillRect(
        item.x - MARKER_SIZE / 2,
        item.z - MARKER_SIZE / 2,
        MARKER_SIZE,
        MARKER_SIZE,
      );
      context.strokeRect(
        item.x - MARKER_SIZE / 2,
        item.z - MARKER_SIZE / 2,
        MARKER_SIZE,
        MARKER_SIZE,
      );
    }
  }

  return canvas;
}
