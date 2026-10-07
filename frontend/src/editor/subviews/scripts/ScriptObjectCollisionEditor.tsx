import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScriptObjectNumberField } from "./ScriptObjectNumberField";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";

interface Props {
  readonly definition: ScriptCustomObjectDefinition;
  readonly onUpdate: (definition: ScriptCustomObjectDefinition) => void;
}
const presetSchema = z.enum(["solidBox", "triggerBox", "pickup", "enemy", "platform"]);
const descriptions = {
  solidBox: "Blocks movement. Size the box to the part of the object that should be solid.",
  triggerBox: "Detects contact. Use onTrigger to decide what contact does and whether movement is blocked.",
  pickup: "Detects player collection. Use onPickupCollected for the item’s effect.",
  enemy: "Participates in enemy contact and damage. Initialize health in onSpawn and handle damage in the item script.",
  platform: "Provides a platform collision surface. Move the item in its frame callback.",
};

export function ScriptObjectCollisionEditor({ definition, onUpdate }: Props) {
  const collision = definition.collision;
  const bounds = collision.kind === "preset" ? collision.bounds : undefined;
  const updateBounds = (axis: "width" | "height" | "depth", value: number) => {
    if (collision.kind !== "preset" || !bounds) return;
    onUpdate({ ...definition, collision: { ...collision, bounds: { ...bounds, [axis]: value } } });
  };
  return <section className="grid min-w-0 gap-3 border-t border-slate-800 py-5">
    <h3 className="text-sm font-semibold text-white">Collision</h3>
    <div className="grid gap-1"><Label>Contact behavior</Label>
      <Select value={collision.kind === "none" ? "none" : collision.preset} onValueChange={(value) => {
        if (value === "none") { onUpdate({ ...definition, collision: { kind: "none" } }); return; }
        const result = presetSchema.safeParse(value);
        if (result.success) onUpdate({ ...definition, collision: { kind: "preset", preset: result.data, bounds: collision.kind === "preset" ? bounds : { width: 40, height: 40, depth: 40 } } });
      }}><SelectTrigger aria-label="Contact behavior"><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="none">No collision</SelectItem><SelectItem value="solidBox">Solid box</SelectItem>
        <SelectItem value="triggerBox">Trigger box</SelectItem><SelectItem value="pickup">Pickup</SelectItem>
        <SelectItem value="enemy">Enemy</SelectItem><SelectItem value="platform">Platform</SelectItem>
      </SelectContent></Select>
    </div>
    {collision.kind === "preset" ? <>
      <p className="text-xs text-slate-400">{descriptions[collision.preset]}</p>
      <div className="flex items-start gap-2"><Checkbox className="mt-0.5 shrink-0" id={`automatic-bounds-${definition.id}`} checked={bounds === undefined} onCheckedChange={(checked) => onUpdate({ ...definition, collision: { ...collision, bounds: checked === true ? undefined : { width: 40, height: 40, depth: 40 } } })} /><Label className="leading-5" htmlFor={`automatic-bounds-${definition.id}`}>Let the game size collision from the visual model</Label></div>
      {bounds ? <>
      <div className="grid gap-3 sm:grid-cols-3">
        <ScriptObjectNumberField label="Width (X)" value={bounds.width} min={0.01} max={1000} onCommit={(value) => updateBounds("width", value)} />
        <ScriptObjectNumberField label="Height (Y)" value={bounds.height} min={0.01} max={1000} onCommit={(value) => updateBounds("height", value)} />
        <ScriptObjectNumberField label="Depth (Z)" value={bounds.depth} min={0.01} max={1000} onCommit={(value) => updateBounds("depth", value)} />
      </div>
      <svg viewBox="0 0 260 120" role="img" aria-label="Collision box proportions: top view and side view" className="h-28 w-full rounded bg-slate-950">
        <rect x={65 - bounds.width / Math.max(bounds.width, bounds.depth) * 45} y={58 - bounds.depth / Math.max(bounds.width, bounds.depth) * 40} width={bounds.width / Math.max(bounds.width, bounds.depth) * 90} height={bounds.depth / Math.max(bounds.width, bounds.depth) * 80} fill="#14532d" stroke="#4ade80" />
        <rect x={195 - bounds.width / Math.max(bounds.width, bounds.height) * 45} y={98 - bounds.height / Math.max(bounds.width, bounds.height) * 80} width={bounds.width / Math.max(bounds.width, bounds.height) * 90} height={bounds.height / Math.max(bounds.width, bounds.height) * 80} fill="#164e63" stroke="#67e8f9" />
        <text x="65" y="114" textAnchor="middle" fill="white" fontSize="10">Top: X/Z</text><text x="195" y="114" textAnchor="middle" fill="white" fontSize="10">Side: X/Y</text>
      </svg>
      <p className="text-xs text-slate-400">Box proportions, shown separately from the visual model. The box is centered at the item’s origin; values are world dimensions.</p>
      <Button className="justify-self-start" variant="ghost" size="sm" onClick={() => onUpdate({ ...definition, collision: { ...collision, bounds: { width: 40, height: 40, depth: 40 } } })}>Reset dimensions</Button>
      </> : <p className="text-xs text-slate-400">Collision size follows the loaded model. Use manual dimensions for invisible triggers or when the collision should differ from the visual.</p>}
    </> : <p className="text-xs text-slate-400">This item has no contact surface. It can still run its script.</p>}
  </section>;
}
