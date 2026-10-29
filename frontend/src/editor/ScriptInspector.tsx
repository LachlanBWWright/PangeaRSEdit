import { useState } from "react";
import type { ScriptInspectorSnapshot } from "@pangea/desktop-contracts";
import { ScriptDiagnostics } from "./ScriptDiagnostics";
import { useScriptDiagnosticNavigation, type ScriptNavigationContext } from "./useScriptDiagnosticNavigation";
import { DiagnosticPlacementAction } from "./ScriptDiagnosticActions";
import { useScriptObjectPage } from "./useScriptObjectPage";
import { parseScriptObjectHandle, type QueryScriptObjects } from "./utils/scriptInspector";
import { inspectorNavigationSnapshot } from "./scriptDiagnosticNavigation";
import { ScriptInstanceState } from "./ScriptInstanceState";
import type { QueryScriptState } from "./utils/scriptState";
import { ScriptNativePerformance } from "./ScriptNativePerformance";
import { ScriptObjectResources } from "./ScriptObjectResources";

interface Props { snapshot: ScriptInspectorSnapshot | null; unavailable?: string; navigationContext?: ScriptNavigationContext; queryObjects?: QueryScriptObjects; queryState?: QueryScriptState }

export function ScriptInspector({ snapshot, unavailable, navigationContext = {}, queryObjects, queryState }: Props) {
  const [selection, setSelection] = useState("");
  const [handleText, setHandleText] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const { page, error, request, setRequest } = useScriptObjectPage(snapshot, queryObjects);
  const { navigation, editor } = useScriptDiagnosticNavigation(inspectorNavigationSnapshot(snapshot, page.objects), navigationContext);
  if (!snapshot) return <section aria-label="Live script inspector" className="mt-4 border-t border-slate-700 pt-3"><h4 className="font-semibold">Live script inspector</h4><p className="mt-2 text-slate-400">{unavailable ?? "Waiting for a runtime snapshot. Older game builds must be rebuilt to enable inspection."}</p></section>;
  const runtime = snapshot.runtime;
  const object = selection ? page.objects.find((entry) => `${entry.id}:${entry.generation}` === selection) : page.objects[0];
  return <section aria-label="Live script inspector" className="mt-4 space-y-3 border-t border-slate-700 pt-3 text-xs">
    <h4 className="font-semibold">Live script inspector</h4>
    <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 break-words">
      <dt>Frame</dt><dd>{runtime.frame}</dd>
      <dt>Lua memory</dt><dd>{Math.round(runtime.memoryUsedBytes / 1024)} / {Math.round(runtime.memoryLimitBytes / 1024)} KiB</dd>
      <dt>Timers</dt><dd>{runtime.timers} / {runtime.timerLimit}</dd>
      <dt>Tasks</dt><dd>{runtime.tasks} / {runtime.taskLimit}</dd>
      <dt>Subscriptions</dt><dd>{runtime.subscriptions} / {runtime.subscriptionLimit}</dd>
      <dt>Instruction budgets: load / event / frame</dt><dd>{runtime.loadBudget} / {runtime.eventBudget} / {runtime.frameBudget}</dd>
      <dt>Budget overruns</dt><dd>{snapshot.budgetOverruns}</dd>
      <dt>Runtime errors</dt><dd>{snapshot.errors}</dd>
      {snapshot.callbackFailures !== undefined && <><dt>Failed callbacks</dt><dd>{snapshot.callbackFailures}</dd></>}
      {snapshot.commandRejections !== undefined && <><dt>Rejected commands</dt><dd>{snapshot.commandRejections}</dd></>}
      <dt>Script host</dt><dd>{snapshot.disabled ? "Disabled after errors" : snapshot.enabled ? "Active" : "Inactive"}</dd>
      <dt>Automatic rules</dt><dd>{snapshot.rulesControlled ? "Script controlled" : "Native"}</dd>
    </dl>
    {snapshot.lastError && <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-red-300">{snapshot.lastError}</pre>}
    <ScriptDiagnostics diagnostics={runtime.diagnostics} navigation={navigation} />
    <ScriptNativePerformance costs={snapshot.nativeCosts} />
    {queryObjects && <div className="space-y-2">
      <label className="flex items-center gap-2"><input type="checkbox" checked={request.scriptedOnly} onChange={(event) => { setSelection(""); setHistory([]); setRequest({ offset: 0, scriptedOnly: event.target.checked }); }} />Scripted objects only</label>
      <form className="flex gap-2" onSubmit={(event) => {
        event.preventDefault();
        const handle = parseScriptObjectHandle(handleText);
        if (handle.isErr()) { setLookupError(handle.error); return; }
        setLookupError(""); setSelection(`${handle.value.id}:${handle.value.generation}`); setRequest({ ...request, handle: handle.value });
      }}><input aria-label="Object handle" placeholder="id:generation" className="min-w-0 flex-1 rounded border bg-slate-900 p-2" value={handleText} onChange={(event) => setHandleText(event.target.value)} /><button type="submit">Find</button></form>
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={!history.length && !request.handle} onClick={() => { setSelection(""); setRequest({ offset: request.handle ? request.offset : history.at(-1) ?? 0, scriptedOnly: request.scriptedOnly }); if (!request.handle) setHistory(history.slice(0, -1)); }}>Previous</button>
        <span>{request.handle ? "Handle lookup" : `${page.objects.length ? page.offset + 1 : 0}–${page.offset + page.objects.length} of ${page.total}`}</span>
        <button disabled={page.nextOffset === null} onClick={() => { if (page.nextOffset !== null) { setSelection(""); setHistory([...history, request.offset]); setRequest({ offset: page.nextOffset, scriptedOnly: request.scriptedOnly }); } }}>Next</button>
      </div>
      {(error || lookupError) && <p role="alert">{lookupError || error}</p>}
    </div>}
    <label className="grid gap-1">Registered objects ({snapshot.registeredObjects})
      <select aria-label="Inspected script object" className="w-full min-w-0 rounded border bg-slate-900 p-2" value={selection || (object ? `${object.id}:${object.generation}` : "")} onChange={(event) => setSelection(event.target.value)}>
        {!page.objects.length && <option value="">No live objects</option>}
        {selection && !object && <option value={selection}>Object {selection} is no longer on this page</option>}
        {page.objects.map((entry) => <option key={`${entry.id}:${entry.generation}`} value={`${entry.id}:${entry.generation}`}>{entry.definition || entry.type} · {entry.id}:{entry.generation}</option>)}
      </select>
    </label>
    {snapshot.truncated && !queryObjects && <p>Showing a bounded preview of {snapshot.objects.length} objects. Rebuild the runtime to browse all objects.</p>}
    {object && <>
      <DiagnosticPlacementAction handle={object} navigation={navigation} />
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 break-words">
        <dt>Controller</dt><dd>{object.controlled ? "Lua" : "Native"}</dd>
        <dt>Enabled</dt><dd>{object.enabled ? "Yes" : "No"}</dd>
        <dt>Owner</dt><dd>{object.owner ? `${object.owner.id}:${object.owner.generation}` : "None"}</dd>
        <dt>Position</dt><dd>{object.position ? [object.position.x, object.position.y, object.position.z].map((value) => value.toFixed(1)).join(", ") : "Unavailable"}</dd>
      </dl>
      <ScriptInstanceState handle={object} query={queryState} preview={object.state} />
      <ScriptObjectResources handle={object} query={queryObjects} resources={object.resources} />
    </>}
    {editor}
  </section>;
}
