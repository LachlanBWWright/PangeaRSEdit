import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import type { ProjectSnapshot } from "@pangea/desktop-contracts";
import { receiveProjectChange } from "./projectEvents";
import { desktopConflictOpenAtom, desktopExternalProjectAtom, desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";

const snapshot: ProjectSnapshot = {
  folder: "/project", revision: "original", recoveryAvailable: false, files: [],
  manifest: { kind: "pangea-editor-project", version: 1, name: "Events", game: "OttoMatic", levels: [] },
};

describe("external project changes", () => {
  it("updates a clean project without opening conflict review", () => {
    const store = createStore();
    store.set(desktopProjectAtom, snapshot);
    const changed = { ...snapshot, revision: "changed" };
    receiveProjectChange(store, changed);
    expect(store.get(desktopProjectAtom)).toEqual(changed);
    expect(store.get(desktopExternalProjectAtom)).toBeNull();
    expect(store.get(desktopConflictOpenAtom)).toBe(false);
  });

  it("preserves dirty editor state and keeps the newest disk revision for review", () => {
    const store = createStore();
    store.set(desktopProjectAtom, snapshot);
    store.set(desktopProjectDirtyAtom, true);
    receiveProjectChange(store, { ...snapshot, revision: "first" });
    receiveProjectChange(store, { ...snapshot, revision: "latest" });
    expect(store.get(desktopProjectAtom)).toBe(snapshot);
    expect(store.get(desktopExternalProjectAtom)?.revision).toBe("latest");
    expect(store.get(desktopConflictOpenAtom)).toBe(true);
    expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  });

  it.each([null, {}, { ...snapshot, revision: 12 }, { ...snapshot, folder: "/another-project", revision: "changed" }, snapshot])("ignores malformed, unrelated, and unchanged notifications: %j", (notification) => {
    const store = createStore();
    store.set(desktopProjectAtom, snapshot);
    store.set(desktopProjectDirtyAtom, true);
    receiveProjectChange(store, notification);
    expect(store.get(desktopProjectAtom)).toBe(snapshot);
    expect(store.get(desktopExternalProjectAtom)).toBeNull();
    expect(store.get(desktopConflictOpenAtom)).toBe(false);
  });

  it("ignores notifications when no project is open", () => {
    const store = createStore();
    receiveProjectChange(store, snapshot);
    expect(store.get(desktopProjectAtom)).toBeNull();
  });
});
