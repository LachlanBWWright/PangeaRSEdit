import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Ray } from "three";
import type { Mesh } from "three";
import type { Event } from "three";
import type { Updater } from "use-immer";
import { useAtom } from "jotai";
import type {
  FenceData,
  HeaderData,
  ItemData,
  LiquidData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import {
  TopologyDualEditMode,
  TopologyLayerEditMode,
  TopologyValueMode,
} from "@/data/tiles/tileAtoms";
import {
  applyTopologyBrushWithTarget,
  brushRadiusToWorldRadius,
  calculateBrushPixels,
  cloneHeightArray,
  worldToTile,
} from "../utils/topologyBrushUtils";
import { hasNativePointerEvent, hasPointProperty } from "./threeExportHelpers";
import { SelectedItem } from "@/data/items/itemAtoms";
import {
  createThreeItemDragState,
  getDraggedItemPlacement,
  getItemDragPlanePoint,
  updateTerrainItemPlacement,
} from "./threeItemInteraction";
import {
  createThreeEntityDragState,
  getDraggedEntityPlacement,
  type ThreeEntityDragState,
  type ThreeEntityKind,
} from "./threeEntityInteraction";

interface UseThreeTopologyEditingArgs {
  globals: GlobalsInterface;
  header: HeaderData["Hedr"][1000]["obj"];
  terrainData: TerrainData;
  itemData: ItemData | null;
  fenceData: FenceData | null;
  liquidData: LiquidData | null;
  splineData: SplineData | null;
  setTerrainData?: Updater<TerrainData>;
  setItemData?: Updater<ItemData | null>;
  setFenceData?: Updater<FenceData | null>;
  setLiquidData?: Updater<LiquidData | null>;
  setSplineData?: Updater<SplineData | null>;
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
  itemData,
  fenceData,
  liquidData,
  splineData,
  setTerrainData,
  setItemData,
  setFenceData,
  setLiquidData,
  setSplineData,
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
  const [hoveredItemIdx, setHoveredItemIdx] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useAtom(SelectedItem);

  const lastBrushCenterRef = useRef<{ x: number; y: number } | null>(null);
  const dragItemRef = useRef<ReturnType<typeof createThreeItemDragState> | null>(
    null,
  );
  const dragEntityRef = useRef<ThreeEntityDragState | null>(null);
  const [draggingEntity, setDraggingEntity] = useState<ThreeEntityDragState | null>(null);
  const topologyStrokeRef = useRef<{
    floorSnapshot: number[];
    roofSnapshot: number[] | undefined;
    draftFloor: number[];
    draftRoof: number[] | undefined;
    pixelsByKey: Map<string, ReturnType<typeof calculateBrushPixels>[number]>;
    changedIndices: Set<number>;
    lastChangedIndices: Set<number>;
    brushRadiusWorld: number;
    lastPoint: { x: number; y: number };
  } | null>(null);
  const intersectionPointRef = useRef<typeof intersectionPoint>(null);
  const intersectionFrameRef = useRef<number | null>(null);

  const scheduleIntersectionPointUpdate = useCallback(() => {
    if (intersectionFrameRef.current !== null) return;

    intersectionFrameRef.current = requestAnimationFrame(() => {
      intersectionFrameRef.current = null;
      setIntersectionPoint(intersectionPointRef.current);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (intersectionFrameRef.current !== null) {
        cancelAnimationFrame(intersectionFrameRef.current);
      }
    };
  }, []);

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
    (
      mesh: Mesh | null,
      heights: number[] | undefined,
      changedIndices: Iterable<number>,
      recomputeNormals: boolean,
    ) => {
      if (!mesh || !mesh.geometry || !heights) return;

      const positionAttr = mesh.geometry.attributes.position;
      if (!positionAttr) return;

      for (const index of changedIndices) {
        if (index < 0 || index >= positionAttr.count) continue;
        const height = heights[index];
        if (height === undefined) continue;
        positionAttr.setZ(index, height * yScale);
      }

      positionAttr.needsUpdate = true;
      if (recomputeNormals) {
        mesh.geometry.computeVertexNormals();
      }
    },
    [yScale],
  );

  const applyDraftToMeshes = useCallback(
    (
      draftFloor: number[],
      draftRoof: number[] | undefined,
      changedIndices: Iterable<number>,
      recomputeNormals = false,
    ) => {
      updateMeshGeometryElevations(
        terrainMeshRef.current,
        draftFloor,
        changedIndices,
        recomputeNormals,
      );
      if (layerEditMode !== TopologyLayerEditMode.FLOOR) {
        updateMeshGeometryElevations(
          roofMeshRef.current,
          draftRoof,
          changedIndices,
          recomputeNormals,
        );
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
      if (
        previousStroke?.lastPoint.x === currentCenter.x &&
        previousStroke.lastPoint.y === currentCenter.y
      ) {
        return previousStroke;
      }
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
      const draftFloor = previousStroke?.draftFloor ?? cloneHeightArray(floorSnapshot) ?? [];
      const draftRoof = previousStroke?.draftRoof ?? cloneHeightArray(roofSnapshot);
      const pixelsByKey = previousStroke?.pixelsByKey ?? new Map();
      const changedIndices = previousStroke?.changedIndices ?? new Set<number>();
      const lastChangedIndices = new Set<number>();
      const brushParams = {
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
      };

      nextPixels.forEach((pixel) => {
        const key = `${String(Math.floor(pixel.x / globals.TILE_INGAME_SIZE))},${String(
          Math.floor(pixel.y / globals.TILE_INGAME_SIZE),
        )}`;
        const previousPixel = pixelsByKey.get(key);
        if (previousPixel && pixel.distance >= previousPixel.distance) return;

        if (previousPixel) {
          const xTile = Math.floor(pixel.x / globals.TILE_INGAME_SIZE);
          const yTile = Math.floor(pixel.y / globals.TILE_INGAME_SIZE);
          const index = yTile * (header.mapWidth + 1) + xTile;
          const originalFloor = floorSnapshot[index];
          if (originalFloor !== undefined) draftFloor[index] = originalFloor;
          if (draftRoof && roofSnapshot?.[index] !== undefined) {
            draftRoof[index] = roofSnapshot[index] ?? draftRoof[index];
          }
        }

        pixelsByKey.set(key, pixel);
        applyTopologyBrushWithTarget(
          draftFloor,
          draftRoof,
          [pixel],
          brushParams,
          layerEditMode,
          dualEditMode,
        );
        const xTile = Math.floor(pixel.x / globals.TILE_INGAME_SIZE);
        const yTile = Math.floor(pixel.y / globals.TILE_INGAME_SIZE);
        const index = yTile * (header.mapWidth + 1) + xTile;
        if (index >= 0 && index < draftFloor.length) {
          changedIndices.add(index);
          lastChangedIndices.add(index);
        }
      });

      return {
        floorSnapshot,
        roofSnapshot,
        draftFloor,
        draftRoof,
        pixelsByKey,
        changedIndices,
        lastChangedIndices,
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
        const dragState = dragItemRef.current;
        setItemData((data) => {
          if (!data || !dragState) return;
          const nextPlacement = getDraggedItemPlacement(
            dragState,
            scale,
            worldX,
            worldZ,
          );
          updateTerrainItemPlacement(
            data,
            dragState.itemIndex,
            nextPlacement.x,
            nextPlacement.z,
          );
        });
        return;
      }

      if (dragEntityRef.current && hasPointProperty(event)) {
        const drag = dragEntityRef.current;
        const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;
        const placement = getDraggedEntityPlacement(drag, scale, event.ray);
        if (!placement) return;
        if (drag.kind === "fence" && setFenceData) {
          setFenceData((data) => {
            const nub = data?.FnNb[1000 + drag.entityIndex]?.obj[drag.pointIndex];
            if (nub) { nub[0] = placement.x; nub[1] = placement.z; }
          });
        }
        if (drag.kind === "water" && setLiquidData) {
          setLiquidData((data) => {
            const body = data?.Liqd[1000].obj[drag.entityIndex];
            const nub = body?.nubs[drag.pointIndex];
            if (nub) { nub[0] = placement.x; nub[1] = placement.z; }
            if (body && drag.pointIndex === -1) {
              body.hotSpotX = placement.x;
              body.hotSpotZ = placement.z;
            }
          });
        }
        if (drag.kind === "spline" && setSplineData) {
          setSplineData((data) => {
            const nub = data?.SpNb[1000 + drag.entityIndex]?.obj[drag.pointIndex];
            if (nub) { nub.x = placement.x; nub.z = placement.z; }
          });
        }
        return;
      }

      if (!isEditingTopology || !terrainMeshRef.current) return;

      if (hasPointProperty(event)) {
        intersectionPointRef.current = {
          x: event.point.x,
          y: event.point.y,
          z: event.point.z,
        };
        scheduleIntersectionPointUpdate();
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
          applyDraftToMeshes(
            nextStroke.draftFloor,
            nextStroke.draftRoof,
            nextStroke.lastChangedIndices,
          );
        }
      }
    },
    [
      applyDraftToMeshes,
      globals,
      isEditing,
      isEditingTopology,
      setFenceData,
      setLiquidData,
      setItemData,
      setSplineData,
      terrainMeshRef,
      updateTopologyStroke,
      scheduleIntersectionPointUpdate,
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
        applyDraftToMeshes(
          stroke.draftFloor,
          stroke.draftRoof,
          stroke.lastChangedIndices,
        );
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
    (
      itemIdx: number,
      pointerId: number,
      ray: Ray,
    ) => {
      const item = itemData?.Itms?.[1000]?.obj?.[itemIdx];
      if (!setItemData || !item) return;
      const dragPlanePoint = getItemDragPlanePoint(ray);
      if (!dragPlanePoint) return;
      setSelectedItem(itemIdx);
      dragItemRef.current = createThreeItemDragState(
        itemIdx,
        pointerId,
        item.x,
        item.z,
        dragPlanePoint.x,
        dragPlanePoint.z,
      );
      setDraggingItemIdx(itemIdx);
    },
    [itemData, setItemData, setSelectedItem],
  );

  const handleEntityPointerDown = useCallback(
    (
      kind: ThreeEntityKind,
      entityIndex: number,
      pointIndex: number,
      pointerId: number,
      startX: number,
      startZ: number,
      ray: Ray,
    ) => {
      const canEdit =
        (kind === "fence" && fenceData && setFenceData) ||
        (kind === "water" && liquidData && setLiquidData) ||
        (kind === "spline" && splineData && setSplineData);
      if (!canEdit) return;
      const drag = createThreeEntityDragState(
        kind, entityIndex, pointIndex, pointerId, startX, startZ, ray,
      );
      if (!drag) return;
      dragEntityRef.current = drag;
      setDraggingEntity(drag);
    },
    [fenceData, liquidData, setFenceData, setLiquidData, setSplineData, splineData],
  );

  const handlePointerUp = useCallback(() => {
    if (dragItemRef.current !== null) {
      dragItemRef.current = null;
      setDraggingItemIdx(null);
      setTopologyVersion((v) => v + 1);
      return;
    }
    if (dragEntityRef.current !== null) {
      dragEntityRef.current = null;
      setDraggingEntity(null);
      setTopologyVersion((v) => v + 1);
      return;
    }

    if (topologyStrokeRef.current) {
      const completedStroke = topologyStrokeRef.current;
      applyDraftToMeshes(
        completedStroke.draftFloor,
        completedStroke.draftRoof,
        completedStroke.changedIndices,
        true,
      );
      if (setTerrainData) {
        setTerrainData((data) => {
          if (!data.YCrd?.[1000]?.obj) return;

          data.YCrd[1000].obj = completedStroke.draftFloor;
          if (completedStroke.draftRoof && data.YCrd?.[1001]?.obj) {
            data.YCrd[1001].obj = completedStroke.draftRoof;
          }
        });
      }
    }

    topologyStrokeRef.current = null;
    setIsEditing(false);
    lastBrushCenterRef.current = null;
    setTopologyVersion((v) => v + 1);
  }, [applyDraftToMeshes, setTerrainData]);

  useEffect(() => {
    if (!isEditing) return;

    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerUp, isEditing]);

  return {
    intersectionPoint,
    isEditing,
    isShiftHeld,
    topologyVersion,
    draggingItemIdx,
    hoveredItemIdx,
    selectedItemIdx: selectedItem ?? null,
    displacementMagnitude,
    displacementDirection,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handleItemPointerDown,
    handleEntityPointerDown,
    draggingEntity,
    handleItemPointerEnter: setHoveredItemIdx,
    handleItemPointerLeave: () => setHoveredItemIdx(null),
  };
}
