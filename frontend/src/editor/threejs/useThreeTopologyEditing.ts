import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Mesh } from "three";
import type { Event } from "three";
import type { Updater } from "use-immer";
import type {
  HeaderData,
  ItemData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import {
  TopologyDualEditMode,
  TopologyLayerEditMode,
  TopologyValueMode,
} from "@/data/tiles/tileAtoms";
import {
  applyTopologyBrushToSnapshot,
  brushRadiusToWorldRadius,
  calculateBrushPixels,
  cloneHeightArray,
  mergeBrushPixels,
  worldToTile,
} from "../utils/topologyBrushUtils";
import { hasNativePointerEvent, hasPointProperty } from "./threeExportHelpers";

interface UseThreeTopologyEditingArgs {
  globals: GlobalsInterface;
  header: HeaderData["Hedr"][1000]["obj"];
  terrainData: TerrainData;
  setTerrainData?: Updater<TerrainData>;
  setItemData?: Updater<ItemData | null>;
  isEditingTopology: boolean;
  brushMode: number;
  dualEditMode: TopologyDualEditMode;
  layerEditMode: TopologyLayerEditMode;
  brushRadius: number;
  valueMode: number;
  topologyValue: number;
  yScale: number;
  terrainMeshRef: RefObject<Mesh | null>;
  roofMeshRef: RefObject<Mesh | null>;
}

export function useThreeTopologyEditing({
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
}: UseThreeTopologyEditingArgs) {
  const [intersectionPoint, setIntersectionPoint] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const [topologyVersion, setTopologyVersion] = useState(0);
  const [draggingItemIdx, setDraggingItemIdx] = useState<number | null>(null);

  const lastBrushCenterRef = useRef<{ x: number; y: number } | null>(null);
  const dragItemRef = useRef<number | null>(null);
  const topologyStrokeRef = useRef<{
    floorSnapshot: number[];
    roofSnapshot: number[] | undefined;
    draftFloor: number[];
    draftRoof: number[] | undefined;
    pixels: ReturnType<typeof calculateBrushPixels>;
    brushRadiusWorld: number;
    lastPoint: { x: number; y: number };
  } | null>(null);

  const setModeDisplacement =
    intersectionPoint === null
      ? Math.abs(topologyValue) * yScale
      : Math.abs(topologyValue * yScale - intersectionPoint.y);
  const displacementMagnitude =
    valueMode === TopologyValueMode.SET_VALUE
      ? setModeDisplacement
      : Math.abs(topologyValue) * yScale;
  const displacementDirection: "up" | "down" | undefined =
    topologyValue === 0 ? undefined : topologyValue < 0 ? "down" : "up";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") setIsShiftHeld(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") setIsShiftHeld(false);
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
      if (!mesh || !mesh.geometry || !heights) return;

      const positionAttr = mesh.geometry.attributes.position;
      if (!positionAttr) return;

      for (let index = 0; index < positionAttr.count; index++) {
        const height = heights[index];
        if (height === undefined) continue;
        positionAttr.setZ(index, height * yScale);
      }

      mesh.geometry.computeVertexNormals();
      positionAttr.needsUpdate = true;
    },
    [yScale],
  );

  const applyDraftToMeshes = useCallback(
    (draftFloor: number[], draftRoof: number[] | undefined) => {
      updateMeshGeometryElevations(terrainMeshRef.current, draftFloor);
      if (layerEditMode !== TopologyLayerEditMode.FLOOR) {
        updateMeshGeometryElevations(roofMeshRef.current, draftRoof);
      }
    },
    [layerEditMode, roofMeshRef, terrainMeshRef, updateMeshGeometryElevations],
  );

  const updateTopologyStroke = useCallback(
    (
      currentCenter: { x: number; y: number },
      previousStroke: typeof topologyStrokeRef.current,
    ) => {
      const brushRadiusWorld =
        previousStroke?.brushRadiusWorld ??
        brushRadiusToWorldRadius(brushRadius, globals.TILE_INGAME_SIZE);
      const floorSnapshot =
        previousStroke?.floorSnapshot ??
        cloneHeightArray(terrainData.YCrd?.[1000]?.obj);

      if (!floorSnapshot || floorSnapshot.length === 0) {
        return null;
      }

      const roofSnapshot =
        previousStroke?.roofSnapshot ??
        cloneHeightArray(terrainData.YCrd?.[1001]?.obj);
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
    },
    [
      brushMode,
      brushRadius,
      dualEditMode,
      globals,
      header,
      layerEditMode,
      terrainData,
      topologyValue,
      valueMode,
    ],
  );

  const handlePointerMove = useCallback(
    (event: Event<string, unknown>) => {
      if (
        dragItemRef.current !== null &&
        setItemData &&
        hasPointProperty(event)
      ) {
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
        const tileCoords = worldToTile(
          event.point.x,
          event.point.z,
          globals.TILE_INGAME_SIZE,
        );
        const currentCenter = {
          x: tileCoords.x * globals.TILE_INGAME_SIZE,
          y: tileCoords.z * globals.TILE_INGAME_SIZE,
        };

        if (isEditing && topologyStrokeRef.current) {
          event.stopPropagation?.();
          const nextStroke = updateTopologyStroke(
            currentCenter,
            topologyStrokeRef.current,
          );
          if (!nextStroke) return;

          topologyStrokeRef.current = nextStroke;
          lastBrushCenterRef.current = currentCenter;
          applyDraftToMeshes(nextStroke.draftFloor, nextStroke.draftRoof);
        }
      }
    },
    [
      applyDraftToMeshes,
      globals,
      isEditing,
      isEditingTopology,
      setItemData,
      terrainMeshRef,
      updateTopologyStroke,
    ],
  );

  const handlePointerDown = useCallback(
    (event: Event<string, unknown>) => {
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

        const tileCoords = worldToTile(
          event.point.x,
          event.point.z,
          globals.TILE_INGAME_SIZE,
        );
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
    },
    [
      applyDraftToMeshes,
      globals.TILE_INGAME_SIZE,
      isEditingTopology,
      terrainData,
      updateTopologyStroke,
    ],
  );

  const handleItemPointerDown = useCallback(
    (itemIdx: number) => {
      if (!setItemData) return;
      dragItemRef.current = itemIdx;
      setDraggingItemIdx(itemIdx);
    },
    [setItemData],
  );

  const handlePointerUp = useCallback(() => {
    if (dragItemRef.current !== null) {
      dragItemRef.current = null;
      setDraggingItemIdx(null);
      setTopologyVersion((v) => v + 1);
      return;
    }

    if (topologyStrokeRef.current && setTerrainData) {
      const completedStroke = topologyStrokeRef.current;
      setTerrainData((data) => {
        if (!data.YCrd?.[1000]?.obj) return;

        data.YCrd[1000].obj = completedStroke.draftFloor;
        if (completedStroke.draftRoof && data.YCrd?.[1001]?.obj) {
          data.YCrd[1001].obj = completedStroke.draftRoof;
        }
      });
    }

    topologyStrokeRef.current = null;
    setIsEditing(false);
    lastBrushCenterRef.current = null;
    setTopologyVersion((v) => v + 1);
  }, [setTerrainData]);

  return {
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
  };
}
