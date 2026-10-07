import { describe, expect, it } from "vitest";
import { scriptEditorPath, scriptEditorUri } from "./scriptEditorUris";

describe("game-scoped editor models", () => {
  it("keeps identical filenames in different game workspaces separate", () => {
    const path = "Data/Scripts/src/main.lua";
    const otto = scriptEditorUri("OttoMatic-Android", path);
    const billy = scriptEditorUri("BillyFrontier-Android", path);
    expect(otto).not.toBe(billy);
    expect(scriptEditorPath(otto, "OttoMatic-Android")).toBe(path);
    expect(scriptEditorPath(otto, "BillyFrontier-Android")).toBeNull();
    expect(scriptEditorPath(billy, "BillyFrontier-Android")).toBe(path);
  });

  it("rejects empty, legacy, traversal, and foreign model paths", () => {
    const game = "OttoMatic-Android";
    expect(scriptEditorPath(scriptEditorUri(game, ""), game)).toBeNull();
    expect(scriptEditorPath("file:///workspace/main.lua", game)).toBeNull();
    expect(scriptEditorPath(scriptEditorUri(game, "../main.lua"), game)).toBeNull();
    expect(scriptEditorPath(scriptEditorUri(game, "Data\\main.lua"), game)).toBeNull();
    expect(scriptEditorPath("file:///workspace/OttoMatic-Android/%2e%2e/main.lua", game)).toBeNull();
    expect(scriptEditorPath("file:///workspace/OttoMatic-Android/%broken.lua", game)).toBeNull();
  });

  it("round-trips imported filenames containing URI punctuation and spaces", () => {
    const path = "Data/Scripts/src/item #1 50%.lua";
    const uri = scriptEditorUri("OttoMatic-Android", path);
    expect(uri).toContain("item%20%231%2050%25.lua");
    expect(scriptEditorPath(uri, "OttoMatic-Android")).toBe(path);
  });
});
