import type { ScriptInspectorSnapshot } from "@pangea/desktop-contracts";
import { groupNativeCosts, type NativeCostGroup } from "./scriptNativeCostGroups";
import { nativeMilliseconds } from "./nativeMilliseconds";

type Window = NonNullable<NonNullable<ScriptInspectorSnapshot["nativeCosts"]>["window"]>;

function CostGroups({ entries, title }: { entries: NativeCostGroup[]; title: string }) {
  return <details className="rounded border border-slate-700 p-2">
    <summary className="cursor-pointer">{title}</summary>
    <ul className="space-y-2 pt-2">{entries.map((entry) => <li key={entry.label}>
      <p className="break-all font-medium">{entry.label}</p>
      <p>{entry.calls.toLocaleString()} calls · total {nativeMilliseconds(entry.milliseconds)} · maximum {nativeMilliseconds(entry.maxMilliseconds)} · {entry.slowCalls} calls ≥ 2 ms</p>
    </li>)}</ul>
    {!entries.length && <p>No attributed native operations.</p>}
  </details>;
}

export function ScriptNativePerformanceHistory({ window }: { window: Window }) {
  const average = window.frames ? window.milliseconds / window.frames : 0;
  return <section aria-label="Native cost rolling history" className="space-y-2">
    <h6 className="font-semibold">Last {window.frames} observed frames (up to {window.capacity})</h6>
    <p>Level {window.level} · {window.calls.toLocaleString()} calls · total {nativeMilliseconds(window.milliseconds)} · average {nativeMilliseconds(average)} per observed frame</p>
    <p className="text-slate-400">Includes the current, possibly incomplete frame. Resets on level changes and runtime restart; reloaded scripts remain attributed by source. Object generations remain separate.</p>
    {window.truncated && <p role="status">Attribution is incomplete: {window.unattributedCalls.toLocaleString()} calls ({nativeMilliseconds(window.unattributedMilliseconds)}) are included in totals but omitted from the lists. Limits: 32 source/object pairs per frame, 64 per window.</p>}
    {window.sourceTruncated && <p>Source names exceeding the runtime limit are counted without caller attribution.</p>}
    <CostGroups title="Totals by script" entries={groupNativeCosts(window.entries, "script")} />
    <CostGroups title="Totals by object" entries={groupNativeCosts(window.entries, "object")} />
    <details className="rounded border border-slate-700 p-2">
      <summary className="cursor-pointer">Frame history (oldest first)</summary>
      <div className="max-h-56 overflow-auto"><table className="w-full text-left">
        <caption className="sr-only">Measured native operation totals by frame</caption>
        <thead><tr><th>Frame</th><th>Calls</th><th>Total</th><th>Maximum call</th><th>Calls ≥ 2 ms</th></tr></thead>
        <tbody>{window.history.map((frame) => <tr key={frame.frame}><td>{frame.frame}</td><td>{frame.calls}</td><td>{nativeMilliseconds(frame.milliseconds)}</td><td>{nativeMilliseconds(frame.maxMilliseconds)}</td><td>{frame.slowCalls}</td></tr>)}</tbody>
      </table></div>
    </details>
  </section>;
}
