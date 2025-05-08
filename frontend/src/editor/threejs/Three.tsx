import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Canvas } from "@react-three/fiber";
import { TrackballControls } from "@react-three/drei";
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
    <Canvas>
      <TrackballControls />
      <TerrainGeometry data={data} mapImages={mapImages} />
      <FenceGeometry data={data} />
    </Canvas>
  );
}
