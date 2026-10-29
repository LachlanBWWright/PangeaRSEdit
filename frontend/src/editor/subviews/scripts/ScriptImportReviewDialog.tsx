import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ScriptImportChange } from "./scriptLibraryMerge";

export function ScriptImportReviewDialog({ changes, title, error, busy = false, onApply, onClose }: {
  changes: readonly ScriptImportChange[]; title: string;
  error: string | null;
  busy?: boolean;
  onApply: (accepted: ReadonlySet<string>) => void; onClose: () => void;
}) {
  const [choices, setChoices] = useState<Readonly<Record<string, boolean>>>({});
  const accepted = new Set(changes.filter((change) => choices[change.key] ?? change.before === null).map((change) => change.key));
  const conflicts = changes.filter((change) => change.before !== null);
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-w-3xl" aria-busy={busy}>
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Review additions and changes. Existing content is kept by default. Level assignments, bindings, replacements and placements stay intact; updated object definitions affect their existing instances.</DialogDescription></DialogHeader>
    <p className="text-sm text-slate-300">{changes.length - conflicts.length} additions, {conflicts.length} conflicts. {accepted.size} changes selected.</p>
    <p className="text-xs text-slate-400">Keep definition and source updates together when changing an object's export name. Object-type behaviors and unassigned hook modules can run game-wide.</p>
    {error && <p role="alert" className="workbench-notice" data-tone="warning">{error}</p>}
    {conflicts.length > 0 && <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={() => setChoices(Object.fromEntries(changes.map((change) => [change.key, true])))}>Use all incoming changes</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => setChoices({})}>Keep existing conflicts</Button></div>}
    <div className="grid max-h-[50vh] gap-3 overflow-auto">
      {changes.length === 0 && <p>Everything matches. There are no changes to import.</p>}
      {changes.map((change) => <section key={change.key} className="min-w-0 rounded border border-slate-700 p-3">
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" disabled={busy} checked={accepted.has(change.key)} onChange={(event) => setChoices({ ...choices, [change.key]: event.target.checked })} /><span className="break-all">{change.label}<span className="block text-xs text-slate-400">{change.kind}: {change.before === null ? "New" : "Existing content differs"}</span></span></label>
        <details className="mt-2 text-xs"><summary className="cursor-pointer">Compare content</summary><div className="mt-2 grid gap-3 sm:grid-cols-2"><div><p>Current</p><pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-2">{change.before ?? "Not present"}</pre></div><div><p>Incoming</p><pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-2">{change.after}</pre></div></div></details>
      </section>)}
    </div>
    <div className="flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy || accepted.size === 0} onClick={() => onApply(accepted)}>{busy ? "Restoring editable assets…" : "Apply selected changes"}</Button></div>
  </DialogContent></Dialog>;
}
