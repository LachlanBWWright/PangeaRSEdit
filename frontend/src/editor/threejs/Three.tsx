import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Canvas } from "@react-three/fiber";
import { TrackballControls } from "@react-three/drei";
import { TerrainGeometry } from "./Terrain";
import { FenceGeometry } from "./FenceGeometry"; // Import the new FenceGeometry component
import { LiquidGeometry } from "./LiquidGeometry"; // Import the new LiquidGeometry component

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
      <LiquidGeometry data={data} />
    </Canvas>
  );
}
