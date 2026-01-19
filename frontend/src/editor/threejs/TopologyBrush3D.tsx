import { useAtomValue } from "jotai";
import { useRef, useMemo } from "react";
import { Mesh, CircleGeometry, PlaneGeometry, MeshBasicMaterial, DoubleSide } from "three";
import { Globals } from "@/data/globals/globals";
import {
  CurrentTopologyBrushMode,
  TopologyBrushRadius,
  TopologyBrushMode,
} from "@/data/tiles/tileAtoms";

interface TopologyBrush3DProps {
  intersectionPoint: { x: number; y: number; z: number } | null;
  visible: boolean;
  color?: number | string;
}

export function TopologyBrush3D({ intersectionPoint, visible, color = 0x00ff00 }: TopologyBrush3DProps) {
  const globals = useAtomValue(Globals);
  const brushMode = useAtomValue(CurrentTopologyBrushMode);
  const brushRadius = useAtomValue(TopologyBrushRadius);
  
  const meshRef = useRef<Mesh>(null);

  // Calculate radius in world units
  const worldRadius = (brushRadius - 1) * globals.TILE_INGAME_SIZE;

  // Create geometry based on brush mode
  const geometry = useMemo(() => {
    if (brushMode === TopologyBrushMode.CIRCLE_BRUSH) {
      return new CircleGeometry(worldRadius, 32);
    } else {
      // Square brush
      const size = worldRadius * 2;
      return new PlaneGeometry(size, size);
    }
  }, [brushMode, worldRadius]);

  // Semi-transparent material for brush indicator
  const material = useMemo(() => {
    return new MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: DoubleSide,
      depthWrite: false,
    });
  }, [color]);

  if (!visible || !intersectionPoint) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[intersectionPoint.x, intersectionPoint.y, intersectionPoint.z + 0.5]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
}
