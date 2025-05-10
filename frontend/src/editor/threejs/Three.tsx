import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Canvas } from "@react-three/fiber";
import { TrackballControls } from "@react-three/drei";
import { TerrainGeometry } from "./Terrain";
import { FenceGeometry } from "./FenceGeometry"; // Import the new FenceGeometry component
import { LiquidGeometry } from "./LiquidGeometry"; // Import the new LiquidGeometry component
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";

export function ThreeView({
  data,
  mapImages,
}: {
  data: ottoMaticLevel;
  mapImages: HTMLCanvasElement[];
}) {
  const globals = useAtomValue(Globals);
  const header = data.Hedr?.[1000]?.obj;

  // Ensure header is defined before rendering TestGeometry
  if (!header) {
    return null; // Or some fallback UI
  }

  return (
    <Canvas
      camera={{ fov: 110, near: 0.1, far: 100000, position: [0, 0, 100] }}
    >
      <TrackballControls />
      <TerrainGeometry data={data} mapImages={mapImages} />
      <FenceGeometry data={data} />
      <LiquidGeometry data={data} />
      {/*  <TestGeometry header={header} globals={globals} /> */}
    </Canvas>
  );
}
