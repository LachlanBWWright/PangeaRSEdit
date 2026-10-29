import type { ScriptInspectorSnapshot } from "@pangea/desktop-contracts";
import { ScriptNativePerformanceHistory } from "./ScriptNativePerformanceHistory";
import { nativeMilliseconds } from "./nativeMilliseconds";
export { nativeMilliseconds } from "./nativeMilliseconds";

type NativeCosts = NonNullable<ScriptInspectorSnapshot["nativeCosts"]>;

function NativeFrame({ frame, title }: { frame: NativeCosts["current"]; title: string }) {
  return <details className="rounded border border-slate-700 p-2">
    <summary className="cursor-pointer">{title}: {frame.calls.toLocaleString()} calls, {nativeMilliseconds(frame.milliseconds)}</summary>
    <p className="my-2 text-slate-400">Level {frame.level}, frame {frame.frame}</p>
    <ul className="space-y-2">
      {frame.operations.map((entry) => <li className="border-t border-slate-800 pt-2" key={entry.operation}>
        <p className="break-all font-medium">{entry.operation}</p>
        <p>{entry.calls.toLocaleString()} calls · total {nativeMilliseconds(entry.milliseconds)} · maximum {nativeMilliseconds(entry.maxMilliseconds)}</p>
        <p>{entry.slowCalls.toLocaleString()} {entry.slowCalls === 1 ? "call" : "calls"} at or above 2 ms</p>
        <p className="break-all">Slowest call: {entry.source || "Source unavailable"}{entry.object ? ` · object ${entry.object.id}:${entry.object.generation}` : ""}</p>
      </li>)}
    </ul>
    {!frame.operations.length && <p>No measured native operations.</p>}
  </details>;
}

export function ScriptNativePerformance({ costs }: { costs: ScriptInspectorSnapshot["nativeCosts"] }) {
  return <section aria-label="Native operation performance" className="space-y-2">
    <h5 className="font-semibold">Native operation performance</h5>
    <p className="text-slate-400">Elapsed time inside instrumented native operations, separate from Lua instruction budgets. Nested calls can overlap, so these totals are not exclusive CPU or frame times. Timings vary by device; the 2 ms slow-call threshold is observational and does not interrupt work.</p>
    {costs ? <>
      <NativeFrame frame={costs.current} title="Current native frame" />
      <NativeFrame frame={costs.previous} title="Previous native frame" />
      {costs.window ? <ScriptNativePerformanceHistory window={costs.window} /> : <p>Rebuild the game for rolling native history and caller totals.</p>}
    </> : <p>Rebuild the game to measure native operation costs.</p>}
  </section>;
}
