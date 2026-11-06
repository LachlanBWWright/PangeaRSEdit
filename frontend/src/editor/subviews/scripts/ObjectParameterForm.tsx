import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScriptObjectParameter } from "./scriptObjectParameterTypes";
import { createParameterDraft, parseParameterDraft, type ObjectParameterDraft } from "./scriptObjectParameterDraft";

export function ObjectParameterForm({ parameter, onSave, onCancel }: { parameter?: ScriptObjectParameter; onSave: (parameter: ScriptObjectParameter) => string | undefined; onCancel: () => void }) {
  const [draft, setDraft] = useState(() => createParameterDraft(parameter));
  const [error, setError] = useState("");
  function field<K extends keyof ObjectParameterDraft>(key: K, value: ObjectParameterDraft[K]) { setDraft((previous) => ({ ...previous, [key]: value })); }
  return <form className="grid gap-3 rounded border border-slate-700 p-3" onSubmit={(event) => {
    event.preventDefault();
    const parsed = parseParameterDraft(draft);
    if (parsed.isErr()) { setError(parsed.error); return; }
    setError(onSave(parsed.value) ?? "");
  }}>
    <h4 className="font-medium">{parameter ? "Edit behavior setting" : "New behavior setting"}</h4>
    <label className="grid gap-1 text-sm">Setting name<Input value={draft.label} onChange={(event) => field("label", event.target.value)} required /></label>
    <label className="grid gap-1 text-sm">Lua identifier<Input value={draft.id} disabled={parameter !== undefined} onChange={(event) => field("id", event.target.value)} required pattern="[A-Za-z_][A-Za-z0-9_]*" maxLength={64} /></label>
    <p className="workbench-muted">Read as self.parameters.{draft.id || "identifier"}. Identifiers stay fixed after creation to protect Lua references.</p>
    <label className="grid gap-1 text-sm">Description<Input value={draft.description} onChange={(event) => field("description", event.target.value)} /></label>
    <label className="grid gap-1 text-sm">Value type<select className="h-9 rounded border border-slate-600 bg-slate-900 px-2" value={draft.kind} onChange={(event) => {
      const value = event.target.value;
      if (value === "number" || value === "boolean" || value === "enum") field("kind", value);
    }}><option value="number">Number</option><option value="boolean">Enabled / disabled</option><option value="enum">Choice</option></select></label>
    {draft.kind === "number" && <div className="grid gap-2 sm:grid-cols-2">{(["numberDefault", "min", "max", "step"] satisfies (keyof ObjectParameterDraft)[]).map((key) => <label key={key} className="grid gap-1 text-sm">{{ numberDefault: "Default value", min: "Minimum (optional)", max: "Maximum (optional)", step: "Increment (optional)" }[key]}<Input type="number" step="any" value={draft[key]} onChange={(event) => field(key, event.target.value)} required={key === "numberDefault"} /></label>)}</div>}
    {draft.kind === "boolean" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.booleanDefault} onChange={(event) => field("booleanDefault", event.target.checked)} />Enabled by default</label>}
    {draft.kind === "enum" && <ObjectParameterChoices draft={draft} onChange={setDraft} />}
    {parameter && <p className="workbench-muted">Placements with values outside the new type or range will return to this default. Valid overrides are preserved.</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <div className="flex gap-2"><Button type="submit">Save setting</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>
  </form>;
}

function ObjectParameterChoices({ draft, onChange }: { draft: ObjectParameterDraft; onChange: (draft: ObjectParameterDraft) => void }) {
  return <fieldset className="grid gap-2"><legend className="text-sm font-medium">Choices</legend>{draft.options.map((option, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
    <label className="grid gap-1 text-sm">Choice {index + 1} label<Input value={option.label} required onChange={(event) => onChange({ ...draft, options: draft.options.map((entry, position) => position === index ? { ...entry, label: event.target.value } : entry) })} /></label>
    <label className="grid gap-1 text-sm">Choice {index + 1} value<Input value={option.value} required onChange={(event) => onChange({ ...draft, options: draft.options.map((entry, position) => position === index ? { ...entry, value: event.target.value } : entry) })} /></label>
    <Button type="button" variant="ghost" disabled={draft.options.length <= 1} onClick={() => onChange({ ...draft, enumDefault: draft.enumDefault === option.value ? "" : draft.enumDefault, options: draft.options.filter((_, position) => position !== index) })}>Remove choice {index + 1}</Button>
  </div>)}<Button type="button" variant="outline" onClick={() => onChange({ ...draft, options: [...draft.options, { value: "", label: "" }] })}>Add choice</Button>
    <label className="grid gap-1 text-sm">Default choice<select className="h-9 rounded border border-slate-600 bg-slate-900 px-2" required value={draft.enumDefault} onChange={(event) => onChange({ ...draft, enumDefault: event.target.value })}><option value="">Choose a default</option>{draft.options.filter((option) => option.value.trim() !== "").map((option, index) => <option key={index} value={option.value}>{option.label || option.value}</option>)}</select></label>
  </fieldset>;
}
