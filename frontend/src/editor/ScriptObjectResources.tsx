import { useEffect, useState } from "react";
import type { ScriptObjectResources as ObjectResources } from "@pangea/desktop-contracts";
import type { QueryScriptObjects } from "./utils/scriptInspector";

interface Handle { id: number; generation: number }
interface Props { handle: Handle; query?: QueryScriptObjects; resources?: ObjectResources }
interface ResourceLocation { source: string; callback: string; line: number }

function ResourceContext({ source, callback, line }: ResourceLocation) {
  return <span className="block break-all text-slate-400">{source ? `${source}${line ? `:${line}` : ""}` : "Source unavailable"}{callback && ` · ${callback}`}</span>;
}

export function ScriptObjectResourceDetails({ resources }: { resources: ObjectResources }) {
  return <div className="space-y-2">
    <p className="text-slate-400">Owned by this exact object generation. Times use the level clock.</p>
    <details><summary>Timers ({resources.timers.total})</summary>
      <ul className="space-y-2 py-2">{resources.timers.entries.map((timer) => <li key={timer.id}>
        #{timer.id} · {timer.repeating ? `Every ${timer.intervalSeconds.toFixed(2)}s` : "Once"} · due in {Math.max(0, timer.dueTimeSeconds - resources.timeSeconds).toFixed(2)}s
        <ResourceContext {...timer} />
      </li>)}</ul>
      {resources.timers.truncated && <p>Some timer details were omitted by this runtime.</p>}
    </details>
    <details><summary>Tasks ({resources.tasks.total})</summary>
      <ul className="space-y-2 py-2">{resources.tasks.entries.map((task) => <li key={task.id}>
        #{task.id} · {task.status}{task.status === "sleeping" && ` · wakes in ${Math.max(0, task.dueTimeSeconds - resources.timeSeconds).toFixed(2)}s`}
        <ResourceContext {...task} />
      </li>)}</ul>
      {resources.tasks.truncated && <p>Some task details were omitted by this runtime.</p>}
    </details>
    <details><summary>Event subscriptions ({resources.subscriptions.total})</summary>
      <ul className="space-y-2 py-2">{resources.subscriptions.entries.map((subscription) => <li key={subscription.id}>
        #{subscription.id} · {subscription.event} · {subscription.once ? "Once" : "Repeating"}
        <ResourceContext {...subscription} />
      </li>)}</ul>
      {resources.subscriptions.truncated && <p>Some subscription details were omitted by this runtime.</p>}
    </details>
  </div>;
}

export function ScriptObjectResources({ handle, query, resources }: Props) {
  const [result, setResult] = useState<{ key: string; resources?: ObjectResources; error: string } | null>(null);
  const key = `${handle.id}:${handle.generation}`;
  useEffect(() => {
    if (!query) return;
    let disposed = false;
    let pending = false;
    async function refresh() {
      if (!query || pending) return;
      pending = true;
      const response = await query({ offset: 0, scriptedOnly: false, handle: { id: handle.id, generation: handle.generation } });
      pending = false;
      if (disposed) return;
      if (response.isErr()) { setResult({ key, error: response.error }); return; }
      const object = response.value.objects.find((entry) => entry.id === handle.id && entry.generation === handle.generation);
      setResult({ key, resources: object?.resources, error: object ? "" : "This object is no longer registered." });
    }
    const initial = setTimeout(refresh, 0);
    const interval = setInterval(refresh, 1000);
    return () => { disposed = true; clearTimeout(initial); clearInterval(interval); };
  }, [query, handle.id, handle.generation, key]);
  const current = result?.key === key ? result : null;
  const displayed = current ? current.resources : resources;
  return <section aria-label="Object-owned resources" className="space-y-2">
    <h5 className="font-semibold">Object-owned resources</h5>
    {current?.error ? <p role="status">{current.error}</p> : displayed ? <ScriptObjectResourceDetails resources={displayed} /> : <p>{query && !current ? "Loading object resources…" : "Rebuild this game runtime to inspect object-owned resources."}</p>}
  </section>;
}
