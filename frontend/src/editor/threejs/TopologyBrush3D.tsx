import { useAtomValue } from "jotai";
import { useMemo } from "react";
import {
  CircleGeometry,
  PlaneGeometry,
  CylinderGeometry,
  ConeGeometry,
  MeshBasicMaterial,
  DoubleSide,
} from "three";
import { Globals } from "@/data/globals/globals";
import {
  CurrentTopologyBrushMode,
  TopologyBrushRadius,
  TopologyBrushMode,
} from "@/data/tiles/tileAtoms";

const BRUSH_SURFACE_OFFSET = 0.08;
const BRUSH_INNER_OFFSET = BRUSH_SURFACE_OFFSET * 2;
const BRUSH_LINE_OFFSET = BRUSH_SURFACE_OFFSET * 1.5;
const MIN_POLE_HEIGHT = 5;
const DEFAULT_POLE_HEIGHT_SCALE = 0.8;
const MAX_POLE_HEIGHT_SCALE = 1.8;
const ARROW_RADIUS = 5;
const ARROW_HEIGHT = 12;
const ARROW_SEGMENTS = 10;

interface TopologyBrush3DProps {
  intersectionPoint: { x: number; y: number; z: number } | null;
  lineStart?: { x: number; y: number; z: number } | null;
  showLinePreview?: boolean;
  displacementMagnitude?: number;
  displacementDirection?: "up" | "down";
  visible: boolean;
}

export function TopologyBrush3D({
  intersectionPoint,
  lineStart,
  showLinePreview,
  displacementMagnitude,
  displacementDirection,
  visible,
}: TopologyBrush3DProps) {
  const globals = useAtomValue(Globals);
  const brushMode = useAtomValue(CurrentTopologyBrushMode);
  const brushRadius = useAtomValue(TopologyBrushRadius);

  const worldRadius = Math.max(1, brushRadius - 1) * globals.TILE_INGAME_SIZE;

  const geometry = useMemo(
    () =>
      brushMode === TopologyBrushMode.CIRCLE_BRUSH
        ? new CircleGeometry(worldRadius, 32)
        : new PlaneGeometry(worldRadius * 2, worldRadius * 2),
    [brushMode, worldRadius],
  );

  const fillMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.22,
        side: DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  const falloffMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: 0x7cff7c,
        transparent: true,
        opacity: 0.45,
        side: DoubleSide,
        depthWrite: false,
        wireframe: brushMode === TopologyBrushMode.SQUARE_BRUSH,
      }),
    [brushMode],
  );
  const lineGeometry = useMemo(
    () =>
      new PlaneGeometry(
        Math.max(1, worldRadius * 2),
        Math.max(1, worldRadius * 2),
      ),
    [worldRadius],
  );
  const poleHeight = Math.max(
    MIN_POLE_HEIGHT,
    Math.min(
      worldRadius * MAX_POLE_HEIGHT_SCALE,
      displacementMagnitude ?? worldRadius * DEFAULT_POLE_HEIGHT_SCALE,
    ),
  );
  const poleGeometry = useMemo(
    () => new CylinderGeometry(2, 2, poleHeight, 8),
    [poleHeight],
  );
  const arrowGeometry = useMemo(
    () => new ConeGeometry(ARROW_RADIUS, ARROW_HEIGHT, ARROW_SEGMENTS),
    [],
  );
  const poleMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: 0x44d4ff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    [],
  );

  if (!visible || !intersectionPoint) {
    return null;
  }

  const lineLength = lineStart
    ? Math.hypot(
        intersectionPoint.x - lineStart.x,
        intersectionPoint.z - lineStart.z,
      )
    : 0;
  const lineAngle = lineStart
    ? Math.atan2(
        intersectionPoint.z - lineStart.z,
        intersectionPoint.x - lineStart.x,
      )
    : 0;
  const lineMidpoint = lineStart
    ? {
        x: (intersectionPoint.x + lineStart.x) / 2,
        y: (intersectionPoint.y + lineStart.y) / 2,
        z: (intersectionPoint.z + lineStart.z) / 2,
      }
    : null;

  return (
    <>
      <mesh
        geometry={geometry}
        material={fillMaterial}
        // Three.js terrain editing uses Y-up coordinates.
        position={[
          intersectionPoint.x,
          intersectionPoint.y + BRUSH_SURFACE_OFFSET,
          intersectionPoint.z,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={geometry}
        material={falloffMaterial}
        position={[
          intersectionPoint.x,
          intersectionPoint.y + BRUSH_INNER_OFFSET,
          intersectionPoint.z,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.6, 0.6, 1]}
      />
      {showLinePreview && lineStart && lineMidpoint && lineLength > 0 && (
        <mesh
          geometry={lineGeometry}
          material={fillMaterial}
          position={[
            lineMidpoint.x,
            lineMidpoint.y + BRUSH_LINE_OFFSET,
            lineMidpoint.z,
          ]}
          rotation={[-Math.PI / 2, 0, lineAngle]}
          scale={[lineLength / Math.max(1, worldRadius * 2), 1, 1]}
        />
      )}
      <mesh
        geometry={poleGeometry}
        material={poleMaterial}
        position={[
          intersectionPoint.x,
          intersectionPoint.y + poleHeight / 2 + BRUSH_LINE_OFFSET,
          intersectionPoint.z,
        ]}
      />
      <mesh
        geometry={arrowGeometry}
        material={poleMaterial}
        position={[
          intersectionPoint.x,
          intersectionPoint.y + poleHeight + 6 + BRUSH_LINE_OFFSET,
          intersectionPoint.z,
        ]}
        rotation={displacementDirection === "down" ? [Math.PI, 0, 0] : [0, 0, 0]}
      />
    </>
  );
}
