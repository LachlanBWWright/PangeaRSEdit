import { afterEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";
import { ok, err, okAsync, ResultAsync, type Result } from "neverthrow";
import { IDBFactory } from "fake-indexeddb";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace, updateScriptSourceContent } from "./scriptWorkspaceState";
import { createScriptRecoveryAtoms, type ScriptRecoveryStorage } from "./scriptWorkspaceRecovery";
import { readRecoveredScripts, saveRecoveredScripts, type ScriptRecoveryWorkspaceStore } from "./scriptRecoveryPersistence";

interface Deferred<T> { result: ResultAsync<T, string>; resolve: (result: Result<T, string>) => void }
function deferred<T>(): Deferred<T> {
  let resolve: (result: Result<T, string>) => void = () => undefined;
  const promise = new Promise<Result<T, string>>((complete) => { resolve = complete; });
  return { result: ResultAsync.fromSafePromise(promise).andThen((result) => result), resolve };
}
function workspace(content: string) {
  const state = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, null));
  return updateScriptSourceContent(state, "Data/Scripts/src/user.lua", content);
}
function controlledStorage() {
  const reads: Deferred<ScriptRecoveryWorkspaceStore>[] = [];
  const writes: { snapshot: ScriptRecoveryWorkspaceStore; completion: Deferred<undefined> }[] = [];
  const storage: ScriptRecoveryStorage = {
    available: () => true,
    read: () => { const read = deferred<ScriptRecoveryWorkspaceStore>(); reads.push(read); return read.result; },
    save: (snapshot) => { const completion = deferred<undefined>(); writes.push({ snapshot, completion }); return completion.result; },
  };
  return { reads, writes, storage };
}
const subscriptions: (() => void)[] = [];
afterEach(() => { for (const unsubscribe of subscriptions.splice(0)) unsubscribe(); vi.unstubAllGlobals(); });

describe("store-local script recovery sessions", () => {
  it("hydrates independent Jotai stores even when they share the same atoms", async () => {
    const { reads, storage } = controlledStorage();
    const atoms = createScriptRecoveryAtoms(storage);
    const first = createStore();
    const second = createStore();
    subscriptions.push(first.sub(atoms.workspaceAtom, () => undefined), second.sub(atoms.workspaceAtom, () => undefined));
    expect(reads).toHaveLength(2);
    reads[0]?.resolve(ok({ game: workspace("-- first") }));
    await vi.waitFor(() => expect(first.get(atoms.statusAtom).phase).toBe("saved"));
    expect(second.get(atoms.statusAtom).phase).toBe("loading");
    reads[1]?.resolve(ok({ game: workspace("-- second") }));
    await vi.waitFor(() => expect(second.get(atoms.statusAtom).phase).toBe("saved"));
    expect(first.get(atoms.workspaceAtom).game?.sourceFiles["Data/Scripts/src/user.lua"]?.content).toBe("-- first");
    expect(second.get(atoms.workspaceAtom).game?.sourceFiles["Data/Scripts/src/user.lua"]?.content).toBe("-- second");
  });

  it("preserves added, updated and deleted workspaces while hydration is in flight", async () => {
    const { reads, writes, storage } = controlledStorage();
    const atoms = createScriptRecoveryAtoms(storage);
    const store = createStore();
    subscriptions.push(store.sub(atoms.workspaceAtom, () => undefined));
    const authored = workspace("-- authored while loading");
    store.set(atoms.workspaceAtom, { changed: authored, removed: authored });
    store.set(atoms.workspaceAtom, { changed: authored, added: authored });
    reads[0]?.resolve(ok({ changed: workspace("-- old"), removed: workspace("-- removed"), untouched: workspace("-- retained") }));
    await vi.waitFor(() => expect(writes).toHaveLength(1));
    expect(store.get(atoms.workspaceAtom)).toEqual({ changed: authored, added: authored, untouched: workspace("-- retained") });
    expect(writes[0]?.snapshot).toEqual(store.get(atoms.workspaceAtom));
  });

  it("serializes writes, coalesces newer edits and keeps Saving until the newest revision commits", async () => {
    const { writes, storage } = controlledStorage();
    const atoms = createScriptRecoveryAtoms({ ...storage, read: () => okAsync({}) });
    const store = createStore();
    subscriptions.push(store.sub(atoms.workspaceAtom, () => undefined));
    await vi.waitFor(() => expect(store.get(atoms.statusAtom).phase).toBe("saved"));
    store.set(atoms.workspaceAtom, { game: workspace("-- first") });
    store.set(atoms.workspaceAtom, { game: workspace("-- second") });
    store.set(atoms.workspaceAtom, { game: workspace("-- latest") });
    expect(writes).toHaveLength(1);
    expect(store.get(atoms.statusAtom).phase).toBe("saving");
    writes[0]?.completion.resolve(ok(undefined));
    await vi.waitFor(() => expect(writes).toHaveLength(2));
    expect(store.get(atoms.statusAtom).phase).toBe("saving");
    expect(writes[1]?.snapshot.game?.sourceFiles["Data/Scripts/src/user.lua"]?.content).toBe("-- latest");
    writes[1]?.completion.resolve(ok(undefined));
    await vi.waitFor(() => expect(store.get(atoms.statusAtom).phase).toBe("saved"));
    expect(store.get(atoms.pendingAtom)).toBe(false);
  });

  it("retains recovery after hydration failure and reports write errors while allowing later retries", async () => {
    const controlled = controlledStorage();
    const atoms = createScriptRecoveryAtoms(controlled.storage);
    const store = createStore();
    subscriptions.push(store.sub(atoms.workspaceAtom, () => undefined));
    controlled.reads[0]?.resolve(err("Existing recovery data has been preserved."));
    await vi.waitFor(() => expect(store.get(atoms.statusAtom).phase).toBe("error"));
    store.set(atoms.workspaceAtom, { game: workspace("-- keep editable") });
    expect(controlled.writes).toHaveLength(0);
    expect(store.get(atoms.statusAtom).message).toContain("preserved");
    const retryAtoms = createScriptRecoveryAtoms({ ...controlled.storage, read: () => okAsync({}) });
    const retryStore = createStore();
    subscriptions.push(retryStore.sub(retryAtoms.workspaceAtom, () => undefined));
    await vi.waitFor(() => expect(retryStore.get(retryAtoms.statusAtom).phase).toBe("saved"));
    retryStore.set(retryAtoms.workspaceAtom, { game: workspace("-- failed save") });
    controlled.writes[0]?.completion.resolve(err("Storage is full."));
    await vi.waitFor(() => expect(retryStore.get(retryAtoms.statusAtom).phase).toBe("error"));
    expect(retryStore.get(retryAtoms.pendingAtom)).toBe(true);
    retryStore.set(retryAtoms.workspaceAtom, { game: workspace("-- retry") });
    controlled.writes[1]?.completion.resolve(ok(undefined));
    await vi.waitFor(() => expect(retryStore.get(retryAtoms.statusAtom).phase).toBe("saved"));
  });

  it("starts saves without a debounce gap and warns on unload only while edits are uncommitted", async () => {
    const { writes, storage } = controlledStorage();
    const atoms = createScriptRecoveryAtoms({ ...storage, read: () => okAsync({}) });
    const store = createStore();
    subscriptions.push(store.sub(atoms.workspaceAtom, () => undefined));
    await vi.waitFor(() => expect(store.get(atoms.statusAtom).phase).toBe("saved"));
    store.set(atoms.workspaceAtom, { game: workspace("-- last keystroke") });
    expect(writes).toHaveLength(1);
    const pending = new Event("beforeunload", { cancelable: true });
    globalThis.dispatchEvent(pending);
    expect(pending.defaultPrevented).toBe(true);
    writes[0]?.completion.resolve(ok(undefined));
    await vi.waitFor(() => expect(store.get(atoms.statusAtom).phase).toBe("saved"));
    const committed = new Event("beforeunload", { cancelable: true });
    globalThis.dispatchEvent(committed);
    expect(committed.defaultPrevented).toBe(false);
  });

  it("reloads the latest committed workspace into a fresh store using real IndexedDB", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const atoms = createScriptRecoveryAtoms();
    const first = createStore();
    subscriptions.push(first.sub(atoms.workspaceAtom, () => undefined));
    await vi.waitFor(() => expect(first.get(atoms.statusAtom).phase).toBe("saved"));
    first.set(atoms.workspaceAtom, { game: workspace("-- persisted draft") });
    await vi.waitFor(() => expect(first.get(atoms.statusAtom).phase).toBe("saved"));
    const second = createStore();
    subscriptions.push(second.sub(atoms.workspaceAtom, () => undefined));
    await vi.waitFor(() => expect(second.get(atoms.statusAtom).phase).toBe("saved"));
    expect(second.get(atoms.workspaceAtom)).toEqual(first.get(atoms.workspaceAtom));
    expect((await readRecoveredScripts()).isOk()).toBe(true);
    expect((await saveRecoveredScripts(second.get(atoms.workspaceAtom))).isOk()).toBe(true);
  });

  it("finishes queued writes after unmount and remounts without rehydrating or losing the session", async () => {
    const { reads, writes, storage } = controlledStorage();
    const atoms = createScriptRecoveryAtoms(storage);
    const store = createStore();
    const unsubscribe = store.sub(atoms.workspaceAtom, () => undefined);
    reads[0]?.resolve(ok({}));
    await vi.waitFor(() => expect(store.get(atoms.statusAtom).phase).toBe("saved"));
    store.set(atoms.workspaceAtom, { game: workspace("-- first") });
    store.set(atoms.workspaceAtom, { game: workspace("-- final") });
    unsubscribe();
    writes[0]?.completion.resolve(ok(undefined));
    await vi.waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]?.snapshot.game?.sourceFiles["Data/Scripts/src/user.lua"]?.content).toBe("-- final");
    writes[1]?.completion.resolve(ok(undefined));
    await vi.waitFor(() => expect(store.get(atoms.statusAtom).phase).toBe("saved"));
    subscriptions.push(store.sub(atoms.workspaceAtom, () => undefined));
    expect(reads).toHaveLength(1);
  });
});
