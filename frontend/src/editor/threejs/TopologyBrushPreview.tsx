import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { RingGeometry, MeshBasicMaterial, DoubleSide } from "three";
import { Globals } from "@/data/globals/globals";
import { TopologyBrushRadius } from "@/data/tiles/tileAtoms";

interface TopologyBrushPreviewProps {
  mouseX: number | null;
  mouseZ: number | null;
  visible: boolean;
}

/**
 * Shows a simple circle preview of the topology brush radius when hovering
 * This replaces the old green layer system that covered the entire map
 */
export function TopologyBrushPreview({
  mouseX,
  mouseZ,
  visible,
}: TopologyBrushPreviewProps) {
  const globals = useAtomValue(Globals);
  const brushRadius = useAtomValue(TopologyBrushRadius);

  const geometry = useMemo(() => {
    const radiusInWorldUnits = brushRadius * globals.TILE_INGAME_SIZE;
    return new RingGeometry(
      radiusInWorldUnits * 0.9, // Inner radius (slightly smaller for ring effect)
      radiusInWorldUnits,        // Outer radius
      32,                         // Segments for smoothness
      1                           // Phi segments
    );
  }, [brushRadius, globals.TILE_INGAME_SIZE]);

  const material = useMemo(() => {
    return new MeshBasicMaterial({
      color: 0x44ff44, // Green
      transparent: true,
      opacity: 0.6,
      side: DoubleSide,
      depthWrite: false, // Don't write to depth buffer to prevent z-fighting
    });
  }, []);

  if (!visible || mouseX === null || mouseZ === null) {
    return null;
  }

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[mouseX, 0.5, mouseZ]} // Slightly above terrain
      rotation={[-Math.PI / 2, 0, 0]}  // Lay flat
    />
  );
}
