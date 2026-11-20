import { useEffect, useEffectEvent } from "react";
import { useStore } from "jotai";
import { z } from "zod";
import { desktopActiveDocumentAtom, desktopProjectDirtyAtom } from "@/platform/desktop/projectState";
import { desktopBridge, desktopRequest } from "@/platform/desktop/client";
import { engineWorkspaceAtom } from "./useEngineWorkspace";

export function useEngineDocument(dirty: boolean, save: () => boolean) {
  const store = useStore();
  const download = useEffectEvent(save);
  useEffect(() => {
    store.set(desktopActiveDocumentAtom, { kind: "engine", save: async () => {
      if (!download()) return;
      store.set(desktopProjectDirtyAtom, false);
      if (desktopBridge()) await desktopRequest({ operation: "host.dirty", dirty: false }, z.void());
    }, discard: () => store.set(engineWorkspaceAtom, { type: "discard" }) });
    return () => { store.set(desktopActiveDocumentAtom, null); store.set(desktopProjectDirtyAtom, false); };
  }, [store]);
  useEffect(() => {
    store.set(desktopProjectDirtyAtom, dirty);
    if (desktopBridge()) void desktopRequest({ operation: "host.dirty", dirty }, z.void());
    function beforeUnload(event: BeforeUnloadEvent) { if (dirty) event.preventDefault(); }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, store]);
}
