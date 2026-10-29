import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import { createBlankLevel, getDefaultDimensions } from "@/data/levelTemplates";
import { OttoGlobals, BugdomGlobals, Bugdom2Globals, NanosaurGlobals, Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals, MightyMikeGlobals } from "@/data/globals/globals";
import { ClickToAddItem, CustomObjectToPlaceAtom, SelectedCustomPlacementAtom, SelectedItem } from "@/data/items/itemSelectionState";
import { addPlacedItem } from "@/editor/canvas/konvaViewState";
import { sampleItemTerrainHeight } from "./itemTerrainHeight";
import { placementWorldPosition } from "../scripts/scriptPlacementCoordinates";
import { createScriptWorkspaceContext, loadScriptSample, moveCustomPlacement } from "../scripts/scriptWorkspaceState";
import { buildLevelPlacementSpawns } from "../scripts/scriptLevelRouting";
import { inspectCustomObjectPlacementAtom, startCustomObjectPlacementAtom } from "../scripts/scriptPlacementNavigation";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";

const games = [OttoGlobals, BugdomGlobals, Bugdom2Globals, NanosaurGlobals, Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals, MightyMikeGlobals];

describe.each(games)("$GAME_NAME shared native/custom placement", (globals) => {
  it("retains native item defaults and map coordinates", () => {
    const blank = createBlankLevel(globals.GAME_TYPE, getDefaultDimensions(globals.GAME_TYPE));
    expect(blank.isOk()).toBe(true);
    if (blank.isErr()) return;
    const items = blank.value.itemData;
    const count = items.Itms[1000].obj.length;
    addPlacedItem(items, 37, 91, 3);
    expect(items.Itms[1000].obj[count]).toEqual({ x: 37, z: 91, type: 3, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 });
    const context = createScriptWorkspaceContext(globals, 0);
    expect(placementWorldPosition(context.gameId, { x: globals.TILE_SIZE, y: 42, z: globals.TILE_SIZE * 2 }))
      .toEqual({ x: globals.TILE_INGAME_SIZE, y: 42, z: globals.TILE_INGAME_SIZE * 2 });
  });
});

describe("custom item terrain and runtime coordinates", () => {
  it("uses native triangle surfaces instead of minimum height or bilinear interpolation", () => {
    const blank = createBlankLevel(OttoGlobals.GAME_TYPE, { width: 16, height: 16 });
    expect(blank.isOk()).toBe(true);
    if (blank.isErr()) return;
    const { headerData, terrainData } = blank.value;
    const stride = headerData.Hedr[1000].obj.mapWidth + 1;
    terrainData.YCrd[1000].obj[0] = 0;
    terrainData.YCrd[1000].obj[1] = 100;
    terrainData.YCrd[1000].obj[stride] = 100;
    terrainData.YCrd[1000].obj[stride + 1] = 0;
    const height = sampleItemTerrainHeight(8, 8, headerData, terrainData, OttoGlobals);
    expect(height).toBe(100 * OttoGlobals.TILE_INGAME_SIZE / headerData.Hedr[1000].obj.tileSize);
    expect(sampleItemTerrainHeight(-8, -8, headerData, terrainData, OttoGlobals)).toBe(0);
  });

  it("converts a canvas placement to the matching native world location once", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const placement = workspace.levels[context.levelKey]?.customPlacements[0];
    expect(placement).toBeDefined();
    if (!placement) return;
    const moved = moveCustomPlacement(workspace, placement.id, { x: 16, y: 160, z: 32 });
    expect(buildLevelPlacementSpawns(moved, "onLevelStart").join("\n")).toContain("{ x = 225, y = 160, z = 450 }");
  });
});

describe("item selection and repeat placement", () => {
  it("enters placement from either object library without retaining a native selection", () => {
    const store = createStore();
    store.set(SelectedItem, 5);
    store.set(ClickToAddItem, 3);
    store.set(startCustomObjectPlacementAtom, "new-object");
    expect(store.get(SelectedItem)).toBeUndefined();
    expect(store.get(ClickToAddItem)).toBeUndefined();
    expect(store.get(CustomObjectToPlaceAtom)).toBe("new-object");
    expect(store.get(ActiveView)).toBe(View.items);
    store.set(inspectCustomObjectPlacementAtom, "existing-placement");
    expect(store.get(SelectedCustomPlacementAtom)).toBe("existing-placement");
    expect(store.get(CustomObjectToPlaceAtom)).toBeNull();
    expect(store.get(ActiveView)).toBe(View.items);
  });

  it("switches selection synchronously and clears custom selection with native canvas deselection", () => {
    const store = createStore();
    store.set(SelectedItem, 5);
    store.set(SelectedCustomPlacementAtom, "object-one");
    expect(store.get(SelectedItem)).toBeUndefined();
    store.set(SelectedItem, 7);
    expect(store.get(SelectedCustomPlacementAtom)).toBeNull();
    store.set(SelectedCustomPlacementAtom, "object-two");
    store.set(SelectedItem, undefined);
    expect(store.get(SelectedCustomPlacementAtom)).toBeNull();
  });

  it("keeps only one add mode and ignores cleanup from the previous picker", () => {
    const store = createStore();
    store.set(ClickToAddItem, 3);
    store.set(CustomObjectToPlaceAtom, "new-object");
    expect(store.get(ClickToAddItem)).toBeUndefined();
    store.set(ClickToAddItem, undefined);
    expect(store.get(CustomObjectToPlaceAtom)).toBe("new-object");
    store.set(ClickToAddItem, 9);
    store.set(CustomObjectToPlaceAtom, null);
    expect(store.get(ClickToAddItem)).toBe(9);
    expect(store.get(CustomObjectToPlaceAtom)).toBeNull();
  });
});
