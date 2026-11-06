import { Download, Plus, Upload } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import type { useObjectBundleActions } from "./useObjectBundleActions";

export function ObjectLibraryToolbar({ bundles, exportMode, hasObjects, onExportModeChange, onCreate }: {
  bundles: ReturnType<typeof useObjectBundleActions>;
  exportMode: boolean;
  hasObjects: boolean;
  onExportModeChange: (enabled: boolean) => void;
  onCreate: () => void;
}) {
  const exportTrigger = useRef<HTMLButtonElement>(null);
  return <>
    <div className="workbench-toolbar object-library-toolbar">
      <h3>Object library</h3>
      <div className="workbench-toolbar-actions">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-700"><Upload size={15} />Import objects<input type="file" accept=".zip" className="sr-only" aria-label="Import objects" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void bundles.readBundle(file);
          event.target.value = "";
        }} /></label>
        {bundles.canUndo && <Button variant="ghost" onClick={() => void bundles.undoImport()}>Undo object import</Button>}
        <Button ref={exportTrigger} variant="ghost" aria-expanded={exportMode} aria-controls="object-export-tools" disabled={!hasObjects || bundles.exporting} onClick={() => onExportModeChange(!exportMode)}><Download size={15} className="mr-2" />Export objects</Button>
        <Button onClick={onCreate}><Plus size={16} className="mr-2" />New object</Button>
      </div>
    </div>
    {exportMode && <section id="object-export-tools" aria-label="Export objects" className="object-export-tools">
      <p className="workbench-muted">Select objects in the library, or export the entire library.</p>
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={bundles.includeAuthoringSources} onChange={(event) => bundles.setIncludeAuthoringSources(event.currentTarget.checked)} />Include authoring sources</label>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={bundles.selectedIds.length === 0 || bundles.exporting} onClick={() => void bundles.exportBundle(true)}>Export selected ({bundles.selectedIds.length})</Button>
        <Button variant="ghost" disabled={!hasObjects || bundles.exporting} onClick={() => void bundles.exportBundle(false)}>Export all objects</Button>
        <Button variant="ghost" onClick={() => { onExportModeChange(false); exportTrigger.current?.focus(); }}>Done selecting</Button>
      </div>
    </section>}
  </>;
}
