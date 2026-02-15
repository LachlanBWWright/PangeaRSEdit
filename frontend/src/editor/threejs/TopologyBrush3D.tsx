import { useAtomValue } from "jotai";
import { useMemo } from "react";
import {
  CircleGeometry,
  PlaneGeometry,
  MeshBasicMaterial,
  DoubleSide,
} from "three";
import { Globals } from "@/data/globals/globals";
import {
  CurrentTopologyBrushMode,
  TopologyBrushRadius,
  TopologyBrushMode,
} from "@/data/tiles/tileAtoms";

interface TopologyBrush3DProps {
  intersectionPoint: { x: number; y: number; z: number } | null;
  lineStart?: { x: number; y: number; z: number } | null;
  showLinePreview?: boolean;
  visible: boolean;
}

export function TopologyBrush3D({
  intersectionPoint,
  lineStart,
  showLinePreview,
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
        position={[intersectionPoint.x, intersectionPoint.y, intersectionPoint.z + 0.5]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={geometry}
        material={falloffMaterial}
        position={[intersectionPoint.x, intersectionPoint.y + 0.05, intersectionPoint.z + 0.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.6, 0.6, 1]}
      />
      {showLinePreview && lineStart && lineMidpoint && lineLength > 0 && (
        <mesh
          geometry={lineGeometry}
          material={fillMaterial}
          position={[lineMidpoint.x, lineMidpoint.y + 0.02, lineMidpoint.z + 0.5]}
          rotation={[-Math.PI / 2, 0, lineAngle]}
          scale={[lineLength / Math.max(1, worldRadius * 2), 1, 1]}
        />
      )}
    </>
  );
}
