import { z } from "zod";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { ScriptNumberField } from "./ScriptNumberField";

const presetSchema = z.enum(["solidBox", "triggerBox", "pickup", "enemy", "platform"]);
const presets = [
  { id: "none", label: "No collision", description: "Decorative or logic-only. Does not block or trigger actors." },
  { id: "solidBox", label: "Solid", description: "A box that blocks compatible native actors." },
  { id: "triggerBox", label: "Trigger", description: "An overlap volume for enter, stay and exit callbacks." },
  { id: "pickup", label: "Pickup", description: "A collectible collision category. Add its reward in Lua." },
  { id: "enemy", label: "Enemy", description: "Enemy collision category. Add movement and combat behavior in Lua." },
  { id: "platform", label: "Platform", description: "A platform collision category with explicit box dimensions." },
];

export function CustomObjectCollision({ definition, onChange }: { definition: ScriptCustomObjectDefinition; onChange: (definition: ScriptCustomObjectDefinition) => void }) {
  const collision = definition.collision;
  const selected = collision.kind === "none" ? "none" : collision.preset;
  return <div className="workbench-section">
    <div><h3>How does it interact?</h3><p className="workbench-muted">Collision sets the native category and bounds. Your Lua defines what happens.</p></div>
    <fieldset className="workbench-fields"><legend className="sr-only">Collision behavior</legend>{presets.map((preset) => <label key={preset.id} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${selected === preset.id ? "border-blue-400 bg-blue-950/40" : "border-slate-700"}`}>
      <input type="radio" name={`collision-${definition.id}`} checked={selected === preset.id} onChange={() => {
        const parsed = presetSchema.safeParse(preset.id);
        onChange({ ...definition, collision: parsed.success ? { kind: "preset", preset: parsed.data, bounds: collision.kind === "preset" ? collision.bounds : { width: 100, height: 100, depth: 100 } } : { kind: "none" } });
      }} /><span><span className="block font-medium">{preset.label}</span><span className="workbench-muted">{preset.description}</span></span>
    </label>)}</fieldset>
    {collision.kind === "preset" && <div className="workbench-fields">{(["width", "height", "depth"] satisfies readonly ("width" | "height" | "depth")[]).map((axis) => <ScriptNumberField key={axis} label={`Collision ${axis}`} value={collision.bounds?.[axis] ?? 100} min={0.01} max={1000} step={0.1} onChange={(value) => onChange({ ...definition, collision: { ...collision, bounds: { width: 100, height: 100, depth: 100, ...collision.bounds, [axis]: value } } })} />)}</div>}
  </div>;
}
