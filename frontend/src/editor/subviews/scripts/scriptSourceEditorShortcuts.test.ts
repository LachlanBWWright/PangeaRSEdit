import { describe, expect, it, vi } from "vitest";
import { registerScriptEditorShortcuts, type ScriptEditorShortcut } from "./scriptSourceEditorShortcuts";

vi.mock("monaco-editor", () => ({ KeyCode: { KeyS: 49, Enter: 3 }, KeyMod: { CtrlCmd: 2048 } }));

describe("script editor command shortcuts", () => {
  it("validates current drafts and saves the current editable file after switching models", () => {
    const registered: ScriptEditorShortcut[] = [];
    const onSave = vi.fn();
    const onValidate = vi.fn();
    let current = { readOnly: true, filePath: "generated.lua", onSave, onValidate };
    const host = { getValue: () => "-- current draft", addAction: (action: ScriptEditorShortcut) => { registered.push(action); return { dispose: () => undefined }; } };
    registerScriptEditorShortcuts(host, () => current);
    const save = registered.find((action) => action.id === "pangea.saveScriptCheckpoint");
    const validate = registered.find((action) => action.id === "pangea.validateScriptBundle");
    expect(save?.keybindings).toEqual([2048 | 49]);
    expect(validate?.keybindings).toEqual([2048 | 3]);
    if (!save || !validate) return;
    save.run();
    expect(onSave).not.toHaveBeenCalled();
    current = { ...current, readOnly: false, filePath: "editable.lua" };
    save.run();
    validate.run();
    expect(onSave).toHaveBeenCalledWith("editable.lua", "-- current draft");
    expect(onValidate).toHaveBeenCalledOnce();
  });
});
