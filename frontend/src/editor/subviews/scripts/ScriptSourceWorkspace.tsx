import { useState } from "react";
import { FileCode2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScriptSourceEditor } from "./ScriptSourceEditor";
import { ScriptDialoguePanel } from "./ScriptDialoguePanel";
import { saveDialogueToWorkspace } from "./scriptDialogueAuthoring";
import { buildGeneratedScriptSourcePath, buildDefaultScriptSourceContent } from "./scriptWorkspaceHelpers";
import { setScriptActiveFile, upsertScriptSourceFile, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";
import { ScriptLibraryTools } from "./ScriptLibraryTools";
import { desktopBridge } from "@/platform/desktop/client";
import { DesktopScriptSource } from "@/platform/desktop/DesktopScriptSource";
import { ScriptModuleDependencies } from "./ScriptModuleDependencies";

export function ScriptSourceWorkspace({ workspace, update, onError, location }: {
  workspace: ScriptWorkspaceState; update: UpdateScriptWorkspace;
  onError: (message: string) => void;
  location?: { path: string; line: number; column: number } | null;
}) {
  const [fileName, setFileName] = useState("");
  const [showGenerated, setShowGenerated] = useState(false);
  const paths = Object.keys(workspace.sourceFiles).filter((path) => !workspace.sourceFiles[path]?.readOnly);
  const generated = Object.keys(workspace.compiledFiles);
  const active = workspace.sourceFiles[workspace.activeFilePath] || workspace.compiledFiles[workspace.activeFilePath];
  const activeLocation = location?.path === active?.path ? location : null;
  return <div className="workbench-source-layout">
    <aside className="grid content-start gap-5 min-w-0"><div><h3>Lua source</h3><p className="workbench-muted">Shared files for {workspace.context.gameLabel}.</p></div>
      <div className="grid gap-1">{paths.map((path) => <button key={path} type="button" className="object-library-item !px-2 !py-2" aria-pressed={workspace.activeFilePath === path} onClick={() => update((state) => setScriptActiveFile(state, path))}><FileCode2 size={15} /><span className="text-xs">{path.replace("Data/Scripts/src/", "")}</span></button>)}</div>
      <form className="grid gap-2" onSubmit={(event) => {
        event.preventDefault();
        if (!fileName.trim()) return;
        const path = buildGeneratedScriptSourcePath(fileName, "root", "lua", Object.keys(workspace.sourceFiles));
        update((state) => upsertScriptSourceFile(state, path, buildDefaultScriptSourceContent("lua")));
        setFileName("");
      }}><label htmlFor="script-new-helper" className="text-xs">New helper module</label><Input id="script-new-helper" value={fileName} placeholder="e.g. objectives" onChange={(event) => setFileName(event.target.value)} /><Button size="sm" variant="secondary" disabled={!fileName.trim()}><Plus size={14} className="mr-2" />Add file</Button></form>
      <button type="button" className="text-left text-xs text-slate-400" onClick={() => setShowGenerated(!showGenerated)} aria-expanded={showGenerated}>Generated output ({generated.length})</button>
      {showGenerated && <div className="grid gap-1">{generated.map((path) => <button key={path} type="button" className="break-all py-1 text-left text-xs text-slate-400 hover:text-white" onClick={() => update((state) => setScriptActiveFile(state, path))}>{path.replace("Data/Scripts/dist/", "")}</button>)}</div>}
      <ScriptLibraryTools workspace={workspace} update={update} />
    </aside>
    <div className="grid content-start gap-5 min-w-0">
      {active ? desktopBridge() ? <DesktopScriptSource path={active.path} content={active.content} initialLine={activeLocation?.line} /> : <ScriptSourceEditor key={`${active.path}:${activeLocation?.line ?? 0}:${activeLocation?.column ?? 0}`} workspace={workspace} path={active.path} update={update} initialLine={activeLocation?.line} initialColumn={activeLocation?.column} /> : <p className="workbench-notice">Choose a source file from the list to edit it.</p>}
      {active && <ScriptModuleDependencies workspace={workspace} path={active.path} update={update} />}
      <details className="rounded-lg border border-slate-700 p-4"><summary className="cursor-pointer font-medium">Create branching dialogue</summary><div className="mt-4"><ScriptDialoguePanel gameId={workspace.context.gameId} onSave={(draft) => saveDialogueToWorkspace(workspace, draft, (next) => update(() => next), onError)} /></div></details>
    </div>
  </div>;
}
