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

  it("accepts asset imports and reimports while preserving unsaved object and level edits", () => {
    const store = createStore();
    store.set(desktopProjectAtom, snapshot);
    store.set(desktopProjectDirtyAtom, true);
    const changed: ProjectSnapshot = { ...snapshot, revision: "asset-import", files: [
      { path: ".pangea/assets.json", hash: "registry", size: 100 },
      { path: ".pangea/asset-history/revision.json", hash: "previous", size: 90 },
      { path: "Assets/Models/id/revision/model.bg3d", hash: "converted", size: 50 },
      { path: ".pangea/sprites.json", hash: "sprite-registry", size: 80 },
      { path: "Assets/sprites/robot.shapes", hash: "sprite-output", size: 60 },
    ] };
    receiveProjectChange(store, changed);
    expect(store.get(desktopProjectAtom)).toEqual(changed);
    expect(store.get(desktopProjectDirtyAtom)).toBe(true);
    expect(store.get(desktopExternalProjectAtom)).toBeNull();
    expect(store.get(desktopConflictOpenAtom)).toBe(false);
    const reimport = { ...changed, revision: "asset-reimport", files: changed.files.map((file) => ({ ...file, hash: `${file.hash}-new` })) };
    receiveProjectChange(store, reimport);
    expect(store.get(desktopProjectAtom)).toEqual(reimport);
    expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  });

  it("keeps mixed source/asset changes, changed manifests and pending reviews behind conflict review", () => {
    const assetFile = { path: "Assets/Models/id/revision/model.bg3d", hash: "changed", size: 50 };
    const changes: ProjectSnapshot[] = [
      { ...snapshot, revision: "mixed", files: [assetFile, { path: "Data/Scripts/src/controller.lua", hash: "external", size: 30 }] },
      { ...snapshot, revision: "renamed", manifest: { ...snapshot.manifest, name: "External name" }, files: [assetFile] },
    ];
    for (const changed of changes) {
      const store = createStore();
      store.set(desktopProjectAtom, snapshot);
      store.set(desktopProjectDirtyAtom, true);
      receiveProjectChange(store, changed);
      expect(store.get(desktopProjectAtom)).toBe(snapshot);
      expect(store.get(desktopExternalProjectAtom)).toEqual(changed);
      expect(store.get(desktopConflictOpenAtom)).toBe(true);
    }
    const store = createStore();
    store.set(desktopProjectAtom, snapshot);
    store.set(desktopProjectDirtyAtom, true);
    store.set(desktopExternalProjectAtom, { ...snapshot, revision: "reviewing" });
    receiveProjectChange(store, { ...snapshot, revision: "new-asset", files: [assetFile] });
    expect(store.get(desktopProjectAtom)).toBe(snapshot);
    expect(store.get(desktopExternalProjectAtom)?.revision).toBe("new-asset");
    expect(store.get(desktopConflictOpenAtom)).toBe(true);
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
