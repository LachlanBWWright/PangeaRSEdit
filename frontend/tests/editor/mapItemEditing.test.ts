import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import { Globals, OttoGlobals, MightyMikeGlobals, BugdomGlobals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import type { HeaderData, TerrainData, ItemData, TerrainItem } from "@/python/structSpecs/LevelTypes";
import { centerMapItemStage, customPlacementMapPoint, customPlacementWorldPoint, moveCustomPlacementOnMap, snapMapItemPoint } from "@/editor/subviews/items/mapItemCoordinates";
import { selectMapItems, setMapItemSelectionAtom, mapItemSelectionAtom, type MapItemTarget } from "@/editor/subviews/items/mapItemSelection";
import { boundMapItemDelta } from "@/editor/subviews/items/mapItemEdits";
import { createMapItemOperations } from "@/editor/subviews/items/useMapItemOperations";
import { applyTerrainBehavior, createScriptWorkspaceContext, ensureScriptWorkspace, replaceScriptWorkspace, scriptWorkspaceStoreAtom, upsertScriptSourceFile, type ScriptCustomObjectPlacement } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { getLevelState } from "@/editor/subviews/scripts/scriptWorkspaceHelpers";
import { arrangeMapItemPoints } from "@/editor/subviews/items/mapItemArrangement";

const header: HeaderData = {Hedr: {1000: {name: "Header", order: 0, obj: {version: 1, numItems: 2, mapWidth: 4, mapHeight: 4, tileSize: 16, minY: 0, maxY: 50, numSplines: 0, numFences: 0, numTilePages: 0, numTiles: 16, numUniqueSupertiles: 0, numWaterPatches: 0, numCheckpoints: 0}}}};
const terrain: TerrainData = {alis: {}, _metadata: {file_attributes: 0, junk1: 0, junk2: 0}, Atrb: {1000: {name: "Tile Attribute Data", order: 0, obj: []}}, ItCo: {1000: {name: "Terrain Items Color Array", order: 0, data: ""}}, YCrd: {1000: {name: "Floor&Ceiling Y Coords", order: 0, obj: Array.from({length: 25}, (_value, index) => index % 5)}}};
const item: TerrainItem = {x: 8, z: 8, type: 0, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0};
const native: MapItemTarget = {kind: "native", index: 0};
const custom: MapItemTarget = {kind: "custom", id: "placement-beacon-1"};
const placement: ScriptCustomObjectPlacement = {id: "placement-beacon-1", objectId: "beacon", label: "Beacon", levelKey: "default", position: {x: 112.5, y: 17.03125, z: 112.5}, parameters: {speed: 2}};

describe("unified map item editing", () => {
  it("focuses map items at the current zoom through persisted stage coordinates", () => {
    expect(centerMapItemStage({x: 200, z: 300}, {width: 800, height: 600}, {x: -10, y: -20, scale: 2})).toEqual({x: 0, y: -300, scale: 2});
  });
  it("aligns and distributes a mixed group without changing the other coordinate", () => {
    const points = [{x: 10, z: 7}, {x: 80, z: 20}, {x: 30, z: 35}];
    expect(arrangeMapItemPoints(points, "alignZ")).toEqual([{x: 10, z: 21}, {x: 80, z: 21}, {x: 30, z: 21}]);
    expect(arrangeMapItemPoints(points, "distributeX")).toEqual([{x: 10, z: 7}, {x: 80, z: 20}, {x: 45, z: 35}]);
  });
  it("preserves a mixed group when starting a drag and toggles additive selection", () => {
    const group = selectMapItems([native], custom, true);
    expect(selectMapItems(group, native, false, true)).toEqual(group);
    expect(selectMapItems(group, native, true, true)).toEqual([custom]);
  });
  it("keeps world units explicit across game scales and maps Mighty Mike XY", () => {
    expect(customPlacementMapPoint({x: 225, y: 50, z: 450}, OttoGlobals)).toEqual({x: 16, z: 32});
    expect(customPlacementMapPoint({x: 160, y: 50, z: 320}, BugdomGlobals)).toEqual({x: 32, z: 64});
    const point = customPlacementWorldPoint({x: 12, z: 25}, MightyMikeGlobals, header, terrain);
    expect(customPlacementMapPoint(point, MightyMikeGlobals)).toEqual({x: 12, z: 25});
    expect(point.z).toBe(0);
  });
  it("samples terrain and preserves elevation above ground during a custom move", () => {
    expect(customPlacementWorldPoint({x: 8, z: 8}, OttoGlobals, header, terrain).y).toBe(7.03125);
    const moved = moveCustomPlacementOnMap(placement, {x: 24, z: 8}, OttoGlobals, header, terrain);
    expect(moved.position).toEqual({x: 337.5, y: 31.09375, z: 112.5});
    expect(moved.parameters).toEqual({speed: 2});
  });
  it("bounds group movement as one delta and applies grid snapping", () => {
    expect(boundMapItemDelta([{x: 3, z: 5}, {x: 20, z: 30}], {x: -10, z: 50}, {width: 64, height: 64})).toEqual({x: -3, z: 33});
    expect(snapMapItemPoint({x: 23, z: 9}, 16, true)).toEqual({x: 16, z: 16});
  });
  it("commits mixed moves once and duplicates/deletes native and custom items together", () => {
    const store = createStore();
    store.set(Globals, OttoGlobals);
    const context = createScriptWorkspaceContext(OttoGlobals, null);
    const workspace = ensureScriptWorkspace({}, context);
    const level = getLevelState(workspace);
    store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, {...workspace, customObjects: [{id: "beacon", label: "Beacon", sourceFilePath: "Data/Scripts/beacon.lua", exportName: "Beacon", tags: [], compatibility: "preview-ready", description: "Beacon", visual: {kind: "none"}, collision: {kind: "none"}}], levels: {[context.levelKey]: {...level, customPlacements: [{...placement, levelKey: context.levelKey}]}}}));
    let data: ItemData | null = {Itms: {1000: {name: "Terrain Items List", order: 0, obj: [item]}}};
    let commits = 0;
    const operations = () => createMapItemOperations({itemData: data, headerData: header, terrainData: terrain, setItemData: next => {
      if (typeof next === "function") return;
      data = next; commits++;
    }}, store);
    store.set(setMapItemSelectionAtom, [native, custom]);
    const first = operations();
    first.move(first.capture(), {x: 4, z: 0});
    expect(commits).toBe(1);
    expect(data?.Itms[1000].obj[0]?.x).toBe(12);
    expect(getLevelState(ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), context)).customPlacements[0]?.position.x).toBe(168.75);
    operations().command("duplicate");
    expect(commits).toBe(2);
    expect(data?.Itms[1000].obj).toHaveLength(2);
    expect(store.get(mapItemSelectionAtom)).toHaveLength(2);
    operations().command("delete");
    expect(commits).toBe(3);
    expect(data?.Itms[1000].obj).toHaveLength(1);
    expect(getLevelState(ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), context)).customPlacements).toHaveLength(1);
  });
  it("copies native Lua behavior across levels and aborts unsafe duplicate predicates atomically", () => {
    const store = createStore();
    store.set(Globals, OttoGlobals);
    store.set(LevelNumber, 1);
    const sourceContext = createScriptWorkspaceContext(OttoGlobals, 1);
    const source = applyTerrainBehavior(ensureScriptWorkspace({}, sourceContext), "sample.item-trigger-logger", "Native", {itemType: item.type, position: {x: item.x, y: 0, z: item.z}, flags: item.flags, params: [0, 0, 0, 0]});
    const binding = getLevelState(source).terrainBindings[0];
    expect(binding).toBeDefined();
    if (!binding) return;
    const file = source.sourceFiles[binding.sourceFilePath];
    expect(file).toBeDefined();
    if (!file) return;
    store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, upsertScriptSourceFile(source, file.path, file.content + "\n-- edited behavior body")));
    let data: ItemData | null = {Itms: {1000: {name: "Terrain Items List", order: 0, obj: [item]}}};
    let commits = 0;
    const operations = () => createMapItemOperations({itemData: data, headerData: header, terrainData: terrain, setItemData: next => {
      if (typeof next === "function") return;
      data = next; commits++;
    }}, store);
    store.set(setMapItemSelectionAtom, [native]);
    operations().command("copy");
    store.set(LevelNumber, 2);
    data = {Itms: {1000: {name: "Terrain Items List", order: 0, obj: []}}};
    operations().command("paste");
    expect(commits).toBe(1);
    const targetContext = createScriptWorkspaceContext(OttoGlobals, 2);
    const target = ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), targetContext);
    const pasted = getLevelState(target).terrainBindings.find(entry => entry.signature.position.x === 24 && entry.signature.position.z === 24);
    expect(pasted?.signature.position).toEqual({x: 24, y: 0, z: 24});
    if (!pasted) return;
    const pastedFile = target.sourceFiles[pasted.sourceFilePath];
    expect(pastedFile?.content).toContain("-- edited behavior body");
    if (!pastedFile) return;
    const unsafe = upsertScriptSourceFile(target, pastedFile.path, pastedFile.content.replace("local function matchesTarget(ctx)", "local function customMatch(ctx)"));
    store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace(store.get(scriptWorkspaceStoreAtom), unsafe));
    const beforeData = data;
    const beforeStore = store.get(scriptWorkspaceStoreAtom);
    operations().command("duplicate");
    expect(commits).toBe(1);
    expect(data).toBe(beforeData);
    expect(store.get(scriptWorkspaceStoreAtom)).toBe(beforeStore);
  });
});
