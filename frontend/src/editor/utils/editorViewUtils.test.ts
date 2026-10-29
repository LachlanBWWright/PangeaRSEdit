import { afterEach, describe, expect, it, vi } from "vitest";
import { View } from "../viewEnum";
import { createUndoRedoKeyHandler, normalizeEditorView } from "./editorViewUtils";

afterEach(() => document.body.replaceChildren());

describe("editor undo keyboard ownership", () => {
  it("uses shared history for map undo and redo", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const handle = createUndoRedoKeyHandler(undo, redo);
    handle(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
    handle(new KeyboardEvent("keydown", { key: "z", metaKey: true, shiftKey: true }));
    expect(undo).toHaveBeenCalledOnce();
    expect(redo).toHaveBeenCalledOnce();
  });

  it("leaves focused source and field undo to the editing control", () => {
    const undo = vi.fn();
    const handle = createUndoRedoKeyHandler(undo, vi.fn());
    for (const tag of ["input", "textarea"]) {
      const field = document.createElement(tag);
      document.body.append(field);
      field.focus();
      handle(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
      field.remove();
    }
    expect(undo).not.toHaveBeenCalled();
  });

  it("does not undo a second time when another control handled the shortcut", () => {
    const undo = vi.fn();
    const event = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, cancelable: true });
    event.preventDefault();
    createUndoRedoKeyHandler(undo, vi.fn())(event);
    expect(undo).not.toHaveBeenCalled();
  });
});

describe("normalizeEditorView", () => {
  it("keeps a view supported by the current editor", () => {
    expect(
      normalizeEditorView(
        View.tiles,
        [View.items, View.tiles, View.supertiles],
        View.supertiles,
      ),
    ).toBe(View.tiles);
  });

  it("immediately replaces a view left over from another game", () => {
    expect(
      normalizeEditorView(
        View.fences,
        [View.items, View.tiles, View.supertiles],
        View.supertiles,
      ),
    ).toBe(View.supertiles);
  });
});
