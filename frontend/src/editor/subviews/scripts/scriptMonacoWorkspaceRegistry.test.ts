import { describe, expect, it } from "vitest";
import { OttoGlobals, BugdomGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace, upsertScriptSourceFile } from "./scriptWorkspaceState";
import { scriptEditorUri } from "./scriptEditorUris";
import { ScriptMonacoWorkspaceRegistry } from "./scriptMonacoWorkspaceRegistry";

describe("Lua editor workspace isolation", () => {
  it("scopes identical file names by game and reads the latest draft", () => {
    const registry = new ScriptMonacoWorkspaceRegistry();
    const path = "Data/Scripts/src/shared.lua";
    let otto = upsertScriptSourceFile(ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0)), path, "-- Otto");
    const bugdom = upsertScriptSourceFile(ensureScriptWorkspace({}, createScriptWorkspaceContext(BugdomGlobals, 0)), path, "-- Bugdom");
    registry.register(() => otto);
    registry.register(() => bugdom);
    expect(registry.forUri(scriptEditorUri(otto.context.gameId, path))).toBe(otto);
    expect(registry.forUri(scriptEditorUri(bugdom.context.gameId, path))).toBe(bugdom);
    otto = upsertScriptSourceFile(otto, path, "-- edited draft");
    expect(registry.forUri(scriptEditorUri(otto.context.gameId, path))?.sourceFiles[path]?.content).toBe("-- edited draft");
    expect(registry.forUri(scriptEditorUri(otto.context.gameId, "missing.lua"))).toBeNull();
    expect(registry.forUri("file:///outside/shared.lua")).toBeNull();
  });

  it("keeps inline configuration alive after a full-screen editor closes", () => {
    const registry = new ScriptMonacoWorkspaceRegistry();
    const workspace = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
    const inline = registry.register(() => workspace);
    const fullscreen = registry.register(() => workspace);
    const uri = scriptEditorUri(workspace.context.gameId, workspace.activeFilePath);
    expect(registry.size).toBe(2);
    expect(fullscreen.dispose()).toBe(true);
    expect(fullscreen.dispose()).toBe(false);
    expect(registry.forUri(uri)).toBe(workspace);
    inline.dispose();
    expect(registry.forUri(uri)).toBeNull();
    expect(registry.size).toBe(0);
  });
});
