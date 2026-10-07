import { diagnosticCategoryLabel, resolveScriptDiagnosticLocation, type ScriptDiagnosticLocation } from "./scriptDiagnosticsView";
import type { ScriptDiagnostic, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

interface Props {
  readonly diagnostic: ScriptDiagnostic;
  readonly workspace: ScriptWorkspaceState | undefined;
  readonly onNavigate: ((diagnostic: ScriptDiagnostic) => void) | undefined;
}

function navigationLabel(location: ScriptDiagnosticLocation | null, hasNavigation: boolean): string {
  if (!location) return "No source location available";
  if (!hasNavigation) return "Source navigation unavailable";
  return location.readOnly ? "Open read-only code" : "Open source";
}

export function ScriptDiagnosticRow({diagnostic, workspace, onNavigate}: Props) {
  const location = resolveScriptDiagnosticLocation(workspace, diagnostic);
  const path = diagnostic.filePath.replace(/^Data\/Scripts\//, "");
  const content = <>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="break-all text-xs text-slate-300">{path}{diagnostic.line > 0 && <span className="ml-2 text-slate-500">Line {diagnostic.line}{diagnostic.column > 0 ? `:${diagnostic.column}` : ""}</span>}</p>
      <span className={`text-xs ${diagnostic.severity === "error" ? "text-red-300" : "text-amber-300"}`}>{diagnostic.severity === "error" ? "Error" : "Warning"} · {diagnosticCategoryLabel(diagnostic.category)}</span>
    </div>
    <p className="mt-1 break-words text-sm text-slate-200">{diagnostic.message}</p>
    <p className="mt-1 text-xs text-slate-500">{navigationLabel(location, onNavigate !== undefined)} · {diagnostic.code}</p>
  </>;
  return <li className="min-w-0">
    {location && onNavigate ? <button type="button" className="block w-full min-w-0 py-3 text-left hover:bg-slate-900 focus-visible:outline focus-visible:outline-orange-400"
      onClick={() => onNavigate(location.diagnostic)} aria-label={`Open ${location.diagnostic.filePath}${diagnostic.line > 0 ? ` at line ${diagnostic.line}` : ""}: ${diagnostic.message}`}>{content}</button> : <div className="py-3">{content}</div>}
  </li>;
}
