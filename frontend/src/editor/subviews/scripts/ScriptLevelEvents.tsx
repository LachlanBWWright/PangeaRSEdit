import { useState } from "react";
import { Plus, Code2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTHORITATIVE_API_SCHEMA } from "./scriptApiSchema";
import { getLevelState } from "./scriptWorkspaceHelpers";
import { scriptHookGroup, scriptHookLabel } from "./scriptHookGroups";
import { getScriptBehaviorOptions } from "./scriptWorkspaceSelectors";
import { applyGlobalBehavior, removeGlobalAssignment, type ScriptHookId, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";

export function ScriptLevelEvents({ workspace, update, onCreate, onOpenSource }: {
  workspace: ScriptWorkspaceState;
  update: UpdateScriptWorkspace;
  onCreate: (hook: ScriptHookId) => void;
  onOpenSource: (path: string) => void;
}) {
  const [search, setSearch] = useState("");
  const level = getLevelState(workspace);
  const groups = ["Lifecycle", "Objects and players", "Interaction", "Combat", "Progression", "Save and load"];
  const active = level.globalHooks;
  return <section className="grid content-start gap-6 min-w-0">
    <div><h2>Events on this level</h2><p className="workbench-muted">Choose when something happens, then edit the Lua that responds.</p></div>
    {active.length === 0 ? <div className="workbench-notice"><p className="font-medium">Start with a level event</p><p className="mt-1">Display a message, change a rule, or react to an interaction. Events you add appear here.</p></div> : <div>{active.map((assignment) => <div className="workbench-event-row" key={assignment.id}>
      <div className="flex items-start justify-between gap-3"><div><h3>{scriptHookLabel(assignment.hookId)}</h3><p className="workbench-muted">{assignment.label}</p></div><Button size="sm" variant="ghost" aria-label={`Remove ${assignment.label} event`} onClick={() => update((state) => removeGlobalAssignment(state, assignment.id))}><X size={16} /></Button></div>
      <div className="workbench-event-actions"><Button size="sm" variant="secondary" onClick={() => onOpenSource(assignment.sourceFilePath)}><Code2 size={14} className="mr-2" />Edit source</Button><code className="break-all text-xs text-slate-400">{assignment.hookId}</code></div>
    </div>)}</div>}
    <div className="grid gap-4"><h3>Add an event</h3><Input aria-label="Search level events" placeholder="Search events, e.g. damage or checkpoint" value={search} onChange={(event) => setSearch(event.target.value)} />
      {groups.map((group) => {
        const hooks = workspace.context.supportedHooks.filter((hook) => scriptHookGroup(hook) === group && !active.some((entry) => entry.hookId === hook)
          && `${scriptHookLabel(hook)} ${hook}`.toLowerCase().includes(search.toLowerCase()));
        if (!hooks.length) return null;
        return <details key={group} open={search.length > 0 || group === "Lifecycle"} className="border-b border-slate-700 pb-3"><summary className="cursor-pointer text-sm font-medium">{group} <span className="text-slate-400">({hooks.length})</span></summary><div className="mt-2">{hooks.map((hook) => {
          const metadata = AUTHORITATIVE_API_SCHEMA.hooks.find((entry) => entry.name === hook);
          const options = getScriptBehaviorOptions(workspace, "global", hook);
          return <div key={hook} className="workbench-event-row"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{scriptHookLabel(hook)}</p><p className="workbench-muted">{metadata?.description}</p></div><Button size="sm" variant="ghost" onClick={() => onCreate(hook)} aria-label={`Create ${scriptHookLabel(hook)} handler`}><Plus size={16} /></Button></div>
            {options.length > 0 && <label className="workbench-muted">Use existing script<select aria-label={`Assign ${scriptHookLabel(hook)}`} className="ml-2 max-w-full rounded border border-slate-600 bg-slate-900 p-1" value="" onChange={(event) => { if (event.target.value) update((state) => applyGlobalBehavior(state, hook, event.target.value)); }}><option value="">Choose a script…</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
          </div>;
        })}</div></details>;
      })}
      <p className="workbench-muted">Assignments stay on this level. Source files and custom object definitions are shared by the game.</p>
    </div>
  </section>;
}
