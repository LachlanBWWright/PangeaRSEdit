import type { editor } from "monaco-editor";
import { err, ok, type Result } from "neverthrow";
import { scriptLspClient } from "./scriptLspClient";
import { applyScriptTextEdits, buildScriptWorkspaceEdits, type ScriptWorkspaceFileEdit } from "./scriptWorkspaceEdits";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

export async function formatScriptModel(currentEditor: editor.IStandaloneCodeEditor, tabSize: number, insertSpaces: boolean): Promise<Result<void, string>> {
  if (!scriptLspClient.getCapabilities().formatting) return err("The connected language server does not offer formatting.");
  const model = currentEditor.getModel();
  if (!model) return err("Select a source file first.");
  const version = model.getVersionId();
  const content = model.getValue();
  const result = await scriptLspClient.request("textDocument/formatting", {
    textDocument: { uri: scriptLspClient.documentUri(model) }, options: { tabSize, insertSpaces },
  });
  if (result.isErr()) return err(result.error.message);
  if (currentEditor.getModel() !== model || model.isDisposed() || model.getVersionId() !== version) return err("Source changed while formatting. Try again.");
  const edits = applyScriptTextEdits(content, result.value ?? []);
  if (edits.isErr()) return err(edits.error);
  if (content !== edits.value) {
    const selection = currentEditor.getSelection();
    model.pushStackElement();
    model.pushEditOperations([], [{ range: model.getFullModelRange(), text: edits.value }], () => null);
    model.pushStackElement();
    if (selection) currentEditor.setSelection(model.validateRange(selection));
  }
  return ok(undefined);
}

export async function renameScriptSymbol(
  workspace: ScriptWorkspaceState,
  currentEditor: editor.IStandaloneCodeEditor,
  name: string,
  getVersion: (path: string) => number | null,
): Promise<Result<readonly ScriptWorkspaceFileEdit[], string>> {
  if (!scriptLspClient.getCapabilities().rename) return err("The connected language server does not offer symbol rename.");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return err("Enter a valid Lua identifier.");
  const model = currentEditor.getModel();
  const position = currentEditor.getPosition();
  if (!model || !position) return err("Select a symbol in the editor first.");
  const version = model.getVersionId();
  const result = await scriptLspClient.request("textDocument/rename", {
    textDocument: { uri: scriptLspClient.documentUri(model) },
    position: { line: position.lineNumber - 1, character: position.column - 1 }, newName: name,
  });
  if (result.isErr()) return err(result.error.message);
  if (model.isDisposed() || model.getVersionId() !== version) return err("Source changed during rename. Try again.");
  if (result.value === null) return err("LuaLS could not rename the selected symbol.");
  return buildScriptWorkspaceEdits(workspace, result.value, (uri) => scriptLspClient.sourcePath(uri), getVersion);
}

export async function renameAndApplyScriptSymbol(
  workspace: ScriptWorkspaceState,
  currentEditor: editor.IStandaloneCodeEditor,
  name: string,
  getModel: (path: string) => editor.ITextModel | null,
  applyEdits: (edits: readonly ScriptWorkspaceFileEdit[]) => Result<void, string>,
): Promise<Result<number, string>> {
  const result = await renameScriptSymbol(workspace, currentEditor, name, (path) => getModel(path)?.getVersionId() ?? null);
  if (result.isErr()) return err(result.error);
  for (const edit of result.value) {
    const model = getModel(edit.filePath);
    if (model && model.getValue() !== edit.expectedContent) return err(`Source changed during rename: ${edit.filePath}`);
  }
  const applied = applyEdits(result.value);
  if (applied.isErr()) return err(applied.error);
  const activeModel = currentEditor.getModel();
  const selection = currentEditor.getSelection();
  for (const edit of result.value) {
    const model = getModel(edit.filePath);
    if (!model || model.getValue() === edit.content) continue;
    model.pushStackElement();
    model.pushEditOperations([], [{ range: model.getFullModelRange(), text: edit.content }], () => null);
    model.pushStackElement();
  }
  if (selection && activeModel && currentEditor.getModel() === activeModel) currentEditor.setSelection(activeModel.validateRange(selection));
  return ok(result.value.length);
}
