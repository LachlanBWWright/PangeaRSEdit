import { useSetAtom, useStore } from "jotai";
import { err, ok } from "neverthrow";
import { toast } from "sonner";
import { applyScriptWorkspaceFileEdits } from "./scriptWorkspaceFileActions";
import { compileScriptWorkspace, ensureScriptWorkspace, replaceScriptWorkspace, saveScriptSourceFile, scriptWorkspaceStoreAtom, setScriptActiveFile, updateScriptSourceContent, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { ScriptSourceEditorProps } from "./ScriptSourceEditor";

export function useScriptWorkspaceEditor(workspace: ScriptWorkspaceState, path: string, onSelectFile: (path: string) => void, onOpenReference: () => void): ScriptSourceEditorProps | undefined {
  const store = useStore();
  const setWorkspaces = useSetAtom(scriptWorkspaceStoreAtom);
  const source = workspace.sourceFiles[path];
  const compiled = workspace.compiledFiles[path];
  if (!source && !compiled) return undefined;
  const current = () => ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), workspace.context);
  const persist = (next: ScriptWorkspaceState) => setWorkspaces((all) => replaceScriptWorkspace(all, next));
  return {
    workspace, filePath: path, content: source?.content ?? compiled?.content ?? "", readOnly: !source || source.readOnly,
    onChange: (filePath, content) => persist(updateScriptSourceContent(current(), filePath, content)),
    onSave: (filePath, content) => persist(saveScriptSourceFile(updateScriptSourceContent(current(), filePath, content), filePath)),
    onSelectFile: (filePath) => { persist(setScriptActiveFile(current(), filePath)); onSelectFile(filePath); },
    onOpenReference,
    onValidate: () => {
      const result = compileScriptWorkspace(current());
      if (result.isErr()) { toast.error(result.error); return; }
      persist(result.value);
      const errors = result.value.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
      if (errors > 0) toast.error(`Bundle has ${errors} diagnostic errors`);
      else toast.success("Bundle prepared. Check language diagnostics before previewing.");
    },
    onApplyEdits: (edits) => {
      const result = applyScriptWorkspaceFileEdits(current(), edits);
      if (result.isErr()) return err(result.error);
      persist(result.value);
      return ok(undefined);
    },
  };
}
