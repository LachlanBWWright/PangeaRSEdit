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
import { brushRadiusToWorldRadius } from "../utils/topologyBrushUtils";
import {
  getBrushInnerOffset,
  getBrushLineOffset,
  getBrushPoleHeight,
  getBrushSurfaceOffset,
  getTopologyLinePreview,
} from "@/editor/threejs/topologyBrush3dState";

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

  const worldRadius = brushRadiusToWorldRadius(
    brushRadius,
    globals.TILE_INGAME_SIZE,
  );

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
  const poleHeight = getBrushPoleHeight(worldRadius, displacementMagnitude);
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

  const brushSurfaceOffset = getBrushSurfaceOffset();
  const brushInnerOffset = getBrushInnerOffset();
  const brushLineOffset = getBrushLineOffset();
  const linePreview = getTopologyLinePreview({ intersectionPoint, lineStart });

  return (
    <>
      <mesh
        geometry={geometry}
        material={fillMaterial}
        // Three.js terrain editing uses Y-up coordinates.
        position={[
          intersectionPoint.x,
          intersectionPoint.y + brushSurfaceOffset,
          intersectionPoint.z,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={geometry}
        material={falloffMaterial}
        position={[
          intersectionPoint.x,
          intersectionPoint.y + brushInnerOffset,
          intersectionPoint.z,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.6, 0.6, 1]}
      />
      {showLinePreview &&
        lineStart &&
        linePreview.lineMidpoint &&
        linePreview.lineLength > 0 && (
          <mesh
            geometry={lineGeometry}
            material={fillMaterial}
            position={[
              linePreview.lineMidpoint.x,
              linePreview.lineMidpoint.y + brushLineOffset,
              linePreview.lineMidpoint.z,
            ]}
            rotation={[-Math.PI / 2, 0, linePreview.lineAngle]}
            scale={[
              linePreview.lineLength / Math.max(1, worldRadius * 2),
              1,
              1,
            ]}
          />
        )}
      <mesh
        geometry={poleGeometry}
        material={poleMaterial}
        position={[
          intersectionPoint.x,
          intersectionPoint.y + poleHeight / 2 + brushLineOffset,
          intersectionPoint.z,
        ]}
      />
      <mesh
        geometry={arrowGeometry}
        material={poleMaterial}
        position={[
          intersectionPoint.x,
          intersectionPoint.y + poleHeight + 6 + brushLineOffset,
          intersectionPoint.z,
        ]}
        rotation={
          displacementDirection === "down" ? [Math.PI, 0, 0] : [0, 0, 0]
        }
      />
    </>
  );
}
