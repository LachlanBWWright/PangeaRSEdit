import { useEffect, useState } from "react";
import type { ScriptInspectorPage, ScriptInspectorSnapshot } from "@pangea/desktop-contracts";
import type { QueryScriptObjects, ScriptObjectQuery } from "./utils/scriptInspector";

export function useScriptObjectPage(snapshot: ScriptInspectorSnapshot | null, query?: QueryScriptObjects) {
  const [request, setRequest] = useState<ScriptObjectQuery>({ offset: 0, scriptedOnly: false });
  const [page, setPage] = useState<ScriptInspectorPage | null>(null);
  const [error, setError] = useState("");
  const registeredObjects = snapshot?.registeredObjects;
  useEffect(() => {
    if (!query || registeredObjects === undefined) return;
    let cancelled = false;
    let pending = false;
    async function refresh() {
      if (!query || pending) return;
      pending = true;
      const result = await query(request);
      pending = false;
      if (cancelled) return;
      setPage(result.isOk() ? result.value : { objects: [], offset: request.offset, nextOffset: null, total: registeredObjects ?? 0, truncated: false, error: result.error });
      setError(result.isErr() ? result.error : "");
    }
    const initial = setTimeout(refresh, 0);
    const interval = setInterval(refresh, 500);
    return () => { cancelled = true; clearTimeout(initial); clearInterval(interval); };
  }, [query, request, registeredObjects]);
  return { request, setRequest, error, page: page ?? {
    objects: snapshot?.objects ?? [], offset: 0, nextOffset: null,
    total: snapshot?.registeredObjects ?? 0, truncated: snapshot?.truncated ?? false, error: null,
  } };
}
