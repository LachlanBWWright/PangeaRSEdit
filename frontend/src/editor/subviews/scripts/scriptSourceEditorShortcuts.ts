import { KeyCode, KeyMod, type editor, type IDisposable } from "monaco-editor";

export interface ScriptEditorShortcut extends Omit<editor.IActionDescriptor, "run"> {
  run: () => void;
}
interface EditorShortcutHost {
  addAction: (action: ScriptEditorShortcut) => IDisposable;
  getValue: () => string;
}
interface EditorShortcutActions {
  readOnly: boolean;
  filePath: string;
  onSave: (path: string, content: string) => void;
  onValidate: () => void;
}

export function registerScriptEditorShortcuts(host: EditorShortcutHost, current: () => EditorShortcutActions): readonly IDisposable[] {
  return [host.addAction({
    id: "pangea.saveScriptCheckpoint", label: "Save Script Checkpoint",
    keybindings: [KeyMod.CtrlCmd | KeyCode.KeyS],
    run: () => {
      const actions = current();
      if (!actions.readOnly) actions.onSave(actions.filePath, host.getValue());
    },
  }), host.addAction({
    id: "pangea.validateScriptBundle", label: "Validate Script Bundle",
    keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
    run: () => current().onValidate(),
  })];
}
