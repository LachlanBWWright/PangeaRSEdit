import { Canvas } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import { TerrainGeometry } from "./Terrain";
import { RoofGeometry } from "./RoofGeometry";
import { FenceGeometry } from "./FenceGeometry";
import { LiquidGeometry } from "./LiquidGeometry";
import { ItemGeometry } from "./ItemGeometry";
import { SplineGeometry } from "./SplineGeometry";
import { SplineItemGeometry } from "./SplineItemGeometry";
import { TopologyBrush3D } from "./TopologyBrush3D";
import { TopologyPreview3D } from "./TopologyPreview3D";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import {
  Show3DSplines,
  Show3DItems,
  Show3DFences,
  Show3DLiquid,
} from "@/data/canvasView/canvasViewAtoms";
import {
  TileViewMode,
  TileViews,
  CurrentTopologyBrushMode,
  CurrentTopologyDualEditMode,
  CurrentTopologyLayerEditMode,
  CurrentTopologyValueMode,
  TopologyBrushRadius,
  TopologyValue,
} from "@/data/tiles/tileAtoms";
import {
  HeaderData,
  FenceData,
  LiquidData,
  ItemData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";

import { useRef } from "react";
import { Mesh, MOUSE } from "three";
import type { Updater } from "use-immer";
import { SceneExporter } from "./threeExportHelpers";
import { useThreeTopologyEditing } from "./useThreeTopologyEditing";

export function ThreeView({
  headerData,
  fenceData,
  liquidData,
  itemData,
  splineData,
  terrainData,
  mapImages,
  setItemData,
  setTerrainData,
}: {
  headerData: HeaderData;
  fenceData: FenceData | null;
  liquidData: LiquidData | null;
  itemData: ItemData | null;
  splineData: SplineData | null;
  terrainData: TerrainData;
  mapImages: HTMLCanvasElement[];
  setItemData?: Updater<ItemData | null>;
  setTerrainData?: Updater<TerrainData>;
}) {
  const globals = useAtomValue(Globals);
  const show3DSplines = useAtomValue(Show3DSplines);
  const show3DItems = useAtomValue(Show3DItems);
  const show3DFences = useAtomValue(Show3DFences);
  const show3DLiquid = useAtomValue(Show3DLiquid);

  // Topology editing state
  const tileViewMode = useAtomValue(TileViewMode);
  const brushMode = useAtomValue(CurrentTopologyBrushMode);
  const dualEditMode = useAtomValue(CurrentTopologyDualEditMode);
  const layerEditMode = useAtomValue(CurrentTopologyLayerEditMode);
  const brushRadius = useAtomValue(TopologyBrushRadius);
  const valueMode = useAtomValue(CurrentTopologyValueMode);
  const topologyValue = useAtomValue(TopologyValue);

  const terrainMeshRef = useRef<Mesh>(null);
  const roofMeshRef = useRef<Mesh>(null);

  const isEditingTopology = tileViewMode === TileViews.Topology;

  const header = headerData.Hedr[1000].obj;

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;

  const unitsWide = numWide * globals.TILE_INGAME_SIZE;
  const unitsHigh = numHigh * globals.TILE_INGAME_SIZE;
  const yScale = globals.TILE_INGAME_SIZE / Math.max(1, header.tileSize ?? 1);
  const {
    intersectionPoint,
    isEditing,
    isShiftHeld,
    topologyVersion,
    draggingItemIdx,
    displacementMagnitude,
    displacementDirection,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handleItemPointerDown,
  } = useThreeTopologyEditing({
    globals,
    header,
    terrainData,
    setTerrainData,
    setItemData,
    isEditingTopology,
    brushMode,
    dualEditMode,
    layerEditMode,
    brushRadius,
    valueMode,
    topologyValue,
    yScale,
    terrainMeshRef,
    roofMeshRef,
  });

  // Ensure header is defined before rendering TestGeometry
  if (!header) {
    return null; // Or some fallback UI
  }

  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      gl={{ logarithmicDepthBuffer: true }}
      onContextMenu={(event) => event.preventDefault()}
      camera={{
        fov: 60,
        near: 1,
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
        // Disable controls during editing
        enabled={!isEditing && draggingItemIdx === null}
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
        mouseButtons={{
          LEFT: isShiftHeld ? MOUSE.PAN : MOUSE.ROTATE,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.PAN,
        }}
        // Start looking at the center of the map
        target={[unitsWide / 2, 0, unitsHigh / 2]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 2, 1]} intensity={1} />

      {/* Exporter hook component (listens for export triggers) */}
      <SceneExporter />
      <TerrainGeometry
        ref={terrainMeshRef}
        headerData={headerData}
        terrainData={terrainData}
        mapImages={mapImages}
        onPointerDown={isEditingTopology ? handlePointerDown : undefined}
        onPointerMove={isEditingTopology ? handlePointerMove : undefined}
        onPointerUp={isEditingTopology ? handlePointerUp : undefined}
      />
      {/* Roof geometry (Bugdom 1 and games with YCrd 1001) */}
      <RoofGeometry
        key={`roof-${topologyVersion}`}
        ref={roofMeshRef}
        headerData={headerData}
        terrainData={terrainData}
        onPointerDown={isEditingTopology ? handlePointerDown : undefined}
        onPointerMove={isEditingTopology ? handlePointerMove : undefined}
        onPointerUp={isEditingTopology ? handlePointerUp : undefined}
      />
      {isEditingTopology && (
        <>
          <TopologyBrush3D
            intersectionPoint={intersectionPoint}
            lineStart={null}
            showLinePreview={false}
            displacementMagnitude={displacementMagnitude}
            displacementDirection={displacementDirection}
            visible={!!intersectionPoint}
          />
          <TopologyPreview3D />
        </>
      )}
      {fenceData && show3DFences && (
        <FenceGeometry
          fenceData={fenceData}
          headerData={headerData}
          terrainData={terrainData}
          topologyVersion={topologyVersion}
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
          onItemPointerDown={setItemData ? handleItemPointerDown : undefined}
          draggingItemIdx={draggingItemIdx}
          topologyVersion={topologyVersion}
        />
      )}
      {/* Drag plane: invisible mesh above terrain that captures pointer events during item drag */}
      {draggingItemIdx !== null && (
        <mesh
          position={[unitsWide / 2, 1, unitsHigh / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <planeGeometry args={[unitsWide * 4, unitsHigh * 4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
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
      {/*  <TestGeometry header={header} globals={globals} */}
    </Canvas>
  );
}
