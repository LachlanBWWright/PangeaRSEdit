const BRUSH_SURFACE_OFFSET = 0.08;
const BRUSH_INNER_OFFSET = BRUSH_SURFACE_OFFSET * 2;
const BRUSH_LINE_OFFSET = BRUSH_SURFACE_OFFSET * 1.5;
const MIN_POLE_HEIGHT = 5;
const DEFAULT_POLE_HEIGHT_SCALE = 0.8;
const MAX_POLE_HEIGHT_SCALE = 1.8;

export function getBrushSurfaceOffset(): number {
  return BRUSH_SURFACE_OFFSET;
}

export function getBrushInnerOffset(): number {
  return BRUSH_INNER_OFFSET;
}

export function getBrushLineOffset(): number {
  return BRUSH_LINE_OFFSET;
}

export function getBrushPoleHeight(
  worldRadius: number,
  displacementMagnitude: number | undefined,
): number {
  return Math.max(
    MIN_POLE_HEIGHT,
    Math.min(
      worldRadius * MAX_POLE_HEIGHT_SCALE,
      displacementMagnitude ?? worldRadius * DEFAULT_POLE_HEIGHT_SCALE,
    ),
  );
}

interface LinePreviewInput {
  readonly intersectionPoint: { x: number; y: number; z: number };
  readonly lineStart: { x: number; y: number; z: number } | null | undefined;
}

export interface TopologyLinePreview {
  readonly lineLength: number;
  readonly lineAngle: number;
  readonly lineMidpoint: { x: number; y: number; z: number } | null;
}

export function getTopologyLinePreview({
  intersectionPoint,
  lineStart,
}: LinePreviewInput): TopologyLinePreview {
  if (!lineStart) {
    return {
      lineLength: 0,
      lineAngle: 0,
      lineMidpoint: null,
    };
  }

  return {
    lineLength: Math.hypot(
      intersectionPoint.x - lineStart.x,
      intersectionPoint.z - lineStart.z,
    ),
    lineAngle: Math.atan2(
      intersectionPoint.z - lineStart.z,
      intersectionPoint.x - lineStart.x,
    ),
    lineMidpoint: {
      x: (intersectionPoint.x + lineStart.x) / 2,
      y: (intersectionPoint.y + lineStart.y) / 2,
      z: (intersectionPoint.z + lineStart.z) / 2,
    },
  };
}
