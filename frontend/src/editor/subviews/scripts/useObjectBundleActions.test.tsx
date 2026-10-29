import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { getDefaultStore } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample, replaceScriptWorkspace, scriptWorkspaceStoreAtom, upsertScriptSourceFile, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { buildScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { importedAsset, importedAssetId, importedAttachment, importedModelPath } from "./scriptObjectImport.fixtures";
import { useObjectBundleActions } from "./useObjectBundleActions";

const originalBridge = window.pangeaDesktop;
afterEach(() => { window.pangeaDesktop = originalBridge; });

function setup() {
  const initial = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
  const definition = initial.customObjects[0];
  if (!definition) return null;
  const incoming: ScriptWorkspaceState = { ...initial,
    customObjects: [{ ...definition, assetId: importedAssetId, visual: { kind: "customDisplayGroup", modelPath: importedModelPath, modelObject: 0, scale: 1, slot: 1 } }],
    assets: { [importedModelPath]: { path: importedModelPath, sourceName: "robot.bg3d", bytes: new Uint8Array([1]) } } };
  const bytes = buildScriptDefinitionBundle(incoming, importedAttachment);
  if (bytes.isErr()) return null;
  const file = new File([], "robot.zip");
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.value.slice().buffer });
  const state: { workspace: ScriptWorkspaceState; actions: ReturnType<typeof useObjectBundleActions> | null } = { workspace: initial, actions: null };
  const store = getDefaultStore();
  store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, initial));
  const onError = vi.fn();
  const persisted = vi.fn();
  function Harness() {
    const [workspace, setWorkspace] = useState(initial);
    const actions = useObjectBundleActions({ workspace, persist: (next) => { persisted(next); store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, next)); setWorkspace(next); }, onSelect: vi.fn(), onError });
    state.actions = actions;
    state.workspace = workspace;
    return null;
  }
  const root = createRoot(document.createElement("div"));
  return { state, initial, root, Harness, file, onError, persisted, store };
}

describe("editable object import transaction", () => {
  it("rolls back the desktop transaction when source edits arrive during restoration", async () => {
    const fixture = setup();
    if (!fixture) { expect.fail("Could not build object fixture"); return; }
    const deferred: { resolve?: (value: unknown) => void; promise?: Promise<unknown> } = {};
    deferred.promise = new Promise<unknown>((resolve) => { deferred.resolve = resolve; });
    const request = vi.fn(async (input: { operation: string }) => input.operation === "assets.import-reversible"
      ? deferred.promise : { ok: true, value: [] });
    window.pangeaDesktop = { request, onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
    await act(async () => { fixture.root.render(<fixture.Harness />); });
    await act(async () => { await fixture.state.actions?.readBundle(fixture.file); });
    let operation: Promise<void> | undefined;
    await act(async () => { operation = fixture.state.actions?.importBundle("replace"); });
    const edited = upsertScriptSourceFile(fixture.initial, fixture.initial.activeFilePath, "return { edited = true }");
    fixture.store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, edited));
    await act(async () => {
      deferred.resolve?.({ ok: true, value: { id: "33333333-3333-4333-8333-333333333333", assets: [importedAsset] } });
      await operation;
    });
    expect(fixture.persisted).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith({ operation: "assets.undo-import", id: "33333333-3333-4333-8333-333333333333" });
    expect(fixture.onError).toHaveBeenCalledWith("Workspace changed during import. No import was applied; review the current workspace and retry.");
    await act(async () => { fixture.root.unmount(); });
  });
  it("restores desktop sources before publishing and undoes both stores", async () => {
    const fixture = setup();
    if (!fixture) { expect.fail("Could not build object fixture"); return; }
    let undoBlocked = true;
    const request = vi.fn(async (input: { operation: string }) => input.operation === "assets.undo-import" && undoBlocked
      ? { ok: false, error: { code: "conflict", message: "Authoring source changed after import" } } : ({ ok: true, value:
      input.operation === "assets.list" ? [] : input.operation === "assets.import-reversible"
        ? { id: "33333333-3333-4333-8333-333333333333", assets: [importedAsset] } : [] }));
    window.pangeaDesktop = { request, onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
    await act(async () => { fixture.root.render(<fixture.Harness />); });
    await act(async () => { await fixture.state.actions?.readBundle(fixture.file); });
    await act(async () => { await fixture.state.actions?.importBundle("replace"); });
    expect(fixture.state.workspace.customObjects[0]?.assetId).toBe(importedAssetId);
    expect(fixture.state.workspace.authoringAssets).toEqual(importedAttachment);
    expect(request).toHaveBeenCalledWith({ operation: "assets.import-reversible", attachment: importedAttachment });
    await act(async () => { await fixture.state.actions?.undoImport(); });
    expect(fixture.onError).toHaveBeenCalledWith("Authoring source changed after import");
    expect(fixture.state.workspace.customObjects[0]?.assetId).toBe(importedAssetId);
    expect(fixture.state.actions?.canUndo).toBe(true);
    undoBlocked = false;
    await act(async () => { await fixture.state.actions?.undoImport(); });
    expect(fixture.state.workspace.customObjects).toEqual(fixture.initial.customObjects);
    expect(request).toHaveBeenCalledWith({ operation: "assets.undo-import", id: "33333333-3333-4333-8333-333333333333" });
    expect(fixture.state.actions?.canUndo).toBe(false);
    await act(async () => { fixture.root.unmount(); });
  });

  it("rolls back a completed desktop import after the workspace unmounts", async () => {
    const fixture = setup();
    if (!fixture) { expect.fail("Could not build object fixture"); return; }
    const deferred: { resolve?: (value: unknown) => void; promise?: Promise<unknown> } = {};
    deferred.promise = new Promise<unknown>((resolve) => { deferred.resolve = resolve; });
    const request = vi.fn(async (input: { operation: string }) => input.operation === "assets.import-reversible"
      ? deferred.promise : { ok: true, value: [] });
    window.pangeaDesktop = { request, onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
    await act(async () => { fixture.root.render(<fixture.Harness />); });
    await act(async () => { await fixture.state.actions?.readBundle(fixture.file); });
    let operation: Promise<void> | undefined;
    await act(async () => { operation = fixture.state.actions?.importBundle("replace"); });
    await act(async () => { fixture.root.unmount(); });
    deferred.resolve?.({ ok: true, value: { id: "33333333-3333-4333-8333-333333333333", assets: [importedAsset] } });
    await operation;
    expect(fixture.persisted).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith({ operation: "assets.undo-import", id: "33333333-3333-4333-8333-333333333333" });
  });

  it("retains the review and original workspace if desktop restoration fails", async () => {
    const fixture = setup();
    if (!fixture) { expect.fail("Could not build object fixture"); return; }
    window.pangeaDesktop = { request: async (input) => input.operation === "assets.list" ? { ok: true, value: [] }
      : { ok: false, error: { code: "io", message: "Source folder is read-only" } }, onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
    await act(async () => { fixture.root.render(<fixture.Harness />); });
    await act(async () => { await fixture.state.actions?.readBundle(fixture.file); });
    await act(async () => { await fixture.state.actions?.importBundle("replace"); });
    expect(fixture.persisted).not.toHaveBeenCalled();
    expect(fixture.state.actions?.pending).not.toBeNull();
    expect(fixture.state.actions?.importing).toBe(false);
    expect(fixture.onError).toHaveBeenCalledWith("Source folder is read-only");
    await act(async () => { fixture.root.unmount(); });
  });
});
