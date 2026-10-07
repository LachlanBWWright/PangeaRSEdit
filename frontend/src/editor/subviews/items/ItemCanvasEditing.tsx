import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { Layer, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { Updater } from "use-immer";
import type { StageData } from "@/editor/canvas/OttoMaticKonvaView";
import { ClickToAddItem } from "@/data/items/itemAtoms";
import { CustomObjectToPlaceAtom } from "../scripts/scriptPlacementSelectionState";
import { useWindowKeyDown } from "@/hooks/useWindowKeyDown";
import { boundMapItemDelta, type MapItemSnapshot } from "./mapItemEdits";
import { centerMapItemStage, customPlacementMapPoint, isMapItemPointInside, snapMapItemPoint, type MapItemPoint } from "./mapItemCoordinates";
import { draggedItemPaletteEntryAtom, type ItemPaletteEntry } from "./itemPaletteState";
import { MapItemEditingContext, mapItemCommandHandlerAtom, type MapItemCommand, type MapItemEditingController } from "./mapItemEditingContext";
import { mapItemDragPreviewAtom, mapItemFocusRequestAtom, mapItemSelectionAtom, mapItemSnapAtom, selectMapItemAtom, setMapItemSelectionAtom, type MapItemTarget } from "./mapItemSelection";
import { useMapItemOperations, type MapItemEditingData } from "./useMapItemOperations";

interface ItemCanvasBridge {
  readonly register: (layer: Konva.Layer | null) => void;
  readonly ghost: MapItemPoint | null;
  readonly valid: boolean;
}
const ItemCanvasBridgeContext = createContext<ItemCanvasBridge | null>(null);

export function ItemCanvasStageBridge() {
  const bridge = useContext(ItemCanvasBridgeContext);
  const layerRef = useRef<Konva.Layer>(null);
  useEffect(() => { bridge?.register(layerRef.current); }, [bridge]);
  if (!bridge) return null;
  return <Layer ref={layerRef} listening={false}>
    {bridge.ghost && <>
      <Rect x={bridge.ghost.x - 12} y={bridge.ghost.z - 12} width={24} height={24}
        stroke={bridge.valid ? "#facc15" : "#ef4444"} strokeWidth={2} fill="#111827" opacity={0.75} />
      <Text x={bridge.ghost.x + 16} y={bridge.ghost.z - 8} text={bridge.valid ? "Place item" : "Outside map"}
        fill={bridge.valid ? "#facc15" : "#ef4444"} fontSize={12} />
    </>}
  </Layer>;
}

interface DragGesture {
  readonly target: MapItemTarget;
  readonly origin: MapItemPoint;
  readonly snapshot: MapItemSnapshot;
  readonly selection: readonly MapItemTarget[];
}

function pointForTarget(target: MapItemTarget, snapshot: MapItemSnapshot,
  globals: ReturnType<typeof useMapItemOperations>["globals"]): MapItemPoint | null {
  if (target.kind === "native") {
    const entry = snapshot.native.find((candidate) => candidate.index === target.index);
    return entry ? { x: entry.item.x, z: entry.item.z } : null;
  }
  const placement = snapshot.custom.find((candidate) => candidate.id === target.id);
  return placement ? customPlacementMapPoint(placement.position, globals) : null;
}

function commandForKey(event: KeyboardEvent): MapItemCommand | null {
  if (event.key === "Delete" || event.key === "Backspace") return "delete";
  if (!event.ctrlKey && !event.metaKey) return null;
  switch (event.key.toLowerCase()) {
    case "a": return "selectAll";
    case "c": return "copy";
    case "v": return "paste";
    case "d": return "duplicate";
    default: return null;
  }
}

export function ItemCanvasEditing(props: MapItemEditingData & {
  readonly enabled: boolean; readonly children: ReactNode;
  readonly stage: StageData; readonly setStage: Updater<StageData>;
}) {
  const operations = useMapItemOperations(props);
  const {stage: stageData, setStage, enabled} = props;
  const nativeType = useAtomValue(ClickToAddItem);
  const customId = useAtomValue(CustomObjectToPlaceAtom);
  const snap = useAtomValue(mapItemSnapAtom);
  const focus = useAtomValue(mapItemFocusRequestAtom);
  const focusedSequence = useRef<number | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const dragRef = useRef<DragGesture | null>(null);
  const [ghost, setGhost] = useState<MapItemPoint | null>(null);
  const armed: ItemPaletteEntry | null = customId !== null ? { kind: "custom", objectId: customId }
    : nativeType !== undefined ? { kind: "native", type: nativeType } : null;
  const register = useCallback((layer: Konva.Layer | null) => { stageRef.current = layer?.getStage() ?? null; }, []);

  const controller = useMemo<MapItemEditingController>(() => {
    const deltaFor = (gesture: DragGesture, point: MapItemPoint) => {
      const snapped = snapMapItemPoint(point, operations.globals.TILE_SIZE, operations.store.get(mapItemSnapAtom));
      return boundMapItemDelta(operations.points(gesture.snapshot),
        { x: snapped.x - gesture.origin.x, z: snapped.z - gesture.origin.z }, operations.bounds);
    };
    return {
      startDrag(target) {
        operations.store.set(selectMapItemAtom, { target, forDrag: true });
        const snapshot = operations.capture();
        const origin = pointForTarget(target, snapshot, operations.globals);
        dragRef.current = origin ? { target, snapshot, origin, selection: operations.store.get(mapItemSelectionAtom) } : null;
      },
      previewDrag(_target, point) {
        const gesture = dragRef.current;
        if (!gesture) return;
        const delta = deltaFor(gesture, point);
        operations.store.set(mapItemDragPreviewAtom, { selection: gesture.selection, ...delta });
      },
      finishDrag(_target, point) {
        const gesture = dragRef.current;
        dragRef.current = null;
        if (gesture) operations.move(gesture.snapshot, deltaFor(gesture, point));
        operations.store.set(mapItemDragPreviewAtom, null);
      },
      cancelDrag() {
        dragRef.current = null;
        operations.store.set(mapItemDragPreviewAtom, null);
        stageRef.current?.find(".map-item").forEach((node) => node.stopDrag());
      },
    };
  }, [operations]);

  useEffect(() => {
    if (!props.enabled) return;
    operations.store.set(mapItemCommandHandlerAtom, () => operations.command);
    return () => {
      operations.store.set(mapItemCommandHandlerAtom, null);
      operations.store.set(mapItemDragPreviewAtom, null);
    };
  }, [operations, props.enabled]);

  useEffect(() => {
    if (!focus || !enabled || focusedSequence.current === focus.sequence) return;
    const stage = stageRef.current;
    if (!stage) return;
    operations.store.set(setMapItemSelectionAtom, [focus.target]);
    const point = pointForTarget(focus.target, operations.capture(), operations.globals);
    if (!point) return;
    focusedSequence.current = focus.sequence;
    setStage(centerMapItemStage(point, {width: stage.width(), height: stage.height()}, stageData));
  }, [focus, operations, enabled, stageData, setStage]);

  useWindowKeyDown(useCallback((event) => {
    if (!props.enabled || event.defaultPrevented || document.activeElement?.closest("input,textarea,select,[contenteditable=true],[role=textbox],[role=combobox],[role=menu],[role=listbox],[role=dialog]")) return;
    if (event.key === "Escape") {
      controller.cancelDrag();
      operations.store.set(ClickToAddItem, undefined);
      operations.store.set(CustomObjectToPlaceAtom, null);
      operations.store.set(draggedItemPaletteEntryAtom, null);
      setGhost(null); event.preventDefault(); return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { controller.cancelDrag(); return; }
    const command = commandForKey(event);
    if (command) { event.preventDefault(); operations.command(command); return; }
    const step = operations.store.get(mapItemSnapAtom) ? operations.globals.TILE_SIZE : event.shiftKey ? 10 : 1;
    const delta = event.key === "ArrowLeft" ? { x: -step, z: 0 }
      : event.key === "ArrowRight" ? { x: step, z: 0 }
      : event.key === "ArrowUp" ? { x: 0, z: -step }
      : event.key === "ArrowDown" ? { x: 0, z: step } : null;
    if (delta && operations.store.get(mapItemSelectionAtom).length > 0) {
      event.preventDefault(); operations.move(operations.capture(), delta);
    }
  }, [controller, operations, props.enabled]));

  const pointer = (event: MouseEvent | DragEvent): MapItemPoint | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    stage.setPointersPositions(event);
    const point = stage.getRelativePointerPosition();
    return point ? snapMapItemPoint({ x: point.x, z: point.y }, operations.globals.TILE_SIZE, snap) : null;
  };
  const bridge = { register, ghost, valid: ghost !== null && isMapItemPointInside(ghost, operations.bounds) };

  return <MapItemEditingContext.Provider value={controller}>
    <ItemCanvasBridgeContext.Provider value={bridge}>
      <div className="relative h-full w-full" onClickCapture={(event) => {
        if (!props.enabled || !armed) return;
        event.preventDefault(); event.stopPropagation();
        const point = pointer(event.nativeEvent);
        if (point && operations.place(armed, point)) {
          operations.store.set(setMapItemSelectionAtom, []);
        }
      }} onMouseMoveCapture={(event) => {
        if (props.enabled && armed) setGhost(pointer(event.nativeEvent));
      }} onMouseLeave={() => setGhost(null)} onDragOver={(event) => {
        if (!props.enabled || !operations.store.get(draggedItemPaletteEntryAtom)) return;
        event.preventDefault(); event.dataTransfer.dropEffect = "copy";
        setGhost(pointer(event.nativeEvent));
      }} onDrop={(event) => {
        const entry = operations.store.get(draggedItemPaletteEntryAtom);
        if (!props.enabled || !entry) return;
        event.preventDefault(); event.stopPropagation();
        const point = pointer(event.nativeEvent);
        if (point) operations.place(entry, point);
        operations.store.set(draggedItemPaletteEntryAtom, null); setGhost(null);
      }} onDoubleClickCapture={() => {
        if (props.enabled && !armed) operations.store.set(setMapItemSelectionAtom, []);
      }}>
        {props.children}
      </div>
    </ItemCanvasBridgeContext.Provider>
  </MapItemEditingContext.Provider>;
}
