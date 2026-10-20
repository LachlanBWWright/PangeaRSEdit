import type { Store } from "jotai/vanilla/store";
import { projectSnapshotSchema } from "@pangea/desktop-contracts";
import { desktopProjectAtom, desktopExternalProjectAtom, desktopProjectDirtyAtom, desktopConflictOpenAtom } from "./projectState";

export function receiveProjectChange(store: Store, value: unknown) {
  const parsed = projectSnapshotSchema.safeParse(value);
  if (!parsed.success) return;
  const current = store.get(desktopProjectAtom);
  if (!current || current.folder !== parsed.data.folder || current.revision === parsed.data.revision) return;
  store.set(store.get(desktopProjectDirtyAtom) ? desktopExternalProjectAtom : desktopProjectAtom, parsed.data);
  if (store.get(desktopProjectDirtyAtom)) store.set(desktopConflictOpenAtom, true);
}
