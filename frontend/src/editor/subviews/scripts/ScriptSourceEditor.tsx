import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { hasConfiguredApiEndpoint } from "@/api/apiBase";
import { configureScriptMonaco, ensureScriptMonacoConfigured } from "./scriptMonaco";
import { scriptLspClient } from "./scriptLspClient";
import { getLuaIntelligenceStatus } from "./scriptLuaIntelligence";
import { preflightScriptSource } from "./scriptSourcePreflight";
import { replaceLuaLSDiagnostics, revertScriptSourceFile, saveScriptSourceFile, updateScriptSourceContent, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";
import { ScriptHookApiExplorer } from "./ScriptHookApiExplorer";

interface Props {
  workspace: ScriptWorkspaceState;
  path: string;
  update: UpdateScriptWorkspace;
}

export function ScriptSourceEditor({ workspace, path, update }: Props) {
  const [referenceOpen, setReferenceOpen] = useState(true);
  const status = useSyncExternalStore(
    (listener) => scriptLspClient.subscribe(listener),
    () => scriptLspClient.getStatus(),
    () => scriptLspClient.getStatus(),
  );
  useEffect(() => {
    ensureScriptMonacoConfigured();
    const disposables = configureScriptMonaco({ context: workspace.context });
    return () => { for (const disposable of disposables) disposable.dispose(); };
  }, [workspace.context]);
  const syncWorkspace = useEffectEvent(() => {
    if (hasConfiguredApiEndpoint()) void scriptLspClient.connect(workspace).match(() => undefined, () => undefined);
  });
  useEffect(() => {
    syncWorkspace();
  }, [workspace.sourceFiles, workspace.context, workspace.customObjects]);
  useEffect(() => () => {
    void scriptLspClient.disconnect().match(() => undefined, () => undefined);
  }, []);
  useEffect(() => scriptLspClient.subscribeDiagnostics((event) => {
    update((state) => replaceLuaLSDiagnostics(state, event.filePath, event.diagnostics));
  }), [update]);
  const source = workspace.sourceFiles[path];
  const runtime = workspace.compiledFiles[path];
  const content = source?.content ?? runtime?.content;
  if (content === undefined) return <p className="workbench-notice" role="status">This source is missing. Import its script package to restore it.</p>;
  const readOnly = source?.readOnly ?? true;
  const dirty = source !== undefined && source.content !== source.savedContent;
  const findings = preflightScriptSource(content, workspace.context.gameId, workspace.context.supportedHooks, workspace.context.levelNumber);
  const diagnostics = workspace.diagnostics.filter((entry) => entry.filePath === path);
  return (
    <div className="script-editor-workspace">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="workbench-muted">Lua module editor · Ctrl+Space for completion</p><Button size="sm" variant="ghost" aria-expanded={referenceOpen} onClick={() => setReferenceOpen(!referenceOpen)}>{referenceOpen ? "Hide API reference" : "Show API reference"}</Button></div>
      <div className={referenceOpen ? "script-code-reference" : "min-w-0"}>
      <div className="min-w-0">
      <div className="workbench-source">
        <div className="workbench-source-toolbar">
          <div><p className="workbench-source-path">{path.replace("Data/Scripts/", "")}</p><p className="workbench-muted">{readOnly ? "Generated output" : dirty ? "Changes kept in this workspace" : "Source saved"}</p></div>
          {!readOnly && <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={!dirty} onClick={() => update((state) => revertScriptSourceFile(state, path))}>Revert</Button>
            <Button size="sm" disabled={!dirty} onClick={() => update((state) => saveScriptSourceFile(state, path))}>Save source</Button>
          </div>}
        </div>
        <Editor height="400px" language="lua" path={`file:///workspace/${path}`} value={content}
          onChange={(value) => { if (value !== undefined && !readOnly) update((state) => updateScriptSourceContent(state, path, value)); }}
          theme="vs-dark" options={{ readOnly, minimap: { enabled: false }, fontSize: 13, wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, ariaLabel: "Lua source editor" }} />
      </div>
      </div>
      {referenceOpen && <ScriptHookApiExplorer workspace={workspace} gameId={workspace.context.gameId} supportedHooks={workspace.context.supportedHooks} />}
      </div>
      <p className="workbench-muted" role="status">Lua intelligence: {getLuaIntelligenceStatus(hasConfiguredApiEndpoint(), status)}. Build the bundle, then test in game to verify behavior.</p>
      {status === "unavailable" && scriptLspClient.lastError && <p className="text-xs text-amber-300">{scriptLspClient.lastError}</p>}
      <details className="text-xs text-slate-400"><summary className="cursor-pointer">Code assistance and shortcuts</summary><div className="mt-2 grid gap-2">
        <p>Ctrl+Space opens completion. Ctrl+Shift+Space opens parameter help. Hover a function for documentation. With LuaLS connected, F12 goes to a definition, Shift+F12 finds references, and Ctrl+Shift+O lists symbols.</p>
        <p>Built-in assistance provides game-specific API snippets, function hover help and parameter hints. LuaLS adds local variables, inferred types, context fields, helper-module navigation and Lua diagnostics.</p>
        {status !== "connected" && <><p>Full assistance needs a configured API backend with lua-language-server installed on its PATH. IDE exports include .luarc.json and generated types for your own LuaLS editor.</p><Button size="sm" variant="secondary" className="justify-self-start" disabled={!hasConfiguredApiEndpoint() || status === "connecting"} onClick={() => { void scriptLspClient.connect(workspace).match(() => undefined, () => undefined); }}>Reconnect LuaLS</Button></>}
      </div></details>
      {(findings.length > 0 || diagnostics.length > 0) && <div className="workbench-notice" data-tone="warning">
        {findings.map((finding) => <p key={`${finding.line}-${finding.message}`}>Line {finding.line}: {finding.message}</p>)}
        {diagnostics.map((entry) => <p key={`${entry.code}-${entry.line}-${entry.message}`}>Line {entry.line}: {entry.message}</p>)}
      </div>}
    </div>
  );
}
