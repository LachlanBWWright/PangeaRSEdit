import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { BlockHistoryUpdate } from "@/data/globals/history";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { editorDataHistoryAtom, recordEditorDataHistoryAtom } from "./editorDataHistory";

function snapshot(x: number): AtomicLevelData {
  return {
    headerData: { Hedr: { 1000: { name: "Header", order: 0, obj: { version: 1, numItems: 1, mapWidth: 4, mapHeight: 4, tileSize: 16, minY: 0, maxY: 50, numSplines: 0, numFences: 0, numTilePages: 0, numTiles: 16, numUniqueSupertiles: 0, numWaterPatches: 0, numCheckpoints: 0 } } } },
    itemData: { Itms: { 1000: { name: "Terrain Items List", order: 0, obj: [{ x, z: 8, type: 0, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }] } } },
    liquidData: null, fenceData: null, splineData: null, terrainData: null,
  };
}

describe("editor history recording", () => {
  it("consumes an undo suppression without removing the redo branch", () => {
    const store = createStore();
    const original = snapshot(8);
    const moved = snapshot(24);
    store.set(recordEditorDataHistoryAtom, original);
    store.set(recordEditorDataHistoryAtom, { ...original });
    expect(store.get(editorDataHistoryAtom).items).toHaveLength(1);
    store.set(recordEditorDataHistoryAtom, moved);
    store.set(editorDataHistoryAtom, (current) => ({ ...current, index: 0 }));
    store.set(BlockHistoryUpdate, true);
    store.set(recordEditorDataHistoryAtom, original);
    expect(store.get(BlockHistoryUpdate)).toBe(false);
    expect(store.get(editorDataHistoryAtom)).toEqual({ items: [original, moved], index: 0 });
    store.set(editorDataHistoryAtom, (current) => ({ ...current, index: 1 }));
    store.set(BlockHistoryUpdate, true);
    store.set(recordEditorDataHistoryAtom, moved);
    expect(store.get(editorDataHistoryAtom)).toEqual({ items: [original, moved], index: 1 });
  });

  it("replaces redo only after a new edit and limits retained snapshots", () => {
    const store = createStore();
    const original = snapshot(8);
    store.set(recordEditorDataHistoryAtom, original);
    store.set(recordEditorDataHistoryAtom, snapshot(24));
    store.set(editorDataHistoryAtom, (current) => ({ ...current, index: 0 }));
    const next = snapshot(32);
    store.set(recordEditorDataHistoryAtom, next);
    expect(store.get(editorDataHistoryAtom)).toEqual({ items: [original, next], index: 1 });
    for (let index = 0; index < 55; index++) store.set(recordEditorDataHistoryAtom, snapshot(index));
    expect(store.get(editorDataHistoryAtom).items).toHaveLength(50);
    expect(store.get(editorDataHistoryAtom).index).toBe(49);
  });
});
