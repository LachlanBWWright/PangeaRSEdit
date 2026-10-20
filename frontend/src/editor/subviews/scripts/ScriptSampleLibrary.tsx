import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getScriptSamples, loadScriptSample, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";

export function ScriptSampleLibrary({ workspace, update }: { workspace: ScriptWorkspaceState; update: UpdateScriptWorkspace }) {
  const samples = useMemo(() => getScriptSamples(workspace.context), [workspace.context]);
  const [selected, setSelected] = useState("");
  const [previous, setPrevious] = useState<ScriptWorkspaceState | null>(null);
  const sample = samples.find((entry) => entry.id === selected);
  return <details className="rounded-lg border border-slate-700 p-4"><summary className="cursor-pointer font-medium">Explore a sample workspace</summary><div className="mt-4 grid gap-3">
    <p className="workbench-muted">Object starters are available in New object. These examples replace the scripting workspace for this game, including all stored levels.</p>
    <select className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-3" aria-label="Sample workspace" value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Choose a sample…</option>{samples.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select>
    {sample && <><p className="workbench-muted">{sample.description}</p><Button variant="secondary" onClick={() => { setPrevious(workspace); update(() => loadScriptSample(workspace.context, sample.id)); }}>Replace workspace with sample</Button></>}
    {previous && <Button variant="outline" onClick={() => { update(() => previous); setPrevious(null); }}>Undo sample replacement</Button>}
  </div></details>;
}
