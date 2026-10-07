import { useStore } from "jotai";
import { useMemo } from "react";
import { toast } from "sonner";
import type { Updater } from "use-immer";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import type { HeaderData, ItemData, TerrainData, TerrainItem } from "@/python/structSpecs/LevelTypes";
import { createScriptWorkspaceContext, ensureScriptWorkspace, replaceScriptWorkspace, scriptWorkspaceStoreAtom, type ScriptCustomObjectPlacement, type ScriptWorkspaceState } from "../scripts/scriptWorkspaceState";
import { updateNativeItemBindingsAfterEdit } from "../scripts/scriptNativeItemEdits";
import { getLevelState } from "../scripts/scriptWorkspaceHelpers";
import { mapItemSelectionAtom, mapItemSnapAtom, setMapItemSelectionAtom, type MapItemTarget } from "./mapItemSelection";
import { boundMapItemDelta, captureMapItems, deleteMapNativeItems, moveMapNativeItems, nextCustomPlacementId, type MapItemSnapshot } from "./mapItemEdits";
import { customPlacementMapPoint, customPlacementWorldPoint, getMapItemBounds, moveCustomPlacementOnMap, snapMapItemPoint, type MapItemPoint } from "./mapItemCoordinates";
import { mapItemClipboardAtom, type MapItemCommand } from "./mapItemEditingContext";
import type { ItemPaletteEntry } from "./itemPaletteState";
import { arrangeMapItemPoints, type MapItemArrangement } from "./mapItemArrangement";
import { cloneNativeItemBindingsForPaste } from "../scripts/scriptNativeBindingClipboard";

export interface MapItemEditingData {
  readonly itemData: ItemData | null;
  readonly setItemData: Updater<ItemData | null>;
  readonly headerData: HeaderData;
  readonly terrainData: TerrainData;
}

function nativeIdentityMapping(items: readonly TerrainItem[]) {
  return items.map((_item, index) => ({ oldIndex: index, newIndex: index }));
}

export function createMapItemOperations(data: MapItemEditingData, store: ReturnType<typeof useStore>) {
  const globals = store.get(Globals);
  const context = createScriptWorkspaceContext(globals, store.get(LevelNumber) ?? null);
  const bounds = getMapItemBounds(data.headerData, globals);
  const items = data.itemData?.Itms[1000].obj ?? [];
  const readWorkspace = () => ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), context);
  const readPlacements = () => readWorkspace().levels[context.levelKey]?.customPlacements ?? [];
  const capture = () => captureMapItems(store.get(mapItemSelectionAtom), items, readPlacements());
  const points = (snapshot: MapItemSnapshot) => [...snapshot.native.map((entry) => ({ x: entry.item.x, z: entry.item.z })),
    ...snapshot.custom.map((placement) => customPlacementMapPoint(placement.position, globals))];

  const commit = (nextItems: readonly TerrainItem[], placements: readonly ScriptCustomObjectPlacement[],
    mapping: readonly { readonly oldIndex: number; readonly newIndex: number }[],
    clipboard?: {readonly source: ScriptWorkspaceState; readonly copies: readonly {sourceIndex: number; sourceItem: TerrainItem; targetIndex: number; targetItem: TerrainItem}[]}) => {
    const workspace = readWorkspace();
    const updated = updateNativeItemBindingsAfterEdit(workspace, items, nextItems, mapping);
    if (updated.isErr()) { toast.error(updated.error); return false; }
    const pasted = clipboard ? cloneNativeItemBindingsForPaste(clipboard.source, updated.value, clipboard.copies) : updated;
    if (pasted.isErr()) {toast.error(pasted.error); return false;}
    const level = getLevelState(pasted.value);
    const nextWorkspace = { ...pasted.value, levels: { ...pasted.value.levels,
      [context.levelKey]: { ...level, customPlacements: [...placements] } } };
    if (nextItems.length !== items.length || nextItems.some((item, index) => item !== items[index])) data.setItemData(data.itemData
      ? { ...data.itemData, Itms: { ...data.itemData.Itms, 1000: { ...data.itemData.Itms[1000], obj: [...nextItems] } } }
      : { Itms: { 1000: { name: "Terrain Items List", order: 0, obj: [...nextItems] } } });
    store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace(store.get(scriptWorkspaceStoreAtom), nextWorkspace));
    return true;
  };

  const move = (snapshot: MapItemSnapshot, requestedDelta: MapItemPoint) => {
    const delta = boundMapItemDelta(points(snapshot), requestedDelta, bounds);
    if (delta.x === 0 && delta.z === 0) return;
    const moved = new Map(snapshot.custom.map((placement) => {
      const point = customPlacementMapPoint(placement.position, globals);
      return [placement.id, moveCustomPlacementOnMap(placement,
        { x: point.x + delta.x, z: point.z + delta.z }, globals, data.headerData, data.terrainData)];
    }));
    commit(moveMapNativeItems(items, snapshot, delta), readPlacements().map((placement) => moved.get(placement.id) ?? placement), nativeIdentityMapping(items));
  };

  const paste = (snapshot: MapItemSnapshot, requestedDelta: MapItemPoint, sourceWorkspace: ScriptWorkspaceState) => {
    if (snapshot.native.length === 0 && snapshot.custom.length === 0) return;
    const workspace = readWorkspace();
    if (snapshot.custom.some((placement) => !workspace.customObjects.some((definition) => definition.id === placement.objectId))) {
      toast.error("A copied scripted item definition is missing from this project."); return;
    }
    const delta = boundMapItemDelta(points(snapshot), requestedDelta, bounds);
    const nextItems = [...items];
    const nextPlacements = [...readPlacements()];
    const selection: MapItemTarget[] = [];
    const mapping = nativeIdentityMapping(items);
    const copies: {sourceIndex: number; sourceItem: TerrainItem; targetIndex: number; targetItem: TerrainItem}[] = [];
    for (const entry of snapshot.native) {
      const newIndex = nextItems.length;
      const targetItem = {...entry.item, x: Math.round(entry.item.x + delta.x), z: Math.round(entry.item.z + delta.z)};
      nextItems.push(targetItem);
      copies.push({sourceIndex: entry.index, sourceItem: entry.item, targetIndex: newIndex, targetItem});
      selection.push({ kind: "native", index: newIndex });
    }
    for (const placement of snapshot.custom) {
      const point = customPlacementMapPoint(placement.position, globals);
      const moved = moveCustomPlacementOnMap(placement, { x: point.x + delta.x, z: point.z + delta.z }, globals, data.headerData, data.terrainData);
      const copied = { ...moved, id: nextCustomPlacementId(nextPlacements, placement.objectId), levelKey: context.levelKey };
      nextPlacements.push(copied);
      selection.push({ kind: "custom", id: copied.id });
    }
    if (commit(nextItems, nextPlacements, mapping, {source: sourceWorkspace, copies})) store.set(setMapItemSelectionAtom, selection);
  };

  const command = (action: MapItemCommand) => {
    const selection = store.get(mapItemSelectionAtom);
    if (action === "clear") { store.set(setMapItemSelectionAtom, []); return; }
    if (action === "selectAll") {
      const targets: MapItemTarget[] = [...items.map((_item, index): MapItemTarget => ({ kind: "native", index })),
        ...readPlacements().map((placement): MapItemTarget => ({ kind: "custom", id: placement.id }))];
      store.set(setMapItemSelectionAtom, targets); return;
    }
    if (action === "copy") { store.set(mapItemClipboardAtom, { game: globals.GAME_TYPE, snapshot: capture(), workspace: readWorkspace() }); return; }
    if (action === "duplicate") { paste(capture(), { x: globals.TILE_SIZE, z: globals.TILE_SIZE }, readWorkspace()); return; }
    if (action === "paste") {
      const clipboard = store.get(mapItemClipboardAtom);
      if (clipboard && clipboard.game === globals.GAME_TYPE) paste(clipboard.snapshot, { x: globals.TILE_SIZE, z: globals.TILE_SIZE }, clipboard.workspace);
      else if (clipboard) toast.error("Copy items from this game's map before pasting.");
      return;
    }
    if (action === "alignX" || action === "alignZ" || action === "distributeX" || action === "distributeZ") {
      arrange(action); return;
    }
    const nextItems = deleteMapNativeItems(items, selection);
    const mapping: { oldIndex: number; newIndex: number }[] = [];
    items.forEach((_item, oldIndex) => {
      if (!selection.some((target) => target.kind === "native" && target.index === oldIndex)) mapping.push({ oldIndex, newIndex: mapping.length });
    });
    const placements = readPlacements().filter((placement) => !selection.some((target) => target.kind === "custom" && target.id === placement.id));
    if (selection.length > 0 && commit(nextItems, placements, mapping)) store.set(setMapItemSelectionAtom, []);
  };

  const arrange = (action: MapItemArrangement) => {
    const snapshot = capture();
    const arranged = arrangeMapItemPoints(points(snapshot), action);
    const nativePositions = new Map(snapshot.native.map((entry, index) => [entry.index, arranged[index]]));
    const customPositions = new Map(snapshot.custom.map((placement, index) => [placement.id, arranged[snapshot.native.length + index]]));
    const nextItems = items.map((item, index) => {
      const point = nativePositions.get(index);
      return point ? {...item, x: point.x, z: point.z} : item;
    });
    const nextPlacements = readPlacements().map(placement => {
      const point = customPositions.get(placement.id);
      return point ? moveCustomPlacementOnMap(placement, point, globals, data.headerData, data.terrainData) : placement;
    });
    if (selectionSize(snapshot) > 1) commit(nextItems, nextPlacements, nativeIdentityMapping(items));
  };

  const place = (entry: ItemPaletteEntry, rawPoint: MapItemPoint) => {
    const point = snapMapItemPoint(rawPoint, globals.TILE_SIZE, store.get(mapItemSnapAtom));
    if (point.x < 0 || point.z < 0 || point.x >= bounds.width || point.z >= bounds.height) return false;
    if (entry.kind === "native") {
      const item: TerrainItem = { x: point.x, z: point.z, type: entry.type, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 };
      if (!commit([...items, item], readPlacements(), nativeIdentityMapping(items))) return false;
      store.set(setMapItemSelectionAtom, [{ kind: "native", index: items.length }]); return true;
    }
    const definition = readWorkspace().customObjects.find((candidate) => candidate.id === entry.objectId);
    if (!definition) return false;
    const placements = readPlacements();
    const placement: ScriptCustomObjectPlacement = { id: nextCustomPlacementId(placements, definition.id), objectId: definition.id,
      label: definition.label, levelKey: context.levelKey, position: customPlacementWorldPoint(point, globals, data.headerData, data.terrainData) };
    if (!commit(items, [...placements, placement], nativeIdentityMapping(items))) return false;
    store.set(setMapItemSelectionAtom, [{ kind: "custom", id: placement.id }]); return true;
  };

  return { capture, points, move, command, place, bounds, globals, store };
}

function selectionSize(snapshot: MapItemSnapshot): number {return snapshot.native.length + snapshot.custom.length;}

export function useMapItemOperations(data: MapItemEditingData) {
  const store = useStore();
  const {itemData, setItemData, headerData, terrainData} = data;
  return useMemo(() => createMapItemOperations({itemData, setItemData, headerData, terrainData}, store), [itemData, setItemData, headerData, terrainData, store]);
}
