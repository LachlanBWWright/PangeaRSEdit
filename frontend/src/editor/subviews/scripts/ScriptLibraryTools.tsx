import { useLayoutEffect, useRef, useState } from "react";
import { useStore } from "jotai";
import { ResultAsync } from "neverthrow";
import { Button } from "@/components/ui/button";
import { buildScriptLibraryAsync, readScriptLibrary, type ScriptLibrary } from "./scriptLibrary";
import { desktopProjectAtom } from "@/platform/desktop/projectState";
import { prepareScriptLibraryImport, validateScriptImportTarget } from "./scriptLibraryImport";
import { mergeScriptLibrary, scriptLibraryChanges } from "./scriptLibraryMerge";
import { readIdeLuaFolder } from "./scriptIdeFolder";
import { ScriptImportReviewDialog } from "./ScriptImportReviewDialog";
import { downloadBytes } from "./scriptWorkspaceHelpers";
import { ensureScriptWorkspace, scriptWorkspaceStoreAtom, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";

export function ScriptLibraryTools({ workspace, update }: { workspace: ScriptWorkspaceState; update: UpdateScriptWorkspace }) {
  const [incoming, setIncoming] = useState<{ title: string; library: ScriptLibrary } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [includeAuthoringSources, setIncludeAuthoringSources] = useState(false);
  const libraryInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);
  const store = useStore();
  const latest = useRef({ workspace, update });
  const operation = useRef(false);
  const mounted = useRef(true);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useLayoutEffect(() => { latest.current = { workspace, update }; }, [workspace, update]);
  const importLibrary = async (file: File) => {
    setBusy(true); setError(null); setStatus("");
    if (file.size > 576 * 1024 * 1024) { setError("Choose a library ZIP smaller than 576 MiB."); setBusy(false); return; }
    const read = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
    if (read.isErr()) { setError(read.error); setBusy(false); return; }
    const result = await readScriptLibrary(new Uint8Array(read.value), workspace.context.gameId);
    setBusy(false);
    if (result.isErr()) setError(result.error); else setIncoming({ title: "Import shared library", library: result.value });
  };
  const importFolder = async (files: readonly File[]) => {
    setBusy(true); setError(null); setStatus("");
    const result = await readIdeLuaFolder(files, workspace.context.gameId);
    setBusy(false);
    if (result.isErr()) setError(result.error); else setIncoming({ title: "Update Lua from IDE", library: result.value });
  };
  return <details className="min-w-0 border-y border-slate-700 px-4 py-3"><summary className="cursor-pointer text-sm font-medium">Shared libraries and IDE workflow</summary><div className="mt-3 grid gap-3">
    <p className="workbench-muted">Share objects, reusable scripts and assets across this game's level pack. Merge a library, or update Lua from your IDE folder while keeping level-specific work.</p>
    <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={includeAuthoringSources} onChange={(event) => setIncludeAuthoringSources(event.currentTarget.checked)} />Include authoring sources in shared library</label>
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={async () => {
      setError(null); setBusy(true); const result = await buildScriptLibraryAsync(workspace, { includeAuthoringSources }); setBusy(false);
      if (result.isErr()) setError(result.error); else downloadBytes(result.value, `${workspace.context.gameId}-library.zip`);
    }}>Export shared library</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => libraryInput.current?.click()}>Import shared library</Button>
      <input ref={libraryInput} type="file" className="hidden" aria-label="Import shared library" accept=".zip" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void importLibrary(file); event.target.value = ""; }} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => folderInput.current?.click()}>Update Lua folder</Button>
      <input type="file" className="hidden" aria-label="Update Lua folder" multiple disabled={busy} ref={(input) => { folderInput.current = input; input?.setAttribute("webkitdirectory", ""); }} onChange={(event) => { const files = [...(event.target.files ?? [])]; if (files.length) void importFolder(files); event.target.value = ""; }} />
    </div>
    <p className="workbench-muted">Unzip the library and open its root in your IDE. Edit Data/Scripts/src with the included LuaLS types. Choose that project folder or src folder to review Lua updates. Build and test after importing.</p>
    {busy && <p role="status" className="workbench-muted">Reading and validating shared content…</p>}
    {error && !incoming && <p role="alert" className="workbench-notice" data-tone="warning">{error}</p>}
    {status && <p role="status" className="workbench-muted">{status}</p>}
    {incoming && <ScriptImportReviewDialog title={incoming.title} error={error} busy={busy} changes={scriptLibraryChanges(workspace, incoming.library)} onClose={() => { if (!operation.current) setIncoming(null); }} onApply={async (accepted) => {
      if (operation.current) return;
      operation.current = true;
      setBusy(true); setError(null);
      const readCurrent = () => ({ workspace: ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), latest.current.workspace.context),
        projectFolder: store.get(desktopProjectAtom)?.folder ?? null });
      const before = readCurrent();
      const restored = await prepareScriptLibraryImport(before, incoming.library, accepted, readCurrent);
      if (!mounted.current) return;
      operation.current = false; setBusy(false);
      if (restored.isErr()) { setError(restored.error); return; }
      let importError: string | null = null;
      latest.current.update((current) => {
        const valid = validateScriptImportTarget(before, { ...readCurrent(), workspace: current }, incoming.library, accepted);
        if (valid.isErr()) { importError = valid.error; return current; }
        const merged = mergeScriptLibrary(current, incoming.library, accepted);
        if (merged.isErr()) { importError = merged.error; return current; }
        return merged.value;
      });
      if (importError) { setError(importError); return; }
      setStatus("Imported selected changes. Level-specific work was preserved. Build and test to verify behavior."); setIncoming(null);
    }} />}
  </div></details>;
}
