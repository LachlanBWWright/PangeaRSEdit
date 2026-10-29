import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import { z } from "zod";
import { assetImportResultSchema, assetProgressSchema, projectAssetSchema, type AssetImportResult, type HostRequest, type ProjectAsset } from "@pangea/desktop-contracts";
import { desktopBridge, desktopRequest } from "./client";
import { desktopProjectAtom } from "./projectState";

export function useProjectModelAssets() {
  const project = useAtomValue(desktopProjectAtom);
  const store = useStore();
  const [contents, setContents] = useState<{ folder: string; assets: ProjectAsset[]; pending: AssetImportResult[] }>({ folder: "", assets: [], pending: [] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const folder = store.get(desktopProjectAtom)?.folder;
    if (!folder || !desktopBridge()) return;
    const request = ++generation.current;
    const results = await Promise.all([
      desktopRequest({ operation: "assets.list" }, z.array(projectAssetSchema)),
      desktopRequest({ operation: "assets.pending" }, z.array(assetImportResultSchema)),
    ]);
    if (request !== generation.current || folder !== store.get(desktopProjectAtom)?.folder) return;
    const [listed, staged] = results;
    if (listed.isErr()) setError(listed.error.message);
    else if (staged.isOk()) setContents({ folder, assets: listed.value, pending: staged.value });
  }, [store]);

  useEffect(() => {
    const initial = window.setTimeout(() => { void refresh(); }, 0);
    const unsubscribe = desktopBridge()?.onAssetProgress?.((value) => {
      const event = assetProgressSchema.safeParse(value);
      if (event.success) { setMessage(event.data.message); void refresh(); }
    });
    const timer = window.setInterval(() => { void refresh(); }, 2500);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); unsubscribe?.(); };
  }, [project?.folder, refresh]);

  async function perform<T>(request: HostRequest, schema: z.ZodType<T>): Promise<T | null> {
    if (busy) return null;
    const folder = store.get(desktopProjectAtom)?.folder;
    setBusy(true); setError(""); setMessage("");
    const result = await desktopRequest(request, schema);
    if (folder !== store.get(desktopProjectAtom)?.folder) { setBusy(false); return null; }
    setBusy(false);
    if (result.isErr()) {
      if (result.error.code !== "cancelled") setError(result.error.message);
      return null;
    }
    await refresh();
    return result.value;
  }
  return { project, assets: contents.folder === project?.folder ? contents.assets : [], pending: contents.folder === project?.folder ? contents.pending : [], busy, message, error, perform };
}

export type ProjectModelAssetLibrary = ReturnType<typeof useProjectModelAssets>;
