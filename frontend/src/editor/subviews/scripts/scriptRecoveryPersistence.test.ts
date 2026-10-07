import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace, updateScriptSourceContent } from "./scriptWorkspaceState";
import { readRecoveredScripts, saveRecoveredScripts } from "./scriptRecoveryPersistence";
import { createStore } from "jotai";
import { createScriptRecoveryAtoms } from "./scriptWorkspaceRecovery";

function workspace() {
  return ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, null));
}
const subscriptions: (() => void)[] = [];

function putRawSnapshot(value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pangearsedit-script-workspaces", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("snapshots");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("snapshots", "readwrite");
      transaction.objectStore("snapshots").put(value, "current");
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    };
  });
}

function readRawSnapshot(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pangearsedit-script-workspaces", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("snapshots", "readonly");
      const read = transaction.objectStore("snapshots").get("current");
      let value: unknown;
      read.onsuccess = () => { value = read.result; };
      transaction.oncomplete = () => { database.close(); resolve(value); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    };
  });
}

describe("IndexedDB script recovery persistence", () => {
  beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
  afterEach(() => { for (const unsubscribe of subscriptions.splice(0)) unsubscribe(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("reads an empty database and reloads committed drafts, binary assets and independent games", async () => {
    expect((await readRecoveredScripts()).match((value) => value, (error) => error)).toEqual({});
    const original = workspace();
    const draft = updateScriptSourceContent(original, "Data/Scripts/src/user.lua", "-- unsaved draft");
    const assets = { "Data/Scripts/assets/item.bin": { path: "Data/Scripts/assets/item.bin", bytes: new Uint8Array([0, 42, 255]), sourceName: "item.bin" } };
    const saved = await saveRecoveredScripts({ otto: { ...draft, assets }, another: original });
    expect(saved.isOk()).toBe(true);
    const recovered = await readRecoveredScripts();
    expect(recovered.isOk()).toBe(true);
    if (recovered.isErr()) return;
    expect(recovered.value.otto?.sourceFiles["Data/Scripts/src/user.lua"]?.content).toBe("-- unsaved draft");
    expect(recovered.value.otto?.sourceFiles["Data/Scripts/src/user.lua"]?.savedContent).toBe(original.sourceFiles["Data/Scripts/src/user.lua"]?.savedContent);
    expect(recovered.value.otto?.assets).toEqual(assets);
    expect(recovered.value.another).toEqual(original);
  });

  it("reports unavailable storage without rejecting", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const read = await readRecoveredScripts();
    const write = await saveRecoveredScripts({ game: workspace() });
    expect(read.isErr()).toBe(true);
    expect(write.isErr()).toBe(true);
  });

  it("retains malformed or unsupported snapshots for recovery instead of silently discarding them", async () => {
    const corrupt = { version: 99, savedAt: 1, workspaces: { game: { sourceFiles: "invalid" } } };
    await putRawSnapshot(corrupt);
    const recovered = await readRecoveredScripts();
    expect(recovered.isErr()).toBe(true);
    expect(await readRawSnapshot()).toEqual(corrupt);
  });

  it("does not report success for aborted writes or replace the last committed recovery copy", async () => {
    const original = workspace();
    expect((await saveRecoveredScripts({ game: original })).isOk()).toBe(true);
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      const request = put.call(this, value, key);
      this.transaction.abort();
      return request;
    });
    const failed = await saveRecoveredScripts({ game: updateScriptSourceContent(original, "Data/Scripts/src/user.lua", "-- newer") });
    expect(failed.isErr()).toBe(true);
    const recovered = await readRecoveredScripts();
    expect(recovered.isOk()).toBe(true);
    if (recovered.isOk()) expect(recovered.value.game).toEqual(original);
  });

  it("keeps corrupt storage intact when the editor receives new edits after failed recovery", async () => {
    const corrupt = { version: 99, savedAt: 1, workspaces: { game: "damaged" } };
    await putRawSnapshot(corrupt);
    const atoms = createScriptRecoveryAtoms();
    const store = createStore();
    subscriptions.push(store.sub(atoms.workspaceAtom, () => undefined));
    await vi.waitFor(() => expect(store.get(atoms.statusAtom).phase).toBe("error"));
    store.set(atoms.workspaceAtom, { game: workspace() });
    expect(store.get(atoms.statusAtom).message).toContain("preserved");
    expect(await readRawSnapshot()).toEqual(corrupt);
    expect(store.get(atoms.workspaceAtom).game).toEqual(workspace());
  });
});
