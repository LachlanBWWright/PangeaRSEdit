import { err, ok, type Result } from "neverthrow";
import type { ScriptWorkspaceFileEdit } from "./scriptWorkspaceEdits";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export function applyScriptWorkspaceFileEdits(state: ScriptWorkspaceState, edits: readonly ScriptWorkspaceFileEdit[]): Result<ScriptWorkspaceState, string> {
  const paths = new Set<string>();
  for (const edit of edits) {
    const source = state.sourceFiles[edit.filePath];
    if (!source || source.readOnly) return err(`Cannot edit generated or missing file: ${edit.filePath}`);
    if (paths.has(edit.filePath)) return err(`The edit contains the file more than once: ${edit.filePath}`);
    if (source.content !== edit.expectedContent) return err(`The file changed while LuaLS prepared the edit: ${edit.filePath}. Try again.`);
    paths.add(edit.filePath);
  }
  const sourceFiles = { ...state.sourceFiles };
  for (const edit of edits) {
    const source = sourceFiles[edit.filePath];
    if (source) sourceFiles[edit.filePath] = { ...source, content: edit.content };
  }
  return ok({ ...state, sourceFiles, compiledFiles: {}, diagnostics: state.diagnostics.filter((diagnostic) => !paths.has(diagnostic.filePath)) });
}
