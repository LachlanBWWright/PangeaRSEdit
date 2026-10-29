import type { PreviewVfsFile } from "./utils/gamePreviewRuntime";
import type { PangeaScriptStatusJS } from "./utils/scriptRuntimeStatus";
import { scriptingRuntimeHealth } from "./utils/scriptRuntimeHealth";
import { ScriptInspector } from "./ScriptInspector";
import type { ScriptInspectorSnapshot } from "@pangea/desktop-contracts";
import type { ScriptNavigationContext } from "./useScriptDiagnosticNavigation";
import type { QueryScriptObjects } from "./utils/scriptInspector";
import type { QueryScriptState } from "./utils/scriptState";

interface Props {
  status: PangeaScriptStatusJS | null;
  previewError: string | null;
  files: readonly PreviewVfsFile[];
  inspector?: ScriptInspectorSnapshot | null;
  inspectorError?: string;
  navigationContext?: ScriptNavigationContext;
  queryObjects?: QueryScriptObjects;
  queryState?: QueryScriptState;
}

const tones = {
  waiting: "border-slate-700 text-slate-300", inactive: "border-amber-900 text-amber-300",
  disabled: "border-red-900 text-red-300", failed: "border-red-900 text-red-300",
  unverified: "border-amber-900 text-amber-300", recovered: "border-amber-900 text-amber-300",
  passed: "border-green-900 text-green-300",
};

export function ScriptRuntimeMonitor({ status, previewError, files, inspector, inspectorError, navigationContext, queryObjects, queryState }: Props) {
  const health = scriptingRuntimeHealth(status, previewError);
  const error = status?.lastError || previewError;
  return <aside aria-label="Scripting runtime monitor" className="w-80 max-h-full shrink-0 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/90 p-4 text-xs text-slate-300">
    <h3 className="mb-4 border-b border-slate-800 pb-2 text-sm font-semibold text-slate-100">Scripting runtime monitor</h3>
    <div role="status" className={`space-y-1 rounded border p-2 ${tones[health.kind]}`}>
      <p className="font-semibold">{health.title}</p><p>{health.detail}</p>
    </div>
    {status && <>
      <dl className="my-4 grid grid-cols-[1fr_auto] gap-2">
        <dt>Host status</dt><dd>{status.scriptsDisabled ? "Disabled" : status.enabled ? "Active" : "Inactive"}</dd>
        <dt>Config file</dt><dd>{status.configLoaded ? "Loaded" : "Not loaded"}</dd>
        <dt>Bundle status</dt><dd>{status.bundleLoaded ? "Loaded" : "Not loaded"}</dd>
      </dl>
      <div className="border-t border-slate-800 py-2"><p>Active script path</p><p className="break-all text-slate-200">{status.activeScriptPath || "No active bundle"}</p></div>
      <dl className="grid grid-cols-[1fr_auto] gap-2 border-t border-slate-800 py-2">
        <dt>Hook dispatches since bundle load</dt><dd>{status.hooksCalledCount}</dd>
        <dt>Runtime error count</dt><dd>{status.errorCount}</dd>
        <dt>Budget overruns this session</dt><dd>{status.budgetExceededCount}</dd>
      </dl>
    </>}
    {error && <div className="border-t border-slate-800 py-2"><p className="font-medium text-red-400">Latest error</p><pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-900 p-2 text-[10px] text-red-200">{error}</pre></div>}
    <ScriptInspector snapshot={inspector ?? null} unavailable={inspectorError} navigationContext={navigationContext} queryObjects={queryObjects} queryState={queryState} />
    <div className="border-t border-slate-800 pt-3"><h4 className="mb-2 font-semibold text-slate-200">Injected VFS files</h4>
      <ul className="space-y-1">{files.map((file) => <li key={file.path} className="break-all rounded border border-slate-800/80 bg-slate-900/50 p-1.5 text-[10px] text-slate-400">{file.path}</li>)}</ul>
    </div>
  </aside>;
}
