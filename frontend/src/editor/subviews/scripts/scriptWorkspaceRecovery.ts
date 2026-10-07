import { atom, type SetStateAction } from "jotai";
import type { ResultAsync } from "neverthrow";
import { readRecoveredScripts, saveRecoveredScripts, type ScriptRecoveryWorkspaceStore } from "./scriptRecoveryPersistence";

export { readRecoveredScripts, saveRecoveredScripts, scriptRecoverySnapshotSchema } from "./scriptRecoveryPersistence";
export interface ScriptRecoveryStatus { phase: "loading" | "saving" | "saved" | "unavailable" | "error"; message: string }
export interface ScriptRecoveryStorage {
  read: () => ResultAsync<ScriptRecoveryWorkspaceStore, string>;
  save: (workspaces: ScriptRecoveryWorkspaceStore) => ResultAsync<void, string>;
  available: () => boolean;
}
interface RecoverySession {
  hydration: "pending" | "ready" | "failed";
  hydrating: boolean;
  changedKeys: Set<string>;
  revision: number;
  savedRevision: number;
  writing: boolean;
  requested: boolean;
  error: string;
  cleanup: (() => void) | null;
}
interface SessionAccess {
  current: () => ScriptRecoveryWorkspaceStore;
  replace: (workspaces: ScriptRecoveryWorkspaceStore) => void;
  status: (status: ScriptRecoveryStatus) => void;
}
const savedStatus: ScriptRecoveryStatus = { phase: "saved", message: "Saved in this browser · export a package for a portable backup" };
const savingStatus: ScriptRecoveryStatus = { phase: "saving", message: "Saving local recovery copy…" };
const hydrateCommand = Symbol("hydrate scripts");
const unmountCommand = Symbol("unmount script recovery");

function listenForUnsavedScripts(session: RecoverySession): () => void {
  const listener = (event: BeforeUnloadEvent) => {
    if (session.revision <= session.savedRevision) return;
    event.preventDefault();
    event.returnValue = "";
  };
  globalThis.addEventListener?.("beforeunload", listener);
  return () => globalThis.removeEventListener?.("beforeunload", listener);
}

function requestSave(session: RecoverySession, access: SessionAccess, storage: ScriptRecoveryStorage): void {
  session.requested = true;
  access.status(savingStatus);
  if (session.writing) return;
  session.writing = true;
  session.requested = false;
  const revision = session.revision;
  void storage.save(access.current()).then((result) => {
    session.writing = false;
    if (result.isOk()) {
      session.savedRevision = revision;
      if (session.revision === revision) access.status(savedStatus);
    } else {
      access.status({ phase: storage.available() ? "error" : "unavailable", message: result.error });
    }
    if (session.requested) requestSave(session, access, storage);
  });
}

function hydrateSession(session: RecoverySession, access: SessionAccess, storage: ScriptRecoveryStorage): void {
  if (session.hydrating || session.hydration !== "pending") return;
  session.hydrating = true;
  void storage.read().then((result) => {
    session.hydrating = false;
    if (result.isErr()) {
      session.hydration = "failed";
      session.error = result.error;
      access.status({ phase: storage.available() ? "error" : "unavailable", message: result.error });
      return;
    }
    const current = access.current();
    const recovered = Object.fromEntries(Object.entries(result.value).filter(([key]) => !session.changedKeys.has(key)));
    const merged = { ...recovered, ...current };
    access.replace(merged);
    session.hydration = "ready";
    session.changedKeys.clear();
    if (session.revision > 0) requestSave(session, access, storage);
    else access.status(Object.keys(merged).length > 0 ? savedStatus : { phase: "saved", message: "Local recovery ready · export a package for a portable backup" });
  });
}

export function createScriptRecoveryAtoms(storage: ScriptRecoveryStorage = {
  read: readRecoveredScripts,
  save: saveRecoveredScripts,
  available: () => Boolean(globalThis.indexedDB),
}) {
  const valueAtom = atom<ScriptRecoveryWorkspaceStore>({});
  const sessionAtom = atom<RecoverySession | null>(null);
  const statusAtom = atom<ScriptRecoveryStatus>({ phase: "loading", message: "Recovering local scripts…" });
  const workspaceAtom = atom(
    (get) => get(valueAtom),
    (get, set, update: SetStateAction<ScriptRecoveryWorkspaceStore> | typeof hydrateCommand | typeof unmountCommand) => {
      let session = get(sessionAtom);
      if (session === null) {
        session = { hydration: "pending", hydrating: false, changedKeys: new Set(), revision: 0, savedRevision: 0, writing: false, requested: false, error: "", cleanup: null };
        set(sessionAtom, session);
      }
      const access: SessionAccess = { current: () => get(valueAtom), replace: (workspaces) => set(valueAtom, workspaces), status: (status) => set(statusAtom, status) };
      if (update === unmountCommand) { session.cleanup?.(); session.cleanup = null; return; }
      if (update === hydrateCommand) {
        session.cleanup ??= listenForUnsavedScripts(session);
        hydrateSession(session, access, storage);
        return;
      }
      const previous = get(valueAtom);
      const next = typeof update === "function" ? update(previous) : update;
      if (next === previous) return;
      session.revision += 1;
      if (session.hydration === "pending") {
        for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
          if (next[key] !== previous[key]) session.changedKeys.add(key);
        }
      }
      set(valueAtom, next);
      if (session.hydration === "ready") requestSave(session, access, storage);
      else if (session.hydration === "failed") access.status({ phase: storage.available() ? "error" : "unavailable", message: session.error });
      else hydrateSession(session, access, storage);
    },
  );
  const pendingAtom = atom((get) => {
    get(valueAtom);
    get(statusAtom);
    const session = get(sessionAtom);
    return session !== null && session.revision > session.savedRevision;
  });
  workspaceAtom.onMount = (setWorkspace) => {
    setWorkspace(hydrateCommand);
    return () => setWorkspace(unmountCommand);
  };
  return { workspaceAtom, statusAtom, pendingAtom };
}

const recoveryAtoms = createScriptRecoveryAtoms();
export const recoverableScriptWorkspaceStoreAtom = recoveryAtoms.workspaceAtom;
export const scriptRecoveryStatusAtom = recoveryAtoms.statusAtom;
