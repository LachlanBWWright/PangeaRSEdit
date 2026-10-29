import type { Store } from "jotai/vanilla/store";
import { projectSnapshotSchema, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { desktopProjectAtom, desktopExternalProjectAtom, desktopProjectDirtyAtom, desktopConflictOpenAtom } from "./projectState";

function isGeneratedAssetPath(relative: string): boolean {
  return relative === ".pangea/assets.json" || relative.startsWith(".pangea/asset-history/")
    || relative === ".pangea/sprites.json" || relative.startsWith("Assets/Models/")
    || relative.startsWith("Assets/sprites/");
}

export function isAssetOnlyProjectChange(current: ProjectSnapshot, next: ProjectSnapshot): boolean {
  if (JSON.stringify(current.manifest) !== JSON.stringify(next.manifest)) return false;
  const previous = new Map(current.files.map((file) => [file.path, file]));
  const incoming = new Map(next.files.map((file) => [file.path, file]));
  const paths = new Set([...previous.keys(), ...incoming.keys()]);
  let changed = false;
  for (const relative of paths) {
    const before = previous.get(relative), after = incoming.get(relative);
    if (before?.hash === after?.hash && before?.size === after?.size) continue;
    if (!isGeneratedAssetPath(relative)) return false;
    changed = true;
  }
  return changed;
}

export function receiveProjectChange(store: Store, value: unknown) {
  const parsed = projectSnapshotSchema.safeParse(value);
  if (!parsed.success) return;
  const current = store.get(desktopProjectAtom);
  if (!current || current.folder !== parsed.data.folder || current.revision === parsed.data.revision) return;
  if (!store.get(desktopExternalProjectAtom) && isAssetOnlyProjectChange(current, parsed.data)) {
    store.set(desktopProjectAtom, parsed.data);
    return;
  }
  store.set(store.get(desktopProjectDirtyAtom) ? desktopExternalProjectAtom : desktopProjectAtom, parsed.data);
  if (store.get(desktopProjectDirtyAtom)) store.set(desktopConflictOpenAtom, true);
}
