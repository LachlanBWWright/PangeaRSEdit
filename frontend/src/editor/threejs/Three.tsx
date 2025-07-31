import { Canvas } from "@react-three/fiber";
import { TrackballControls } from "@react-three/drei";
import { TerrainGeometry } from "./Terrain";
import { FenceGeometry } from "./FenceGeometry"; // Import the new FenceGeometry component
import { LiquidGeometry } from "./LiquidGeometry"; // Import the new LiquidGeometry component
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { HeaderData, FenceData, LiquidData } from "@/python/structSpecs/ottoMaticLevelData";

export function ThreeView({
  headerData,
  fenceData,
  liquidData,
  otherData,
  mapImages,
}: {
  headerData: HeaderData;
  fenceData: FenceData;
  liquidData: LiquidData;
  otherData: Partial<ottoMaticLevel>;
  mapImages: HTMLCanvasElement[];
}) {
  const globals = useAtomValue(Globals);
  const header = headerData.Hedr?.[1000]?.obj;

  const numWide = header?.mapWidth || 0;
  const numHigh = header?.mapHeight || 0;

  const unitsWide = numWide * globals.TILE_INGAME_SIZE;
  const unitsHigh = numHigh * globals.TILE_INGAME_SIZE;

  // Ensure header is defined before rendering TestGeometry
  if (!header) {
    return null; // Or some fallback UI
  }

  return (
    <Canvas
      camera={{
        fov: 110,
        near: 0.1,
        far: 100000,
        position: [unitsWide / 2, 5000, unitsHigh / 2],
        rotation: [0, Math.PI, 0],
      }}
    >
      <TrackballControls />
      <TerrainGeometry headerData={headerData} otherData={otherData} mapImages={mapImages} />
      <FenceGeometry fenceData={fenceData} headerData={headerData} otherData={otherData} />
      <LiquidGeometry liquidData={liquidData} headerData={headerData} otherData={otherData} />
      {/*  <TestGeometry header={header} globals={globals} /> */}
    </Canvas>
  );
}
