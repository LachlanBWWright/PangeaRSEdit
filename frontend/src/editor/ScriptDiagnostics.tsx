import type { ScriptDiagnostics as Diagnostics } from "@pangea/desktop-contracts";
import { DiagnosticPlacementAction, DiagnosticSourceAction } from "./ScriptDiagnosticActions";
import type { DiagnosticNavigation, ScriptAttribution } from "./scriptDiagnosticNavigation";

function AttributionDetails({ entry, navigation }: { entry: ScriptAttribution; navigation?: DiagnosticNavigation }) {
  return <>
    <p className="font-medium">{entry.callback || "Module evaluation"}</p>
    <p className="break-all">{entry.source || "Source unavailable"}{entry.line > 0 ? `:${entry.line}` : ""}</p>
    {navigation && <DiagnosticSourceAction entry={entry} navigation={navigation} />}
    <p>{entry.object ? `Object ${entry.object.id}:${entry.object.generation}` : "No object context"}</p>
    {navigation && entry.object && <DiagnosticPlacementAction handle={entry.object} navigation={navigation} />}
  </>;
}

function FrameUsage({ frame, title, navigation }: { frame: Diagnostics["frame"]; title: string; navigation?: DiagnosticNavigation }) {
  return <details className="rounded border border-slate-700 p-2">
    <summary className="cursor-pointer">{title}: {frame.instructions.toLocaleString()} / {frame.limit.toLocaleString()} instructions</summary>
    <p className="my-2 text-slate-400">Level {frame.level}, frame {frame.frame}</p>
    <ol className="space-y-2">
      {frame.entries.map((entry, index) => <li key={index} className="border-t border-slate-800 pt-2">
        <AttributionDetails entry={entry} navigation={navigation} />
        <p>{entry.instructions.toLocaleString()} instructions</p>
      </li>)}
    </ol>
    {!frame.entries.length && <p>No attributed callback work.</p>}
    {frame.unattributedInstructions > 0 && <p>{frame.unattributedInstructions.toLocaleString()} instructions without callback attribution.</p>}
    {frame.truncated && <p>Attribution is limited to 32 entries; totals include all work.</p>}
  </details>;
}

const failureNames = {
  "callback-error": "Callback exception",
  "budget-exceeded": "Instruction budget exceeded",
  "rejected-command": "Command rejected",
  none: "No failure",
};

export function ScriptDiagnostics({ diagnostics, navigation }: { diagnostics: Diagnostics | undefined; navigation?: DiagnosticNavigation }) {
  if (!diagnostics) return <p className="text-slate-400">Rebuild the game to see callback diagnostics and frame usage.</p>;
  const failure = diagnostics.lastFailure;
  return <div className="space-y-2">
    {failure.kind !== "none" && <section aria-label="Latest Lua diagnostic" className="space-y-1 rounded border border-amber-900 p-2">
      <h5 className="font-semibold text-amber-300">{failureNames[failure.kind]}</h5>
      <AttributionDetails entry={failure} navigation={navigation} />
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words">{failure.message}</pre>
    </section>}
    <FrameUsage title="Current frame" frame={diagnostics.frame} navigation={navigation} />
    {diagnostics.previousFrame && <FrameUsage title="Previous frame" frame={diagnostics.previousFrame} navigation={navigation} />}
  </div>;
}
