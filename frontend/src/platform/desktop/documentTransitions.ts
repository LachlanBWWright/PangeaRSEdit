import type { Store } from "jotai/vanilla/store";
import { z } from "zod";
import { toast } from "sonner";
import { desktopBridge, desktopRequest } from "./client";
import { desktopActiveDocumentAtom, desktopProjectDirtyAtom, desktopTransitionAtom } from "./projectState";

export function requestDocumentTransition(store: Store): Promise<boolean> {
  if (!store.get(desktopProjectDirtyAtom)) return Promise.resolve(true);
  if (store.get(desktopTransitionAtom)) return Promise.resolve(false);
  return new Promise((resolve) => store.set(desktopTransitionAtom, { resolve }));
}

export async function finishDocumentTransition(store: Store, action: "save" | "discard" | "cancel") {
  const pending = store.get(desktopTransitionAtom);
  if (!pending) return;
  if (action === "cancel") {
    store.set(desktopTransitionAtom, null);
    pending.resolve(false);
    return;
  }
  const document = store.get(desktopActiveDocumentAtom);
  if (!document) return;
  if (action === "save") await document.save();
  else document.discard();
  if (action === "discard") store.set(desktopProjectDirtyAtom, false);
  if (store.get(desktopProjectDirtyAtom)) return;
  if (desktopBridge()) {
    const synced = await desktopRequest({ operation: "host.dirty", dirty: false }, z.void());
    if (synced.isErr()) return;
  }
  store.set(desktopTransitionAtom, null);
  pending.resolve(true);
}

export async function saveDocumentAndClose(store: Store) {
  const document = store.get(desktopActiveDocumentAtom);
  if (!document) return;
  await document.save();
  if (store.get(desktopProjectDirtyAtom)) return;
  const synced = await desktopRequest({ operation: "host.dirty", dirty: false }, z.void());
  if (synced.isErr()) { toast.error(synced.error.message); return; }
  const closed = await desktopRequest({ operation: "host.close" }, z.void());
  if (closed.isErr()) toast.error(closed.error.message);
}
