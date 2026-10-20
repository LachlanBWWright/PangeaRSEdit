import { useRef, useState } from "react";
import { ResultAsync } from "neverthrow";
import { Button } from "@/components/ui/button";
import { buildScriptLibrary, readScriptLibrary, type ScriptLibrary } from "./scriptLibrary";
import { mergeScriptLibrary, scriptLibraryChanges } from "./scriptLibraryMerge";
import { readIdeLuaFolder } from "./scriptIdeFolder";
import { ScriptImportReviewDialog } from "./ScriptImportReviewDialog";
import { downloadBytes } from "./scriptWorkspaceHelpers";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";

export function ScriptLibraryTools({ workspace, update }: { workspace: ScriptWorkspaceState; update: UpdateScriptWorkspace }) {
  const [incoming, setIncoming] = useState<{ title: string; library: ScriptLibrary } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const libraryInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);
  const importLibrary = async (file: File) => {
    setBusy(true); setError(null); setStatus("");
    if (file.size > 64 * 1024 * 1024) { setError("Choose a library ZIP smaller than 64 MiB."); setBusy(false); return; }
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
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={() => {
      setError(null); const result = buildScriptLibrary(workspace);
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
    {incoming && <ScriptImportReviewDialog title={incoming.title} error={error} changes={scriptLibraryChanges(workspace, incoming.library)} onClose={() => setIncoming(null)} onApply={(accepted) => {
      const result = mergeScriptLibrary(workspace, incoming.library, accepted);
      if (result.isErr()) { setError(result.error); return; }
      update(() => result.value);
      setStatus("Imported selected changes. Level-specific work was preserved. Build and test to verify behavior."); setIncoming(null);
    }} />}
  </div></details>;
}
