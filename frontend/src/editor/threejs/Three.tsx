import { Canvas, useThree } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import { TerrainGeometry } from "./Terrain";
import { FenceGeometry } from "./FenceGeometry";
import { LiquidGeometry } from "./LiquidGeometry";
import { ItemGeometry } from "./ItemGeometry";
import { SplineGeometry } from "./SplineGeometry";
import { SplineItemGeometry } from "./SplineItemGeometry";
import { TopologyBrush3D } from "./TopologyBrush3D";
import { TopologyPreview3D } from "./TopologyPreview3D";
import { useAtomValue, useAtom } from "jotai";
import { Globals } from "@/data/globals/globals";
import {
  Show3DSplines,
  Show3DItems,
  Show3DFences,
  Show3DLiquid,
  Export3DScene,
} from "@/data/canvasView/canvasViewAtoms";
import {
  TileViewMode,
  TileViews,
  CurrentTopologyBrushMode,
  TopologyBrushRadius,
  CurrentTopologyValueMode,
  TopologyValue,
} from "@/data/tiles/tileAtoms";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  HeaderData,
  FenceData,
  LiquidData,
  ItemData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Vector3, Mesh } from "three";
import type * as THREE from "three";
import {
  calculateBrushPixels,
  applyTopologyBrush,
  worldToTile,
  PixelType,
} from "../utils/topologyBrushUtils";

function SceneExporter() {
  const { scene } = useThree();
  const [exportCounter] = useAtom(Export3DScene);
  const last = useRef<number>(exportCounter);
  const exportToastId = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (exportCounter === last.current) return;
    last.current = exportCounter;

    const exporter = new GLTFExporter();

    try {
      // Show a loading toast while the exporter runs
      exportToastId.current = toast.loading("Exporting 3D map...");

      exporter.parse(
        scene,
        (result: ArrayBuffer | { [key: string]: unknown }) => {
          // Dismiss loading toast and show success
          if (exportToastId.current !== undefined) {
            toast.dismiss(exportToastId.current);
            exportToastId.current = undefined;
          }

          if (result instanceof ArrayBuffer) {
            const blob = new Blob([result], { type: "model/gltf-binary" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "map.glb";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("3D map exported (map.glb)");
          } else {
            const output = JSON.stringify(result, null, 2);
            const blob = new Blob([output], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "map.gltf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("3D map exported (map.gltf)");
          }
        },
        (error) => {
          if (exportToastId.current !== undefined) {
            toast.dismiss(exportToastId.current);
            exportToastId.current = undefined;
          }
          console.error("Export error:", error);
          toast.error("Failed to export 3D map");
        },
        { binary: true, embedImages: true },
      );
    } catch (err: unknown) {
      if (exportToastId.current !== undefined) {
        toast.dismiss(exportToastId.current);
        exportToastId.current = undefined;
      }
      console.error("Failed to export GLB", err);
      toast.error("Failed to export 3D map", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }, [exportCounter, scene]);

  return null;
}

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
  
  // Topology editing state
  const tileViewMode = useAtomValue(TileViewMode);
  const brushMode = useAtomValue(CurrentTopologyBrushMode);
  const brushRadius = useAtomValue(TopologyBrushRadius);
  const valueMode = useAtomValue(CurrentTopologyValueMode);
  const topologyValue = useAtomValue(TopologyValue);
  
  const terrainMeshRef = useRef<Mesh>(null);
  const [intersectionPoint, setIntersectionPoint] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [affectedPixels, setAffectedPixels] = useState<PixelType[]>([]);
  
  const isEditingTopology = tileViewMode === TileViews.Topology;

  const header = headerData.Hedr[1000].obj;

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;

  const unitsWide = numWide * globals.TILE_INGAME_SIZE;
  const unitsHigh = numHigh * globals.TILE_INGAME_SIZE;

  const handlePointerMove = useCallback((event: THREE.Event) => {
    if (!isEditingTopology || !terrainMeshRef.current) return;

    const threeEvent = event as THREE.Event & { point: Vector3 };
    if (threeEvent.point) {
      setIntersectionPoint({
        x: threeEvent.point.x,
        y: threeEvent.point.y,
        z: threeEvent.point.z,
      });

      // Calculate affected pixels for preview
      const tileCoords = worldToTile(threeEvent.point.x, threeEvent.point.z, globals.TILE_INGAME_SIZE);
      const radius = (brushRadius - 1) * globals.TILE_INGAME_SIZE;
      
      const pixels = calculateBrushPixels({
        centerX: tileCoords.x * globals.TILE_INGAME_SIZE,
        centerY: tileCoords.z * globals.TILE_INGAME_SIZE,
        radius,
        brushMode,
        valueMode,
        value: topologyValue,
        header,
        globals,
        tileSize: globals.TILE_INGAME_SIZE,
      });

      setAffectedPixels(pixels);
    }
  }, [isEditingTopology, brushMode, brushRadius, valueMode, topologyValue, header, globals]);

  const handlePointerDown = useCallback((event: THREE.Event) => {
    if (!isEditingTopology) return;
    
    const threeEvent = event as THREE.Event & { point: Vector3 };
    if (threeEvent.point && terrainData.YCrd?.[1000]?.obj) {
      setIsEditing(true);
      
      // Apply brush
      const tileCoords = worldToTile(threeEvent.point.x, threeEvent.point.z, globals.TILE_INGAME_SIZE);
      const radius = (brushRadius - 1) * globals.TILE_INGAME_SIZE;
      
      const pixels = calculateBrushPixels({
        centerX: tileCoords.x * globals.TILE_INGAME_SIZE,
        centerY: tileCoords.z * globals.TILE_INGAME_SIZE,
        radius,
        brushMode,
        valueMode,
        value: topologyValue,
        header,
        globals,
        tileSize: globals.TILE_INGAME_SIZE,
      });

      applyTopologyBrush(terrainData.YCrd[1000].obj, pixels, {
        centerX: tileCoords.x * globals.TILE_INGAME_SIZE,
        centerY: tileCoords.z * globals.TILE_INGAME_SIZE,
        radius,
        brushMode,
        valueMode,
        value: topologyValue,
        header,
        globals,
        tileSize: globals.TILE_INGAME_SIZE,
      });

      // Force terrain re-render by updating the geometry
      if (terrainMeshRef.current && terrainMeshRef.current.geometry) {
        const geom = terrainMeshRef.current.geometry;
        const positionAttr = geom.attributes.position;
        if (positionAttr) {
          positionAttr.needsUpdate = true;
          geom.computeVertexNormals();
        }
      }
    }
  }, [isEditingTopology, brushMode, brushRadius, valueMode, topologyValue, header, globals, terrainData]);

  const handlePointerUp = useCallback(() => {
    setIsEditing(false);
  }, []);

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
        // Disable controls during editing
        enabled={!isEditing}
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

      {/* Exporter hook component (listens for export triggers) */}
      <SceneExporter />
      <TerrainGeometry
        ref={terrainMeshRef}
        headerData={headerData}
        terrainData={terrainData}
        mapImages={mapImages}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {isEditingTopology && (
        <>
          <TopologyBrush3D 
            intersectionPoint={intersectionPoint}
            visible={!!intersectionPoint}
          />
          <TopologyPreview3D
            headerData={headerData}
            terrainData={terrainData}
            affectedPixels={affectedPixels}
            visible={!!intersectionPoint && affectedPixels.length > 0}
          />
        </>
      )}
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
      {/*  <TestGeometry header={header} globals={globals} */}
    </Canvas>
  );
}
