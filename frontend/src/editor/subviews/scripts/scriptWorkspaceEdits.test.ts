import { describe, expect, it } from "vitest";
import { applyScriptTextEdits, buildScriptWorkspaceEdits } from "./scriptWorkspaceEdits";
import { ensureScriptWorkspace, createScriptWorkspaceContext, upsertScriptSourceFile } from "./scriptWorkspaceState";
import { OttoGlobals } from "@/data/globals/globals";

const edit = (start: number, end: number, newText: string) => ({
  range: { start: { line: 0, character: start }, end: { line: 0, character: end } }, newText,
});

describe("safe language-server workspace edits", () => {
  it("applies edits against their original UTF-16 coordinates", () => {
    const result = applyScriptTextEdits("local old = old", [edit(6, 9, "newName"), edit(12, 15, "newName")]);
    expect(result.match((value) => value, () => null)).toBe("local newName = newName");
  });

  it("rejects overlap, reversed ranges and invalid positions", () => {
    expect(applyScriptTextEdits("abcdef", [edit(0, 3, "x"), edit(2, 4, "y")]).isErr()).toBe(true);
    expect(applyScriptTextEdits("abcdef", [edit(4, 3, "x")]).isErr()).toBe(true);
    expect(applyScriptTextEdits("abcdef", [edit(0, 8, "x")]).isErr()).toBe(true);
  });

  it("builds a complete multi-file edit before any mutation and rejects stale or readonly targets", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    let workspace = ensureScriptWorkspace({}, context);
    workspace = upsertScriptSourceFile(workspace, "Data/Scripts/src/a.lua", "old");
    workspace = upsertScriptSourceFile(workspace, "Data/Scripts/src/b.lua", "old");
    const changes = { changes: {
      "a": [edit(0, 3, "fresh")], "b": [edit(0, 3, "fresh")],
    } };
    const resolve = (uri: string) => `Data/Scripts/src/${uri}.lua`;
    const result = buildScriptWorkspaceEdits(workspace, changes, resolve, () => 1);
    expect(result.match((files) => files.map((file) => [file.expectedContent, file.content]), () => null)).toEqual([["old", "fresh"], ["old", "fresh"]]);
    expect(workspace.sourceFiles["Data/Scripts/src/a.lua"]?.content).toBe("old");
    expect(buildScriptWorkspaceEdits(workspace, { documentChanges: [{ textDocument: { uri: "a", version: 2 }, edits: [edit(0, 3, "x")] }] }, resolve, () => 1).isErr()).toBe(true);
    expect(buildScriptWorkspaceEdits(workspace, { changes: { "missing": [edit(0, 3, "x")] } }, resolve, () => 1).isErr()).toBe(true);
    expect(buildScriptWorkspaceEdits(workspace, { changes: { "main": [edit(0, 3, "x")] } }, resolve, () => 1).isErr()).toBe(true);
    expect(buildScriptWorkspaceEdits(workspace, { documentChanges: [{ kind: "rename", oldUri: "a", newUri: "b" }] }, resolve, () => 1).isErr()).toBe(true);
  });
});
