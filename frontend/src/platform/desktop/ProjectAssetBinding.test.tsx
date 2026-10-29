import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createStore, Provider } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import type { ProjectSnapshot } from "@pangea/desktop-contracts";
import { ProjectAssetBinding } from "./ProjectAssetBinding";
import { ProjectConflict } from "./ProjectConflict";
import { desktopActiveDocumentAtom, desktopAssetDialogAtom, desktopConflictOpenAtom, desktopExternalProjectAtom, desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";

const path = "Assets/models/model.bg3d";
const snapshot: ProjectSnapshot = { folder: "/project", revision: "saved", recoveryAvailable: false,
  manifest: { kind: "pangea-editor-project", version: 1, name: "Asset project", game: "OttoMatic", levels: [] },
  files: [{ path, hash: "original", size: 1 }],
};
const deleted: ProjectSnapshot = { ...snapshot, revision: "deleted", files: [] };
let root: Root | null = null;
const originalBridge = window.pangeaDesktop;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  window.pangeaDesktop = originalBridge;
  vi.unstubAllGlobals();
});

function button(name: string) {
  return Array.from(document.querySelectorAll("button")).find((element) => element.textContent === name);
}

async function mount(emptyRead?: () => Promise<unknown>, parse?: (isCurrent: () => boolean) => Promise<void>) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const store = createStore();
  const saved = vi.fn(), cleared = vi.fn();
  let edit = () => undefined;
  store.set(desktopProjectAtom, snapshot);
  store.set(desktopAssetDialogAtom, true);
  window.pangeaDesktop = { onTransfer: () => () => undefined, onProjectChange: () => () => undefined,
    request: async (request) => {
      if (request.operation === "project.read") {
        if (!request.paths?.includes(path) && emptyRead) return emptyRead();
        return { ok: true, value: request.paths?.includes(path) ? [{ path, bytes: new Uint8Array([1]) }] : [] };
      }
      if (request.operation === "project.review") return { ok: true, value: { id: "00000000-0000-4000-8000-000000000001", revision: "deleted", files: [
        { path, binary: true, base: null, editor: null, disk: null, merged: null, decision: "unresolved", reason: "The asset was edited and deleted.", baseAvailable: false, editorAvailable: true, editorSize: 1, diskSize: null },
      ] } };
      if (request.operation === "project.apply-review") return { ok: true, value: deleted };
      if (request.operation === "project.save") saved(request);
      return { ok: true, value: undefined };
    },
  };
  function AssetDocument() {
    const [token, setToken] = useState<object | null>(null);
    edit = () => { setToken({}); return undefined; };
    return <ProjectAssetBinding kind="models" extension="bg3d" changeToken={token}
      onClear={() => { cleared(); setToken(null); }} onOpen={async (_file, _companions, isCurrent) => {
        await parse?.(isCurrent);
        if (isCurrent()) setToken({});
      }}
      exportFiles={async () => ok([{ path, bytes: new Uint8Array([2]) }])} />;
  }
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Provider store={store}><AssetDocument /><ProjectConflict /></Provider>));
  await act(async () => {
    const select = document.querySelector("select");
    if (select) { select.value = path; select.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  expect(store.get(desktopProjectDirtyAtom)).toBe(false);
  expect(store.get(desktopActiveDocumentAtom)?.capture?.()).not.toBe("0");
  await act(async () => store.set(desktopAssetDialogAtom, false));
  return { store, saved, cleared, edit: () => edit() };
}

it("closes a clean asset when an external refresh deletes its file and prevents saving stale bytes", async () => {
  const { store, cleared, saved } = await mount();
  await act(async () => store.set(desktopProjectAtom, deleted));
  expect(cleared).toHaveBeenCalledOnce();
  expect(store.get(desktopActiveDocumentAtom)?.capture?.()).toBe("0");
  expect(store.get(desktopProjectDirtyAtom)).toBe(false);
  await act(async () => store.get(desktopActiveDocumentAtom)?.save());
  expect(saved).not.toHaveBeenCalled();
});

it("closes the document after selecting disk deletion in the real conflict review", async () => {
  const { store, edit, cleared, saved } = await mount();
  await act(async () => edit());
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  await act(async () => {
    store.set(desktopExternalProjectAtom, deleted);
    store.set(desktopConflictOpenAtom, true);
  });
  await act(async () => button("Review and merge files")?.click());
  await act(async () => {
    const select = document.querySelector<HTMLSelectElement>(`select[aria-label="Version for ${path}"]`);
    if (select) { select.value = "disk"; select.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  expect(button("Apply merged files and reload")?.disabled).toBe(false);
  await act(async () => button("Apply merged files and reload")?.click());
  expect(store.get(desktopProjectAtom)?.revision).toBe("deleted");
  expect(store.get(desktopExternalProjectAtom)).toBe(null);
  expect(cleared).toHaveBeenCalledOnce();
  expect(store.get(desktopActiveDocumentAtom)?.capture?.()).toBe("0");
  expect(store.get(desktopProjectDirtyAtom)).toBe(false);
  await act(async () => store.get(desktopActiveDocumentAtom)?.save());
  expect(saved).not.toHaveBeenCalled();
});

it("ignores a deletion read from the previous project after a different project opens", async () => {
  let finish: (value: unknown) => void = () => undefined;
  const pending = new Promise<unknown>((resolve) => { finish = resolve; });
  const { store, edit, cleared } = await mount(() => pending);
  await act(async () => store.set(desktopProjectAtom, deleted));
  await act(async () => store.set(desktopProjectAtom, { ...snapshot, folder: "/second-project", revision: "new-project" }));
  await act(async () => edit());
  await act(async () => { finish({ ok: true, value: [] }); await pending; });
  expect(cleared).not.toHaveBeenCalled();
  expect(store.get(desktopActiveDocumentAtom)?.capture?.()).not.toBe("0");
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
});

it("retries a disk deletion received during parsing and keeps the old parser from restoring the asset", async () => {
  let finish: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  let defer = false;
  const { store, cleared, saved } = await mount(undefined, async () => { if (defer) await pending; });
  defer = true;
  await act(async () => store.set(desktopProjectAtom, { ...snapshot, revision: "reparse" }));
  await act(async () => store.set(desktopProjectAtom, deleted));
  expect(cleared).not.toHaveBeenCalled();
  await act(async () => { finish(); await pending; });
  expect(cleared).toHaveBeenCalledOnce();
  expect(store.get(desktopActiveDocumentAtom)?.capture?.()).toBe("0");
  expect(store.get(desktopProjectDirtyAtom)).toBe(false);
  await act(async () => store.get(desktopActiveDocumentAtom)?.save());
  expect(saved).not.toHaveBeenCalled();
});

it("invalidates the parser predicate when the asset binding unmounts", async () => {
  let finish: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  let defer = false, currentAfterCompletion = true;
  const { store } = await mount(undefined, async (isCurrent) => {
    if (!defer) return;
    await pending;
    currentAfterCompletion = isCurrent();
  });
  defer = true;
  await act(async () => store.set(desktopProjectAtom, { ...snapshot, revision: "reparse" }));
  await act(async () => root?.unmount()); root = null;
  await act(async () => { finish(); await pending; });
  expect(currentAfterCompletion).toBe(false);
});
