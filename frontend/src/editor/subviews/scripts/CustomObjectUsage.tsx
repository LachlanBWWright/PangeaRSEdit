import { Button } from "@/components/ui/button";
import { ScriptNumberField } from "./ScriptNumberField";
import { getObjectUsage } from "./scriptObjectActions";
import { moveCustomPlacement, removeCustomPlacement, type ScriptCustomObjectDefinition, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";

export function CustomObjectUsage({ workspace, definition, update, onPlace, onSelectPlacement }: {
  workspace: ScriptWorkspaceState;
  definition: ScriptCustomObjectDefinition;
  update: UpdateScriptWorkspace;
  onPlace?: (id: string) => void;
  onSelectPlacement?: (id: string) => void;
}) {
  const usage = getObjectUsage(workspace, definition.id);
  return <div className="workbench-section">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3>Where this object is used</h3><p className="workbench-muted">Appearance, collision and Lua behavior belong to the shared definition. Position and parameter overrides belong to each placement; changing positions here affects only that placement.</p></div>{onPlace && <Button onClick={() => onPlace(definition.id)}>Place in level</Button>}</div>
    {usage.length === 0 && <p className="workbench-notice">No instances yet. {onPlace ? "Place this object, then click its position on the map." : "Open a level and choose this object from its Objects tab to place an instance."}</p>}
    {usage.map((entry, index) => <section key={`${entry.levelKey}-${index}`} className="grid gap-3 rounded-lg border border-slate-700 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3>{entry.label}</h3><p className="workbench-muted">{entry.levelKey === "current" ? "Unassigned level" : `Level ${entry.levelKey}`}</p></div>
        {entry.placement && entry.levelKey === workspace.context.levelKey && <div className="flex gap-2">{onSelectPlacement && <Button size="sm" variant="secondary" onClick={() => { if (entry.placement) onSelectPlacement(entry.placement.id); }}>Select on map</Button>}<Button size="sm" variant="ghost" onClick={() => { if (entry.placement) update((state) => removeCustomPlacement(state, entry.placement.id)); }}>Remove instance</Button></div>}
      </div>
      {entry.placement && entry.levelKey === workspace.context.levelKey && <div className="grid gap-3 sm:grid-cols-3">{(["x", "y", "z"] satisfies readonly ("x" | "y" | "z")[]).map((axis) => <ScriptNumberField key={axis} label={`Position ${axis}`} value={entry.placement?.position[axis] ?? 0} min={-1000000} max={1000000} step={0.1} onChange={(value) => {
        if (!entry.placement) return;
        const placementId = entry.placement.id;
        update((state) => {
          const current = state.levels[state.context.levelKey]?.customPlacements.find((placement) => placement.id === placementId);
          return current ? moveCustomPlacement(state, current.id, { ...current.position, [axis]: value }) : state;
        });
      }} />)}</div>}
    </section>)}
  </div>;
}
