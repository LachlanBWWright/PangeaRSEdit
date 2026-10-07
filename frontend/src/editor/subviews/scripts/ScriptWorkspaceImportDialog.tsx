import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getScriptImportConflicts } from "./scriptWorkspaceImport";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

interface Props {
  current: ScriptWorkspaceState;
  incoming: ScriptWorkspaceState;
  label: string;
  onCancel: () => void;
  onApply: (mode: "merge" | "replace", overwrite: boolean) => void;
  allowReplace?: boolean;
}
export function ScriptWorkspaceImportDialog({ current, incoming, label, onCancel, onApply, allowReplace = true }: Props) {
  const [overwrite, setOverwrite] = useState(false);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const conflicts = getScriptImportConflicts(current, incoming);
  return <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Review {label}</DialogTitle><DialogDescription>Choose how to bring these changes into {current.context.gameLabel}. You can undo this import afterward.</DialogDescription></DialogHeader>
      <p className="text-sm">{incoming.customObjects.length} item definitions · {Object.values(incoming.sourceFiles).filter((source) => !source.readOnly).length} editable files · {Object.keys(incoming.assets).length} assets</p>
      <div className="max-h-60 overflow-auto rounded border p-3">
        {conflicts.length === 0 ? <p className="text-sm">No conflicting items or files.</p> : <><p className="mb-2 font-medium">{conflicts.length} conflicts</p>{conflicts.map((conflict) => <p className="break-all text-sm" key={`${conflict.kind}:${conflict.key}`}>{conflict.kind}: {conflict.key}</p>)}</>}
      </div>
      {conflicts.length > 0 && <div className="flex items-center gap-2"><Checkbox id="import-overwrite" checked={overwrite} onCheckedChange={(checked) => setOverwrite(checked === true)} /><Label htmlFor="import-overwrite">Use incoming versions of conflicting entries</Label></div>}
      <p className="text-xs text-muted-foreground">Merging keeps existing entries unless you choose incoming versions. Validate scripts afterward to check dependencies.</p>
      <div className="flex flex-wrap gap-2"><Button onClick={() => onApply("merge", overwrite)}>Add to project</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div>
      {allowReplace && <div className="grid gap-2 border-t pt-3"><div className="flex items-center gap-2"><Checkbox id="import-replace" checked={replaceConfirmed} onCheckedChange={(checked) => setReplaceConfirmed(checked === true)} /><Label htmlFor="import-replace">Replace this game's entire scripting workspace</Label></div><Button variant="destructive" disabled={!replaceConfirmed} onClick={() => onApply("replace", true)}>Replace workspace</Button></div>}
    </DialogContent>
  </Dialog>;
}
