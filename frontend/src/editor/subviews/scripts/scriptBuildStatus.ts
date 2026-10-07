import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export function getScriptBuildStatus(state: ScriptWorkspaceState): { readonly phase: "unvalidated" | "stale" | "errors" | "validated"; readonly message: string } {
  if (Object.keys(state.compiledFiles).length === 0) return { phase: "unvalidated", message: "Not validated yet" };
  const stale = Object.values(state.sourceFiles).some((source) => !Object.values(state.compiledFiles).some((compiled) => compiled.sourcePath === source.path && compiled.content === source.content));
  if (stale) return { phase: "stale", message: "Code changed since validation" };
  const errors = state.diagnostics.filter((diagnostic) => diagnostic.severity === "error" && diagnostic.category !== "runtime-traceback" && diagnostic.category !== "native-adapter").length;
  return errors > 0 ? { phase: "errors", message: `${errors} validation errors` } : { phase: "validated", message: "Bundle matches current code · check diagnostics and preview gameplay" };
}
