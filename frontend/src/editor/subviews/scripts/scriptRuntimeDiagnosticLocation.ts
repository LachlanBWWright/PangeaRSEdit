import { BUNDLED_RUNTIME_PATH, type ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export function getScriptRuntimeDiagnosticLocation(state: ScriptWorkspaceState, message: string): { readonly filePath: string; readonly line: number; readonly column: number } {
  for (const match of message.matchAll(/([^\s"'[\]:]+\.lua)["'\]]*:(\d+)/g)) {
    const reported = match[1]?.replace(/^@/, "");
    const line = Number(match[2]);
    if (!reported || !Number.isSafeInteger(line) || line < 1) continue;
    const compiled = Object.values(state.compiledFiles).filter((file) => file.path === reported || file.path.endsWith(`/${reported}`));
    if (compiled.length === 1 && compiled[0]) return { filePath: compiled[0].sourcePath, line, column: 1 };
    const sources = Object.values(state.sourceFiles).filter((file) => file.path === reported || file.path.endsWith(`/${reported}`));
    if (sources.length === 1 && sources[0]) return { filePath: sources[0].path, line, column: 1 };
  }
  return { filePath: BUNDLED_RUNTIME_PATH, line: 0, column: 0 };
}
