import { act, createElement, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider, createStore, useAtom } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { createBlankLevel } from "@/data/levelTemplates";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { createScriptWorkspaceContext, ensureScriptWorkspace, moveCustomPlacement, placeCustomObject, removeCustomPlacement, replaceScriptWorkspace, scriptWorkspaceStoreAtom, type ScriptWorkspaceState } from "../subviews/scripts/scriptWorkspaceState";
import { useEditorDocumentHistory } from "./useEditorDocumentHistory";

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });

function mountHistory(data: AtomicLevelData) {
  const controller = {
    data, workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0)),
    history: { dataHistory: { items: [], index: 0 }, undoData: vi.fn(), redoData: vi.fn() } satisfies ReturnType<typeof useEditorDocumentHistory>,
    updateData: vi.fn<(data: AtomicLevelData) => void>(), updateScripts: vi.fn<(update: (state: ScriptWorkspaceState) => ScriptWorkspaceState) => void>(),
    setLevel: vi.fn<(level: number) => void>(), setFile: vi.fn<(file: File) => void>(),
  };
  // The harness exposes the production hook and real atom updates, without rendering substitute application UI.
  function Harness() {
    const [currentData, setData] = useState(data);
    const [file, setFile] = useState(() => new File([], "level.ter"));
    const [level, setLevel] = useState(0);
    const [store, setStore] = useAtom(scriptWorkspaceStoreAtom);
    const context = useMemo(() => createScriptWorkspaceContext(OttoGlobals, level), [level]);
    const workspace = useMemo(() => ensureScriptWorkspace(store, context), [store, context]);
    const history = useEditorDocumentHistory({ data: currentData, setData, workspace, context, file, game: OttoGlobals.GAME_TYPE, level });
    Object.assign(controller, { data: currentData, workspace, history, updateData: setData, setLevel, setFile,
      updateScripts: (update: (state: ScriptWorkspaceState) => ScriptWorkspaceState) => setStore((current) => replaceScriptWorkspace(current, update(ensureScriptWorkspace(current, context)))),
    });
    return null;
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(createElement(Provider, { store: createStore() }, createElement(Harness))));
  cleanups.push(() => act(() => root.unmount()));
  return controller;
}

describe("production document history integration", () => {
  it("interleaves native edits, placement, drag, parameters and deletion through actual undo/redo handlers", () => {
    const blank = createBlankLevel(OttoGlobals.GAME_TYPE, { width: 16, height: 16 });
    expect(blank.isOk()).toBe(true);
    if (blank.isErr()) return;
    const editor = mountHistory(blank.value);
    const native = { ...editor.data, itemData: { Itms: { 1000: { name: "Terrain Items List", obj: [], order: 1 } } } } satisfies AtomicLevelData;
    act(() => editor.updateData(native));
    act(() => editor.updateScripts((state) => placeCustomObject(state, "beacon", "Beacon", { x: 100, y: 0, z: 100 })));
    const id = editor.workspace.levels["0"]?.customPlacements[0]?.id;
    expect(id).toBeDefined();
    if (!id) return;
    act(() => editor.updateScripts((state) => moveCustomPlacement(state, id, { x: 200, y: 0, z: 300 })));
    act(() => editor.updateScripts((state) => ({ ...state, levels: Object.fromEntries(Object.entries(state.levels).map(([key, level]) => [key, { ...level,
      customPlacements: level.customPlacements.map((placement) => ({ ...placement, parameterOverrides: { speed: 4 } })),
    }])) })));
    act(() => editor.updateScripts((state) => removeCustomPlacement(state, id)));
    expect(editor.history.dataHistory.items).toHaveLength(6);
    act(() => editor.history.undoData());
    expect(editor.workspace.levels["0"]?.customPlacements[0]?.parameterOverrides).toEqual({ speed: 4 });
    act(() => { editor.history.undoData(); editor.history.undoData(); });
    expect(editor.workspace.levels["0"]?.customPlacements[0]?.parameterOverrides).toBeUndefined();
    expect(editor.workspace.levels["0"]?.customPlacements[0]?.position).toEqual({ x: 100, y: 0, z: 100 });
    act(() => editor.history.undoData());
    expect(editor.workspace.levels["0"]?.customPlacements).toHaveLength(0);
    expect(editor.data.itemData).toBe(native.itemData);
    act(() => editor.history.undoData());
    expect(editor.data.itemData).toBe(blank.value.itemData);
    act(() => editor.history.redoData());
    expect(editor.data.itemData).toBe(native.itemData);
    act(() => editor.updateScripts((state) => placeCustomObject(state, "beacon", "Branch", { x: 400, y: 0, z: 400 })));
    expect(editor.history.dataHistory.items).toHaveLength(3);
    act(() => editor.history.redoData());
    expect(editor.workspace.levels["0"]?.customPlacements[0]?.label).toBe("Branch");
  });

  it("skips build/diagnostic refreshes and resets at asset, file and level boundaries", () => {
    const blank = createBlankLevel(OttoGlobals.GAME_TYPE, { width: 16, height: 16 });
    if (blank.isErr()) return;
    const editor = mountHistory(blank.value);
    act(() => editor.updateScripts((state) => ({ ...state, statusLog: ["built"], diagnostics: [{ category: "source-validation", code: "test", severity: "warning", message: "diagnostic", filePath: "test.lua", line: 1, column: 1 }] })));
    expect(editor.history.dataHistory.items).toHaveLength(1);
    act(() => editor.updateScripts((state) => placeCustomObject(state, "beacon", "Beacon", { x: 100, y: 0, z: 100 })));
    expect(editor.history.dataHistory.items).toHaveLength(2);
    act(() => editor.updateScripts((state) => ({ ...state, assets: { "Data/asset": { path: "Data/asset", sourceName: "asset", bytes: new Uint8Array([1]) } } })));
    expect(editor.history.dataHistory.items).toHaveLength(1);
    act(() => editor.history.undoData());
    expect(editor.workspace.assets["Data/asset"]).toBeDefined();
    act(() => editor.updateScripts((state) => placeCustomObject(state, "beacon", "Other", { x: 200, y: 0, z: 100 })));
    act(() => editor.setLevel(1));
    expect(editor.history.dataHistory.items).toHaveLength(1);
    act(() => editor.updateScripts((state) => placeCustomObject(state, "beacon", "New level", { x: 300, y: 0, z: 100 })));
    act(() => editor.setFile(new File([], "other.ter")));
    expect(editor.history.dataHistory.items).toHaveLength(1);
  });
});
