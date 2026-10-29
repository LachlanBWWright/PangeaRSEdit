import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { objectImportConflicts, type ObjectImportMode } from "./scriptObjectImport";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { ProjectAsset } from "@pangea/desktop-contracts";

export function ObjectImportReview({ workspace, bundle, onCancel, onImport, error, importing = false, projectAssets = [] }: {
  readonly workspace: ScriptWorkspaceState;
  readonly bundle: ScriptDefinitionBundle;
  readonly onCancel: () => void;
  readonly onImport: (mode: ObjectImportMode) => void;
  readonly error?: string | null;
  readonly importing?: boolean;
  readonly projectAssets?: readonly ProjectAsset[];
}) {
  const [mode, setMode] = useState<ObjectImportMode>("keep");
  const conflicts = objectImportConflicts(workspace, bundle, projectAssets);
  return <Dialog open onOpenChange={(open) => { if (!open && !importing) onCancel(); }}>
    <DialogContent className="max-h-[85vh] overflow-auto">
      <DialogHeader><DialogTitle>Review object import</DialogTitle><DialogDescription>{bundle.definitions.length} objects, {Object.keys(bundle.sources).length} source files and {Object.keys(bundle.assets).length} runtime assets.</DialogDescription></DialogHeader>
      <p>{conflicts.length ? `${conflicts.length} existing records conflict with this archive.` : "No conflicting records found."}</p>
      {error && <p role="alert" className="workbench-notice" data-tone="warning">{error}</p>}
      {conflicts.length > 0 && <ul className="max-h-48 overflow-auto text-sm">{conflicts.map((conflict) => <li className="break-all" key={`${conflict.kind}:${conflict.path}`}>{conflict.kind}: {conflict.path}</li>)}</ul>}
      <fieldset disabled={importing} className="grid gap-3"><legend className="mb-2 font-medium">How should existing content be handled?</legend>
        <label><input type="radio" name="object-import-mode" checked={mode === "keep"} onChange={() => setMode("keep")} /> Keep existing<p className="ml-5 text-sm text-slate-400">Skip matching objects. Conflicting dependencies must be resolved before new objects can be imported.</p></label>
        <label><input type="radio" name="object-import-mode" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace<p className="ml-5 text-sm text-slate-400">Replace matching objects, source files and assets. Shared helper changes also affect existing objects using those files.</p></label>
        <label><input type="radio" name="object-import-mode" checked={mode === "copy"} onChange={() => setMode("copy")} /> Import as copy<p className="ml-5 text-sm text-slate-400">Create independent object IDs, exports and behavior source files. Helpers remain shared. Differing helper or asset content requires a rename in the source project first.</p></label>
      </fieldset>
      <p className="text-sm text-slate-400">Included editable assets and authoring sources are restored to the desktop project and retained in the browser workspace for export. Copy creates independent editable asset identities. Undo restores both workspace content and desktop asset records; later edits to imported content are protected.</p>
      <div className="flex justify-end gap-2"><Button disabled={importing} variant="secondary" onClick={onCancel}>Cancel</Button><Button disabled={importing} onClick={() => onImport(mode)}>{importing ? "Importing…" : "Import objects"}</Button></div>
    </DialogContent>
  </Dialog>;
}
