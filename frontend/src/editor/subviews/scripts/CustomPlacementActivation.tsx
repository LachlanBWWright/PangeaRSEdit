import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScriptCustomObjectPlacement } from "./scriptWorkspaceStateTypes";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";
import { setCustomPlacementActivation } from "./scriptPlacementActivation";

function changeActivation(update: UpdateScriptWorkspace, placementId: string, kind: string, radius: number) {
  const activation = kind === "near-player" ? { kind, radius } : { kind };
  update((workspace) => setCustomPlacementActivation(workspace, placementId, activation).unwrapOr(workspace));
}

export function CustomPlacementActivation({ placement, update }: { placement: ScriptCustomObjectPlacement; update: UpdateScriptWorkspace }) {
  const kind = placement.activation?.kind ?? "always";
  const radius = placement.activation?.kind === "near-player" ? placement.activation.radius : 3000;
  return <div className="space-y-2">
    <Label htmlFor="placement-activation">Activation</Label>
    <Select value={kind} onValueChange={(value) => changeActivation(update, placement.id, value, radius)}>
      <SelectTrigger id="placement-activation"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="always">Always active</SelectItem>
        <SelectItem value="near-player">Near a player</SelectItem>
      </SelectContent>
    </Select>
    {kind === "near-player" && <>
      <Label htmlFor="placement-activation-radius">Activation radius (world units)</Label>
      <Input key={`${placement.id}:${radius}`} id="placement-activation-radius" type="number" min={1} step="any" defaultValue={radius} onBlur={(event) => {
        const value = event.target.valueAsNumber;
        if (!Number.isFinite(value) || value <= 0) { event.target.value = String(radius); return; }
        changeActivation(update, placement.id, kind, value);
      }} />
      <p className="text-xs text-slate-400">Appears within this horizontal distance of any player. Leaving 120% of the radius destroys the object and cleans up its owned timers. Returning starts a fresh instance with these overrides. Spawned enemies are cleaned up by the behavior.</p>
    </>}
    {kind === "always" && <p className="text-xs text-slate-400">Spawns at level start and stays active until removed or the level ends.</p>}
  </div>;
}
