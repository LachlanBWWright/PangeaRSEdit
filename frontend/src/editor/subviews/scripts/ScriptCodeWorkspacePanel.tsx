import { Button } from "@/components/ui/button";
import type { ScriptDiagnostic } from "./scriptWorkspaceState";
import { MenuEmptyState } from "../MenuEmptyState";
import { ScriptSourceEditor, type ScriptSourceEditorProps } from "./ScriptSourceEditor";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { filterScriptDiagnostics, scriptDiagnosticStatusMessage, type ScriptDiagnosticSeverityFilter } from "./scriptDiagnosticsView";
import { ScriptDiagnosticRow } from "./ScriptDiagnosticRow";

const severityOptions: readonly {value: ScriptDiagnosticSeverityFilter; label: string}[] = [{value: "all", label: "All"}, {value: "error", label: "Errors"}, {value: "warning", label: "Warnings"}];

interface ScriptCodeWorkspacePanelProps {
  activeCodePath: string | null;
  activeCodeDescription: string;
  hasActiveCodeFile: boolean;
  onOpenEditor: () => void;
  onCompile: () => void;
  buildErrorCount: number;
  diagnostics: readonly ScriptDiagnostic[];
  editor?: ScriptSourceEditorProps;
  onNavigateDiagnostic?: (diagnostic: ScriptDiagnostic) => void;
}

export function ScriptCodeWorkspacePanel({
  activeCodePath,
  activeCodeDescription,
  hasActiveCodeFile,
  onOpenEditor,
  onCompile,
  buildErrorCount,
  diagnostics,
  editor,
  onNavigateDiagnostic,
}: ScriptCodeWorkspacePanelProps) {
  const [severity, setSeverity] = useState<ScriptDiagnosticSeverityFilter>("all");
  const [query, setQuery] = useState("");
  const filtered = filterScriptDiagnostics(diagnostics, severity, query);
  const statusMessage = scriptDiagnosticStatusMessage(editor?.workspace, diagnostics);
  return (
    <section className="min-w-0" aria-label="Code workspace">
      {!editor && <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-white">Code</h3>
        <Button variant="outline" onClick={onCompile}>Validate</Button>
      </div>}
      <div className="grid min-w-0 gap-5">
        {editor ? <ScriptSourceEditor {...editor} /> : hasActiveCodeFile && activeCodePath !== null ? (
          <div className="border-b border-slate-800 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">
                  {activeCodePath}
                </p>
                <p className="text-xs text-slate-400">
                  {activeCodeDescription}
                </p>
              </div>
              <Button onClick={onOpenEditor}>Open Editor</Button>
            </div>
          </div>
        ) : (
          <MenuEmptyState
            title="No File Selected"
            description={activeCodeDescription}
            compact
          />
        )}

        <section className="min-w-0 border-t border-slate-800 pt-3" aria-label="Diagnostics">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-white">Diagnostics</h4>
            {buildErrorCount > 0 && <span className="text-xs text-red-300">{String(buildErrorCount)} build errors</span>}
          </div>
          <p className="mt-1 text-xs text-slate-400" role="status">{statusMessage}</p>
          {diagnostics.length > 0 && <>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex shrink-0 gap-1" role="group" aria-label="Diagnostic severity">{severityOptions.map(option => <Button key={option.value} size="sm" variant="ghost" aria-pressed={severity === option.value} className="aria-pressed:bg-slate-800" onClick={() => setSeverity(option.value)}>{option.label}</Button>)}</div>
              <Input aria-label="Search diagnostics" placeholder="Search message, file or code" value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-[1_1_200px]" />
              <span className="text-xs text-slate-500">{filtered.length} of {diagnostics.length}</span>
            </div>
            {filtered.length > 0 ? <ul className="mt-2 max-h-64 divide-y divide-slate-800 overflow-y-auto">{filtered.map((diagnostic, index) => <ScriptDiagnosticRow key={`${diagnostic.filePath}-${index}`} diagnostic={diagnostic} workspace={editor?.workspace} onNavigate={onNavigateDiagnostic} />)}</ul> : <p className="py-3 text-sm text-slate-400">No diagnostics match these filters.</p>}
          </>}
        </section>
      </div>
    </section>
  );
}
