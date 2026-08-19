import { describe, expect, it } from "vitest";
import { View } from "../viewEnum";
import { normalizeEditorView } from "./editorViewUtils";

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
