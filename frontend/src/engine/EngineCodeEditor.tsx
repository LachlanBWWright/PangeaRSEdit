import { memo, useEffect, useEffectEvent, useSyncExternalStore } from "react";
import Editor from "@monaco-editor/react";
import { hasConfiguredApiEndpoint } from "@/api/apiBase";
import { configureScriptMonaco, ensureScriptMonacoConfigured } from "@/editor/subviews/scripts/scriptMonaco";
import { scriptLspClient } from "@/editor/subviews/scripts/scriptLspClient";
import type { ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceStateTypes";
import { registerEngineCompletion } from "./engineCompletion";

interface Props { path: string; content: string; workspace: ScriptWorkspaceState; onChange: (value: string) => void }
export default memo(function EngineCodeEditor({ path, content, workspace, onChange }: Props) {
  const status = useSyncExternalStore((listener) => scriptLspClient.subscribe(listener), () => scriptLspClient.getStatus());
  useEffect(() => {
    ensureScriptMonacoConfigured();
    const disposables = [...configureScriptMonaco({ context: workspace.context }), registerEngineCompletion()];
    return () => { for (const disposable of disposables) disposable.dispose(); };
  }, [workspace.context]);
  const synchronize = useEffectEvent(() => {
    if (hasConfiguredApiEndpoint()) void scriptLspClient.connect(workspace).match(() => undefined, () => undefined);
  });
  useEffect(() => { synchronize(); }, [workspace]);
  useEffect(() => () => { void scriptLspClient.disconnect().match(() => undefined, () => undefined); }, []);
  return <section className="engine-code-editor" aria-label="Package source editor">
    <Editor height="100%" language={path.endsWith(".lua") ? "lua" : "json"} path={`file:///workspace/Data/Scripts/src/${path}`} value={content}
      theme="vs-dark" onChange={(value) => { if (value !== undefined) onChange(value); }}
      options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 13, wordWrap: "on", scrollBeyondLastLine: false, tabSize: 2, ariaLabel: "Package source" }} />
    <p className="engine-muted">Lua assistance: {status === "connected" ? "LuaLS connected" : "built-in API completion"}.</p>
  </section>;
});
