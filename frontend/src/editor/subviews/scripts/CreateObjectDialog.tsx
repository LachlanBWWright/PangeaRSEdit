import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScriptBehaviorDefinition } from "./scriptWorkspaceState";
import type { NativeSpawn } from "./scriptApiSchema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starters: readonly ScriptBehaviorDefinition[];
  nativeActors: readonly NativeSpawn[];
  onCreate: (name: string, starter: string) => void;
}

export function CreateObjectDialog({ open, onOpenChange, starters, nativeActors, onCreate }: Props) {
  const [name, setName] = useState("");
  const [starter, setStarter] = useState("blank");
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto">
      <DialogHeader><DialogTitle>New custom object</DialogTitle><DialogDescription>Create its definition and Lua behavior together. Place instances in a level when it is ready.</DialogDescription></DialogHeader>
      <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); onCreate(name, starter); }}>
        <div className="grid gap-2"><Label htmlFor="new-object-name">Object name</Label><Input id="new-object-name" placeholder="e.g. Checkpoint lantern" value={name} onChange={(event) => setName(event.target.value)} autoFocus required /></div>
        <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Start with</legend>
          <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-700 p-3"><input type="radio" name="object-starter" value="blank" checked={starter === "blank"} onChange={() => setStarter("blank")} /><span><span className="block font-medium">Empty behavior</span><span className="text-xs text-slate-400">Your own object, with spawn and update callbacks ready to edit.</span></span></label>
          {starters.map((behavior) => <label key={behavior.id} className="flex cursor-pointer gap-3 rounded-lg border border-slate-700 p-3"><input type="radio" name="object-starter" value={behavior.id} checked={starter === behavior.id} onChange={() => setStarter(behavior.id)} /><span><span className="block font-medium">{behavior.label}</span><span className="text-xs text-slate-400">{behavior.description}</span></span></label>)}
        </fieldset>
        {nativeActors.length > 0 && <div className="grid gap-2">
          <Label htmlFor="native-actor-starter">Or start from an existing enemy</Label>
          <select id="native-actor-starter" className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" value={starter.startsWith("native:") ? starter : ""} onChange={(event) => setStarter(event.target.value || "blank")}>
            <option value="">Choose a native enemy</option>
            {nativeActors.map((actor) => <option key={actor.id} value={`native:${actor.id}`}>{actor.label}</option>)}
          </select>
          <p className="text-xs text-slate-400">Retains native movement, attacks and collision. Its assets must be available in the target level.</p>
        </div>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={!name.trim()}>Create object</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
