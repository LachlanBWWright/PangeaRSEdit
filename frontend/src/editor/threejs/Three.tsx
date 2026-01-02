import { Canvas, useThree } from "@react-three/fiber";
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
  EditRoofAndFloorTogether,
  RoofFloorElevation,
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
import type { Event } from "three";

// Type guard for THREE events with point
interface ThreeEventWithPoint extends Event<string, unknown> {
  point: Vector3;
}

function hasPointProperty(event: Event<string, unknown>): event is ThreeEventWithPoint {
  return "point" in event && event.point instanceof Vector3;
}

import {
  calculateBrushPixels,
  applyTopologyBrush,
  applyDualTopologyBrush,
  worldToTile,
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
        (result: ArrayBuffer | Record<string, unknown>) => {
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
  const editRoofAndFloor = useAtomValue(EditRoofAndFloorTogether);
  const roofFloorElevation = useAtomValue(RoofFloorElevation);
  
  const terrainMeshRef = useRef<Mesh>(null);
  const [intersectionPoint, setIntersectionPoint] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const isEditingTopology = tileViewMode === TileViews.Topology;

  const header = headerData.Hedr[1000].obj;

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;

  const unitsWide = numWide * globals.TILE_INGAME_SIZE;
  const unitsHigh = numHigh * globals.TILE_INGAME_SIZE;

  const handlePointerMove = useCallback((event: THREE.Event<string, unknown>) => {
    if (!isEditingTopology || !terrainMeshRef.current) return;

    if (hasPointProperty(event)) {
      setIntersectionPoint({
        x: event.point.x,
        y: event.point.y,
        z: event.point.z,
      });

      // Calculate affected pixels for preview
      const tileCoords = worldToTile(event.point.x, event.point.z, globals.TILE_INGAME_SIZE);
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

      // Apply brush while dragging (if isEditing)
      // Performance note: This applies on every mouse move during editing.
      // For very large terrains, consider debouncing or using requestAnimationFrame
      // to limit update frequency. Current implementation prioritizes responsiveness
      // for typical game level sizes (tested with maps up to 256x256 tiles).
      if (isEditing && terrainData.YCrd?.[1000]?.obj) {
        // Check if we should use dual editing mode (floor + roof)
        const hasRoof = terrainData.YCrd?.[1001]?.obj !== undefined;
        const useDualMode = editRoofAndFloor && hasRoof;

        if (useDualMode && terrainData.YCrd[1001]) {
          // Apply dual brush (affects both floor and roof)
          applyDualTopologyBrush(
            terrainData.YCrd[1000].obj,
            terrainData.YCrd[1001].obj,
            pixels,
            {
              centerX: tileCoords.x * globals.TILE_INGAME_SIZE,
              centerY: tileCoords.z * globals.TILE_INGAME_SIZE,
              radius,
              brushMode,
              valueMode,
              value: topologyValue,
              header,
              globals,
              tileSize: globals.TILE_INGAME_SIZE,
            },
            roofFloorElevation
          );
        } else {
          // Apply single brush (floor only)
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
        }

        // Trigger geometry update
        if (terrainMeshRef.current && terrainMeshRef.current.geometry) {
          const geom = terrainMeshRef.current.geometry;
          const positionAttr = geom.attributes.position;
          if (positionAttr) {
            const ycrd = terrainData.YCrd[1000].obj;
            const mapTileSize = header.tileSize ?? 1;
            const yScale = globals.TILE_INGAME_SIZE / Math.max(1, mapTileSize);
            
            for (let i = 0; i < positionAttr.count; i++) {
              const ycrdValue = ycrd[i];
              if (ycrdValue !== undefined) {
                positionAttr.setZ(i, ycrdValue * yScale);
              }
            }
            geom.computeVertexNormals();
            positionAttr.needsUpdate = true;
          }
        }
      }
    }
  }, [isEditingTopology, isEditing, brushMode, brushRadius, valueMode, topologyValue, header, globals, terrainData, editRoofAndFloor, roofFloorElevation]);

  const handlePointerDown = useCallback((event: THREE.Event<string, unknown>) => {
    if (!isEditingTopology) return;
    
    if (hasPointProperty(event) && terrainData.YCrd?.[1000]?.obj) {
      setIsEditing(true);
      
      // Apply brush
      const tileCoords = worldToTile(event.point.x, event.point.z, globals.TILE_INGAME_SIZE);
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

      // Check if we should use dual editing mode
      const hasRoof = terrainData.YCrd?.[1001]?.obj !== undefined;
      const useDualMode = editRoofAndFloor && hasRoof;

      if (useDualMode && terrainData.YCrd[1001]) {
        // Apply dual brush
        applyDualTopologyBrush(
          terrainData.YCrd[1000].obj,
          terrainData.YCrd[1001].obj,
          pixels,
          {
            centerX: tileCoords.x * globals.TILE_INGAME_SIZE,
            centerY: tileCoords.z * globals.TILE_INGAME_SIZE,
            radius,
            brushMode,
            valueMode,
            value: topologyValue,
            header,
            globals,
            tileSize: globals.TILE_INGAME_SIZE,
          },
          roofFloorElevation
        );
      } else {
        // Apply single brush
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
      }

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
  }, [isEditingTopology, brushMode, brushRadius, valueMode, topologyValue, header, globals, terrainData, editRoofAndFloor, roofFloorElevation]);

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
      {/* Roof geometry (Bugdom 1 and games with YCrd 1001) */}
      <RoofGeometry
        headerData={headerData}
        terrainData={terrainData}
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
          <TopologyPreview3D />
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
