import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createStore, Provider } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import type { DesktopBridge, HostRequest, ProjectFile, ProjectSnapshot } from "@pangea/desktop-contracts";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace, replaceScriptWorkspace, scriptWorkspaceStoreAtom, upsertScriptSourceFile } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { desktopActiveDocumentAtom, desktopConflictOpenAtom, desktopExternalProjectAtom, desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";
import { useDesktopProjectScripts } from "./useDesktopProjectScripts";

const context = createScriptWorkspaceContext(OttoGlobals, null);
function ScriptBinding() { useDesktopProjectScripts(context); return null; }
let root: Root | null = null;
const originalBridge = window.pangeaDesktop;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  window.pangeaDesktop = originalBridge;
  vi.unstubAllGlobals();
});

it("saves standalone script edits without rewriting terrain and keeps conflict review available", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const store = createStore();
  let snapshot: ProjectSnapshot = {
    folder: "/project", revision: "initial", recoveryAvailable: false,
    manifest: { kind: "pangea-editor-project", version: 1, game: "OttoMatic", name: "Scripts", levels: [
      { id: "one", name: "First level", baseLevel: 0, primary: ".pangea/levels/one/level.ter.rsrc", files: [".pangea/levels/one/level.ter.rsrc"] },
    ] }, files: [{ path: ".pangea/levels/one/level.ter.rsrc", hash: "terrain", size: 10 }],
  };
  let disk: ProjectFile[] = [];
  const requests: HostRequest[] = [];
  const bridge: DesktopBridge = {
    request: async (request) => {
      requests.push(request);
      if (request.operation === "host.dirty") return { ok: true, value: undefined };
      if (request.operation === "project.read") return { ok: true, value: disk.filter((file) => request.paths.includes(file.path)) };
      if (request.operation === "project.save") {
        disk = request.files;
        snapshot = { ...snapshot, revision: "saved", manifest: request.manifest, files: [
          ...snapshot.files.filter((file) => !file.path.startsWith("Data/Scripts/")),
          ...disk.map((file) => ({ path: file.path, hash: "saved", size: file.bytes.length })),
        ] };
        return { ok: true, value: snapshot };
      }
      return { ok: false, error: { code: "test", message: "Unexpected desktop request" } };
    }, onProjectChange: () => () => undefined, onTransfer: () => () => undefined,
  };
  window.pangeaDesktop = bridge;
  store.set(desktopProjectAtom, snapshot);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Provider store={store}><ScriptBinding /></Provider>));
  expect(Object.keys(store.get(scriptWorkspaceStoreAtom))).toHaveLength(1);
  const source = "Data/Scripts/src/helpers/project.lua";
  await act(async () => {
    const workspace = ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), context);
    store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace(store.get(scriptWorkspaceStoreAtom), upsertScriptSourceFile(workspace, source, "return { value = 42 }")));
  });
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  await act(async () => store.get(desktopActiveDocumentAtom)?.save());
  expect(store.get(desktopProjectDirtyAtom)).toBe(false);
  expect(disk.some((file) => file.path === source)).toBe(true);
  expect(disk.some((file) => file.path.startsWith(".pangea/levels/"))).toBe(false);
  expect(store.get(desktopProjectAtom)?.manifest.levels).toHaveLength(1);
  const saves = requests.filter((request) => request.operation === "project.save").length;
  await act(async () => store.set(desktopExternalProjectAtom, { ...snapshot, revision: "external" }));
  await act(async () => store.get(desktopActiveDocumentAtom)?.save());
  expect(store.get(desktopConflictOpenAtom)).toBe(true);
  expect(requests.filter((request) => request.operation === "project.save")).toHaveLength(saves);
});

const initialProject: ProjectSnapshot = {
  folder: "/project", revision: "initial", recoveryAvailable: false, files: [],
  manifest: { kind: "pangea-editor-project", version: 1, game: "OttoMatic", name: "Scripts", levels: [] },
};

async function mountBinding(save: (request: Extract<HostRequest, { operation: "project.save" }>) => Promise<unknown>) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const store = createStore();
  window.pangeaDesktop = {
    request: async (request) => {
      if (request.operation === "project.save") return save(request);
      if (request.operation === "project.read") return { ok: true, value: [] };
      if (request.operation === "host.dirty") return { ok: true, value: undefined };
      return { ok: false, error: { code: "unexpected", message: "Unexpected request" } };
    },
    onProjectChange: () => () => undefined, onTransfer: () => () => undefined,
  };
  store.set(desktopProjectAtom, initialProject);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Provider store={store}><ScriptBinding /></Provider>));
  return store;
}

async function editSource(store: ReturnType<typeof createStore>, text: string) {
  await act(async () => {
    const workspace = ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), context);
    store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace(store.get(scriptWorkspaceStoreAtom),
      upsertScriptSourceFile(workspace, "Data/Scripts/src/user.lua", text)));
  });
}

it("retains dirty edits after a failed save and permits retry", async () => {
  const save = vi.fn(async () => ({ ok: false, error: { code: "filesystem", message: "Disk full" } }));
  const store = await mountBinding(save);
  await editSource(store, "return { value = 1 }");
  const document = store.get(desktopActiveDocumentAtom);
  expect(document?.kind).toBe("scripts");
  await act(async () => document?.save());
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  expect(store.get(desktopProjectAtom)?.revision).toBe("initial");
  await act(async () => store.get(desktopActiveDocumentAtom)?.save());
  expect(save).toHaveBeenCalledTimes(2);
});

it("keeps edits made while saving dirty and prevents duplicate in-flight saves", async () => {
  let complete: (reply: unknown) => void = () => undefined;
  const pending = new Promise<unknown>((resolve) => { complete = resolve; });
  const save = vi.fn(async () => pending);
  const store = await mountBinding(save);
  await editSource(store, "return { value = 1 }");
  let saving: Promise<void> | undefined;
  await act(async () => {
    saving = store.get(desktopActiveDocumentAtom)?.save();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  });
  await act(async () => store.get(desktopActiveDocumentAtom)?.save());
  expect(save).toHaveBeenCalledTimes(1);
  await editSource(store, "return { value = 2 }");
  await act(async () => {
    complete({ ok: true, value: { ...initialProject, revision: "saved" } });
    await saving;
  });
  expect(store.get(desktopProjectAtom)?.revision).toBe("saved");
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  const workspace = ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), context);
  expect(workspace.sourceFiles["Data/Scripts/src/user.lua"]?.content).toContain("value = 2");
});
