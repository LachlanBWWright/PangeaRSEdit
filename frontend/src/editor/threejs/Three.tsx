import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Canvas, Camera } from "@react-three/fiber";
import { TrackballControls, PerspectiveCamera } from "@react-three/drei";
import { TerrainGeometry } from "./Terrain";
import { FenceGeometry } from "./FenceGeometry"; // Import the new FenceGeometry component

export function ThreeView({
  data,
  mapImages,
}: {
  data: ottoMaticLevel;
  mapImages: HTMLCanvasElement[];
}) {
  return (
    <Canvas
      camera={{ fov: 110, near: 0.1, far: 100000, position: [0, 0, 100] }}
    >
      <TrackballControls />
      <TerrainGeometry data={data} mapImages={mapImages} />
      <FenceGeometry data={data} />
    </Canvas>
  );
}
