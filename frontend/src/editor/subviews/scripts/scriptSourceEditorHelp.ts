import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { ScriptRecoveryStatus } from "./scriptWorkspaceRecovery";
import type { ScriptLanguageCapabilities } from "./scriptLspClient";
import type { editor } from "monaco-editor";

export function scriptEditorOrigin(workspace: ScriptWorkspaceState, filePath: string, readOnly: boolean): string | null {
  if (!readOnly) return null;
  const compiled = workspace.compiledFiles[filePath];
  if (compiled) return workspace.sourceFiles[compiled.sourcePath]?.readOnly
    ? `Generated bundle from ${compiled.sourcePath}. Edit behavior source files or assignments, then rebuild.`
    : `Generated bundle from ${compiled.sourcePath}. Edit the source file, then rebuild.`;
  if (workspace.sourceFiles[filePath]?.role === "generated-entry") return "Generated entry point from your behaviors and item definitions. Edit their source files or assignments instead.";
  return "Generated source is read-only. Edit the corresponding behavior or assignment instead.";
}

export function scriptEditorRecoveryLabel(status: ScriptRecoveryStatus): string {
  if (status.phase === "saved") return "Browser recovery current";
  if (status.phase === "saving") return "Saving browser recovery…";
  if (status.phase === "loading") return "Loading browser recovery…";
  return "Recovery unavailable · export a backup";
}

export function scriptEditorLanguageHelp(configured: boolean, status: string, capabilities: ScriptLanguageCapabilities): string | null {
  if (!configured) return "Format and Rename require a configured LuaLS server. Offline snippets remain available.";
  if (status === "connecting") return "Format and Rename will be available when LuaLS finishes connecting.";
  if (status !== "connected") return "Format and Rename require a connected LuaLS server. Snippets remain available.";
  if (!capabilities.formatting && !capabilities.rename) return "This language server does not offer formatting or symbol rename.";
  if (!capabilities.formatting) return "This language server does not offer formatting.";
  if (!capabilities.rename) return "This language server does not offer symbol rename.";
  return null;
}

export function focusScriptRenameInput(input: HTMLInputElement | null): void {
  input?.focus();
}

export function scriptEditorSymbolAtCursor(current: editor.IStandaloneCodeEditor | null): string {
  const position = current?.getPosition();
  return position ? current?.getModel()?.getWordAtPosition(position)?.word ?? "" : "";
}

export function scriptLanguageActionHelp(action: "format" | "rename", readOnly: boolean, working: boolean, status: string, capabilities: ScriptLanguageCapabilities, languageHelp: string | null): string {
  if (readOnly) return "Generated files are read-only.";
  if (working) return "Wait for the current language action.";
  if (status !== "connected") return languageHelp ?? "Connect to LuaLS first.";
  if (action === "format") return capabilities.formatting ? "Format with LuaLS (Shift+Alt+F)" : "This language server does not offer formatting.";
  return capabilities.rename ? "Place the cursor on a symbol to rename its references across editable files" : "This language server does not offer symbol rename.";
}
