import { Canvas } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import { TerrainGeometry } from "./Terrain";
import { FenceGeometry } from "./FenceGeometry";
import { LiquidGeometry } from "./LiquidGeometry";
import { ItemGeometry } from "./ItemGeometry";
import { SplineGeometry } from "./SplineGeometry";
import { SplineItemGeometry } from "./SplineItemGeometry";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import {
  Show3DSplines,
  Show3DItems,
  Show3DFences,
  Show3DLiquid,
} from "@/data/canvasView/canvasViewAtoms";
import {
  HeaderData,
  FenceData,
  LiquidData,
  ItemData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";

export function ThreeView({
  headerData,
  fenceData,
  liquidData,
  itemData,
  splineData,
  terrainData,
  mapImages,
}: {
  headerData: HeaderData;
  fenceData: FenceData | null;
  liquidData: LiquidData | null;
  itemData: ItemData | null;
  splineData: SplineData | null;
  terrainData: TerrainData;
  mapImages: HTMLCanvasElement[];
}) {
  const globals = useAtomValue(Globals);
  const show3DSplines = useAtomValue(Show3DSplines);
  const show3DItems = useAtomValue(Show3DItems);
  const show3DFences = useAtomValue(Show3DFences);
  const show3DLiquid = useAtomValue(Show3DLiquid);

  const header = headerData.Hedr[1000].obj;

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;

  const unitsWide = numWide * globals.TILE_INGAME_SIZE;
  const unitsHigh = numHigh * globals.TILE_INGAME_SIZE;

  // Ensure header is defined before rendering TestGeometry
  if (!header) {
    return null; // Or some fallback UI
  }

  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      camera={{
        fov: 60,
        near: 0.1,
        far: 100000,
        // Place the camera above the map and slightly to the side, so it's easier
        // to orbit and pan while keeping a top-down editing view
        position: [
          unitsWide / 2,
          Math.max(unitsWide, unitsHigh) * 0.15,
          unitsHigh / 2 + 400,
        ],
      }}
    >
      <MapControls
        // Make the controls the default camera controls
        makeDefault
        // Smooth movement
        enableDamping
        dampingFactor={0.08}
        // Allow panning and rotating but reduce rotation to stay usable for map editing
        enablePan
        enableRotate
        minDistance={50}
        maxDistance={Math.max(unitsWide, unitsHigh) * 10}
        // Don't allow going below the horizon (keeps it primarily a top-down editor)
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2 - 0.05}
        // Keep panning aligned with the ground plane, so panning feels intuitive
        screenSpacePanning={false}
        // Start looking at the center of the map
        target={[unitsWide / 2, 0, unitsHigh / 2]}
      />
      <TerrainGeometry
        headerData={headerData}
        terrainData={terrainData}
        mapImages={mapImages}
      />
      {fenceData && show3DFences && (
        <FenceGeometry
          fenceData={fenceData}
          headerData={headerData}
          terrainData={terrainData}
        />
      )}
      {liquidData && show3DLiquid && (
        <LiquidGeometry
          liquidData={liquidData}
          headerData={headerData}
          terrainData={terrainData}
        />
      )}
      {itemData && show3DItems && (
        <ItemGeometry
          itemData={itemData}
          headerData={headerData}
          terrainData={terrainData}
        />
      )}
      {splineData && show3DSplines && (
        <SplineGeometry
          splineData={splineData}
          headerData={headerData}
          terrainData={terrainData}
        />
      )}
      {splineData && show3DSplines && (
        <SplineItemGeometry
          splineData={splineData}
          headerData={headerData}
          terrainData={terrainData}
        />
      )}
      {/*  <TestGeometry header={header} globals={globals} */ }
    </Canvas>
  );
}
