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
  CurrentTopologyDualEditMode,
  CurrentTopologyBrushMode,
  CurrentTopologyLayerEditMode,
  TopologyBrushRadius,
  CurrentTopologyValueMode,
  TopologyLayerEditMode,
  TopologyValueMode,
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
import { Vector3, Mesh, MOUSE } from "three";
import type { Event } from "three";
import type { Updater } from "use-immer";

// Type guard for THREE events with point
interface ThreeEventWithPoint extends Event<string, unknown> {
  point: Vector3;
  nativeEvent?: PointerEvent;
  stopPropagation?: () => void;
}

function hasPointProperty(event: Event<string, unknown>): event is ThreeEventWithPoint {
  return "point" in event && event.point instanceof Vector3;
}

function hasNativePointerEvent(
  event: Event<string, unknown>,
): event is ThreeEventWithPoint {
  return "nativeEvent" in event;
}

import {
  calculateBrushPixels,
  applyTopologyBrushToSnapshot,
  cloneHeightArray,
  worldToTile,
  brushRadiusToWorldRadius,
  mergeBrushPixels,
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
  const [intersectionPoint, setIntersectionPoint] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  // Incremented when the 3D topology brush finishes a stroke so fence/item geometry
  // re-reads terrain heights (the brush directly mutates terrainData in place for
  // performance, so the useMemo deps don't see the change otherwise).
  const [topologyVersion, setTopologyVersion] = useState(0);
  const lastBrushCenterRef = useRef<{ x: number; y: number } | null>(null);
  const topologyStrokeRef = useRef<{
    floorSnapshot: number[];
    roofSnapshot: number[] | undefined;
    draftFloor: number[];
    draftRoof: number[] | undefined;
    pixels: ReturnType<typeof calculateBrushPixels>;
    brushRadiusWorld: number;
    lastPoint: { x: number; y: number };
  } | null>(null);

  // Item drag state
  const [draggingItemIdx, setDraggingItemIdx] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);
  
  const isEditingTopology = tileViewMode === TileViews.Topology;

  const header = headerData.Hedr[1000].obj;

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;

  const unitsWide = numWide * globals.TILE_INGAME_SIZE;
  const unitsHigh = numHigh * globals.TILE_INGAME_SIZE;
  const yScale = globals.TILE_INGAME_SIZE / Math.max(1, header.tileSize ?? 1);
  const setModeDisplacement =
    intersectionPoint === null
      ? Math.abs(topologyValue) * yScale
      : Math.abs(topologyValue * yScale - intersectionPoint.y);
  const displacementMagnitude =
    valueMode === TopologyValueMode.SET_VALUE
      ? setModeDisplacement
      : Math.abs(topologyValue) * yScale;
  const displacementDirection =
    topologyValue === 0 ? undefined : topologyValue < 0 ? "down" : "up";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShiftHeld(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShiftHeld(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const updateMeshGeometryElevations = useCallback(
    (mesh: Mesh | null, heights: number[] | undefined) => {
      if (!mesh || !mesh.geometry || !heights) {
        return;
      }

      const positionAttr = mesh.geometry.attributes.position;
      if (!positionAttr) {
        return;
      }

      for (let index = 0; index < positionAttr.count; index++) {
        const height = heights[index];
        if (height === undefined) {
          continue;
        }
        positionAttr.setZ(index, height * yScale);
      }

      mesh.geometry.computeVertexNormals();
      positionAttr.needsUpdate = true;
    },
    [yScale],
  );

  const applyDraftToMeshes = useCallback((
    draftFloor: number[],
    draftRoof: number[] | undefined,
  ) => {
    updateMeshGeometryElevations(terrainMeshRef.current, draftFloor);
    if (layerEditMode !== TopologyLayerEditMode.FLOOR) {
      updateMeshGeometryElevations(roofMeshRef.current, draftRoof);
    }
  }, [layerEditMode, updateMeshGeometryElevations]);

  const updateTopologyStroke = useCallback((
    currentCenter: { x: number; y: number },
    previousStroke: typeof topologyStrokeRef.current,
  ) => {
    const brushRadiusWorld =
      previousStroke?.brushRadiusWorld ??
      brushRadiusToWorldRadius(brushRadius, globals.TILE_INGAME_SIZE);
    const floorSnapshot =
      previousStroke?.floorSnapshot ?? cloneHeightArray(terrainData.YCrd?.[1000]?.obj);

    if (!floorSnapshot || floorSnapshot.length === 0) {
      return null;
    }

    const roofSnapshot =
      previousStroke?.roofSnapshot ?? cloneHeightArray(terrainData.YCrd?.[1001]?.obj);
    const lineStart = previousStroke?.lastPoint;
    const nextPixels = calculateBrushPixels({
      centerX: currentCenter.x,
      centerY: currentCenter.y,
      radius: brushRadiusWorld,
      brushMode,
      valueMode,
      value: topologyValue,
      header,
      globals,
      tileSize: globals.TILE_INGAME_SIZE,
      lineStart,
      lineEnd: currentCenter,
    });
    const pixels = mergeBrushPixels([
      previousStroke?.pixels ?? [],
      nextPixels,
    ]);
    const draft = applyTopologyBrushToSnapshot(
      floorSnapshot,
      roofSnapshot,
      pixels,
      {
        centerX: currentCenter.x,
        centerY: currentCenter.y,
        radius: brushRadiusWorld,
        brushMode,
        valueMode,
        value: topologyValue,
        header,
        globals,
        tileSize: globals.TILE_INGAME_SIZE,
        lineStart,
        lineEnd: currentCenter,
      },
      layerEditMode,
      dualEditMode,
    );

    return {
      floorSnapshot,
      roofSnapshot,
      draftFloor: draft.floor,
      draftRoof: draft.roof,
      pixels,
      brushRadiusWorld,
      lastPoint: currentCenter,
    };
  }, [
    brushMode,
    brushRadius,
    dualEditMode,
    globals,
    header,
    layerEditMode,
    terrainData,
    topologyValue,
    valueMode,
  ]);

  const handlePointerMove = useCallback((event: Event<string, unknown>) => {
    // Handle item dragging
    if (dragItemRef.current !== null && setItemData && hasPointProperty(event)) {
      const worldX = event.point.x;
      const worldZ = event.point.z;
      const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;
      const itemIdx = dragItemRef.current;
      setItemData((data) => {
        if (!data) return;
        const item = data.Itms[1000]?.obj?.[itemIdx];
        if (!item) return;
        item.x = Math.round(worldX / scale);
        item.z = Math.round(worldZ / scale);
      });
      return;
    }

    if (!isEditingTopology || !terrainMeshRef.current) return;

    if (hasPointProperty(event)) {
      setIntersectionPoint({
        x: event.point.x,
        y: event.point.y,
        z: event.point.z,
      });

      // Calculate affected pixels for preview
      const tileCoords = worldToTile(event.point.x, event.point.z, globals.TILE_INGAME_SIZE);
      const currentCenter = {
        x: tileCoords.x * globals.TILE_INGAME_SIZE,
        y: tileCoords.z * globals.TILE_INGAME_SIZE,
      };
      if (isEditing && topologyStrokeRef.current) {
        event.stopPropagation?.();
        const nextStroke = updateTopologyStroke(currentCenter, topologyStrokeRef.current);
        if (!nextStroke) {
          return;
        }
        topologyStrokeRef.current = nextStroke;
        lastBrushCenterRef.current = currentCenter;
        applyDraftToMeshes(nextStroke.draftFloor, nextStroke.draftRoof);
      }
    }
  }, [
    applyDraftToMeshes,
    globals,
    isEditing,
    isEditingTopology,
    setItemData,
    updateTopologyStroke,
  ]);

  const handlePointerDown = useCallback((event: Event<string, unknown>) => {
    if (!isEditingTopology) return;
    if (
      hasPointProperty(event) &&
      typeof event.nativeEvent?.button === "number" &&
      event.nativeEvent.button !== 0
    ) {
      return;
    }
    if (hasNativePointerEvent(event) && event.nativeEvent?.shiftKey) {
      return;
    }
    
    if (hasPointProperty(event) && terrainData.YCrd?.[1000]?.obj) {
      event.stopPropagation?.();
      setIsEditing(true);
      
      // Apply brush
      const tileCoords = worldToTile(event.point.x, event.point.z, globals.TILE_INGAME_SIZE);
      const currentCenter = {
        x: tileCoords.x * globals.TILE_INGAME_SIZE,
        y: tileCoords.z * globals.TILE_INGAME_SIZE,
      };
      const stroke = updateTopologyStroke(currentCenter, null);
      if (!stroke) {
        setIsEditing(false);
        return;
      }
      topologyStrokeRef.current = stroke;
      lastBrushCenterRef.current = currentCenter;
      applyDraftToMeshes(stroke.draftFloor, stroke.draftRoof);
    }
  }, [
    applyDraftToMeshes,
    globals.TILE_INGAME_SIZE,
    isEditingTopology,
    terrainData,
    updateTopologyStroke,
  ]);

  /** Called when a user starts dragging an item in the 3D view. */
  const handleItemPointerDown = useCallback((itemIdx: number) => {
    if (!setItemData) return;
    dragItemRef.current = itemIdx;
    setDraggingItemIdx(itemIdx);
  }, [setItemData]);

  const handlePointerUp = useCallback(() => {
    // Clear item drag
    if (dragItemRef.current !== null) {
      dragItemRef.current = null;
      setDraggingItemIdx(null);
      setTopologyVersion((v) => v + 1);
      return;
    }
    if (topologyStrokeRef.current && setTerrainData) {
      const completedStroke = topologyStrokeRef.current;
      setTerrainData((data) => {
        if (!data.YCrd?.[1000]?.obj) {
          return;
        }

        data.YCrd[1000].obj = completedStroke.draftFloor;
        if (completedStroke.draftRoof && data.YCrd?.[1001]?.obj) {
          data.YCrd[1001].obj = completedStroke.draftRoof;
        }
      });
    }
    topologyStrokeRef.current = null;
    setIsEditing(false);
    lastBrushCenterRef.current = null;
    // Increment topologyVersion so FenceGeometry/ItemGeometry re-read terrain heights.
    setTopologyVersion((v) => v + 1);
  }, [setTerrainData]);

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
