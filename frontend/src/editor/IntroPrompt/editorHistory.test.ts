import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { splitLevelData } from "@/data/utils/levelDataUtils";
import { createScriptWorkspaceContext, ensureScriptWorkspace, upsertScriptSourceFile } from "../subviews/scripts/scriptWorkspaceState";
import { moveEditorHistory, recordEditorHistory, restoreScriptAuthoring, type EditorHistoryItem } from "./editorHistory";

function initial(): EditorHistoryItem {
  return { ...splitLevelData(null), scripts: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0)) };
}

function nativeItems(): NonNullable<EditorHistoryItem["itemData"]> {
  return { Itms: { 1000: { name: "Terrain Items List", obj: [], order: 0 } } };
}

describe("shared map and script history", () => {
  it("undoes interleaved native edits, placements and source edits in chronological order", () => {
    const start = initial();
    const native = { ...start, itemData: nativeItems() };
    const placed = { ...native, scripts: {
      ...native.scripts,
      levels: { "0": { globalHooks: [], terrainBindings: [], splineBindings: [], mapItemBindings: [], terrainReplacements: [], mapReplacements: [], splineReplacements: [], customPlacements: [{
        id: "placed", objectId: "beacon", label: "Beacon", levelKey: "0", position: { x: 100, y: 0, z: 200 },
      }] } },
    } };
    const edited = { ...placed, scripts: upsertScriptSourceFile(placed.scripts, "Data/Scripts/src/test.lua", "return {}", "user") };
    let history = recordEditorHistory({ items: [], index: 0 }, start);
    for (const item of [native, placed, edited]) history = recordEditorHistory(history, item);
    expect(history.items).toEqual([start, native, placed, edited]);
    expect(history.items[history.index - 1]?.scripts.levels["0"]?.customPlacements).toHaveLength(1);
    expect(history.items[history.index - 2]?.scripts.levels["0"]?.customPlacements).toHaveLength(0);
    expect(history.items[history.index - 3]?.itemData).toBeNull();
    let document: EditorHistoryItem = edited;
    for (const expected of [placed, native, start]) {
      const target = moveEditorHistory(history, -1);
      expect(target).not.toBeNull();
      if (!target) return;
      history = target.history;
      document = { ...target.item, scripts: restoreScriptAuthoring(document.scripts, target.item.scripts) };
      expect(document.itemData).toBe(expected.itemData);
      expect(document.scripts.levels).toEqual(expected.scripts.levels);
    }
    expect(moveEditorHistory(history, -1)).toBeNull();
    const redo = moveEditorHistory(history, 1);
    expect(redo?.item).toBe(native);
    history = { items: [start, native, placed, edited], index: 3 };
    const branched = recordEditorHistory({ ...history, index: 1 }, edited);
    expect(branched.items).toEqual([start, native, edited]);
  });

  it("does not record navigation, save markers, diagnostics or generated entry refreshes", () => {
    const start = initial();
    const sources = Object.fromEntries(Object.entries(start.scripts.sourceFiles).map(([path, source]) => [path, {
      ...source, savedContent: "saved", content: source.role === "generated-entry" ? "generated" : source.content,
    }]));
    const history = recordEditorHistory({ items: [], index: 0 }, start);
    const result = recordEditorHistory(history, { ...start, scripts: {
      ...start.scripts, activeFilePath: "other.lua", sourceFiles: sources,
      statusLog: ["built"], compiledFiles: {},
    } });
    expect(result).toBe(history);
  });

  it("starts a new baseline at asset transactions so document undo cannot disagree with imported disk files", () => {
    const start = initial();
    const native = { ...start, itemData: nativeItems() };
    const history = recordEditorHistory(recordEditorHistory({ items: [], index: 0 }, start), native);
    const imported = { ...native, scripts: { ...native.scripts, assets: {
      "Data/custom.bg3d": { path: "Data/custom.bg3d", sourceName: "custom.bg3d", bytes: new Uint8Array([1, 2]) },
    } } };
    const next = recordEditorHistory(history, imported);
    expect(next).toEqual({ items: [imported], index: 0 });
    const edited = { ...imported, itemData: nativeItems() };
    expect(recordEditorHistory(next, edited).items).toEqual([imported, edited]);
  });

  it("restores authoring while retaining current disk-save baselines and runtime results", () => {
    const start = initial();
    const changed = upsertScriptSourceFile(start.scripts, "Data/Scripts/src/custom.lua", "new source", "user");
    const saved = { ...changed, statusLog: ["latest build"], sourceFiles: {
      ...changed.sourceFiles,
      "Data/Scripts/src/custom.lua": { path: "Data/Scripts/src/custom.lua", language: "lua", readOnly: false, role: "user", content: "new source", savedContent: "on disk" },
    } } satisfies typeof changed;
    const restored = restoreScriptAuthoring(saved, { ...changed, sourceFiles: {
      ...changed.sourceFiles,
      "Data/Scripts/src/custom.lua": { ...saved.sourceFiles["Data/Scripts/src/custom.lua"], content: "old source" },
    } });
    expect(restored.sourceFiles["Data/Scripts/src/custom.lua"]?.content).toBe("old source");
    expect(restored.sourceFiles["Data/Scripts/src/custom.lua"]?.savedContent).toBe("on disk");
    expect(restored.statusLog).toEqual(["latest build"]);
  });
});
