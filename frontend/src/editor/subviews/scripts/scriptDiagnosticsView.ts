import { getScriptBuildStatus } from "./scriptBuildStatus";
import type { ScriptDiagnostic, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export type ScriptDiagnosticSeverityFilter = "all" | "error" | "warning";
export interface ScriptDiagnosticLocation {
  readonly diagnostic: ScriptDiagnostic;
  readonly readOnly: boolean;
}

export function diagnosticCategoryLabel(category: ScriptDiagnostic["category"]): string {
  if (category === "source-validation") return "Validation";
  if (category === "luals") return "Lua language server";
  if (category === "packaging") return "Packaging";
  if (category === "runtime-traceback") return "Runtime";
  return "Native adapter";
}

export function filterScriptDiagnostics(diagnostics: readonly ScriptDiagnostic[], severity: ScriptDiagnosticSeverityFilter, query: string): readonly ScriptDiagnostic[] {
  const search = query.trim().toLowerCase();
  return diagnostics.filter(diagnostic => (severity === "all" || diagnostic.severity === severity)
    && `${diagnostic.filePath} ${diagnostic.message} ${diagnostic.code} ${diagnosticCategoryLabel(diagnostic.category)}`.toLowerCase().includes(search));
}

export function resolveScriptDiagnosticLocation(workspace: ScriptWorkspaceState | undefined, diagnostic: ScriptDiagnostic): ScriptDiagnosticLocation | null {
  if (!workspace) return null;
  const position = {line: Math.max(1, diagnostic.line), column: Math.max(1, diagnostic.column)};
  const source = workspace.sourceFiles[diagnostic.filePath];
  if (source) return {diagnostic: {...diagnostic, ...position}, readOnly: source.readOnly};
  const compiled = workspace.compiledFiles[diagnostic.filePath];
  if (!compiled) return null;
  const original = workspace.sourceFiles[compiled.sourcePath];
  return original && original.content === compiled.content
    ? {diagnostic: {...diagnostic, ...position, filePath: original.path}, readOnly: original.readOnly}
    : {diagnostic: {...diagnostic, ...position}, readOnly: true};
}

export function scriptDiagnosticStatusMessage(workspace: ScriptWorkspaceState | undefined, diagnostics: readonly ScriptDiagnostic[]): string {
  if (!workspace) return "Validate scripts to check for issues.";
  const status = getScriptBuildStatus(workspace);
  if (status.phase === "unvalidated") return "Not validated yet. Validate scripts to check for issues.";
  if (status.phase === "stale") return "Code changed since validation. Validate again to refresh these results.";
  if (status.phase === "errors") return `${status.message}. Review the messages below.`;
  return diagnostics.length === 0 ? "Current code validated with no reported issues." : "Validation matches current code. Review the reported issues below.";
}
