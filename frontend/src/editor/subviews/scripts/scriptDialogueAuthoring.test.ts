import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";
import { buildDialogueSource, createDialogueLine, dialogueDraftSchema, removeDialogueLine, saveDialogueModule } from "./scriptDialogueAuthoring";
import { AUTHORITATIVE_API_SCHEMA } from "./scriptApiSchema";

describe("dialogue authoring", () => {
  it("validates graph destinations and UTF-8 byte limits", () => {
    const first = createDialogueLine([]);
    expect(dialogueDraftSchema.safeParse({ id: "intro", nodes: [{ ...first, next: "missing" }] }).success).toBe(false);
    expect(dialogueDraftSchema.safeParse({ id: "intro", nodes: [{ ...first, text: "é".repeat(256) }] }).success).toBe(false);
    expect(dialogueDraftSchema.safeParse({ id: "intro", nodes: [{ ...first, text: "null\0byte" }] }).success).toBe(false);
  });

  it("repairs destinations when deleting a line", () => {
    const first = createDialogueLine([]);
    const second = createDialogueLine([first]);
    const draft = { id: "intro", nodes: [{ ...first, next: second.id, choices: [{ id: "continue", text: "Continue", next: second.id }] }, second] };
    const updated = removeDialogueLine(draft, second.id);
    expect(updated.nodes[0]?.next).toBe("end");
    expect(updated.nodes[0]?.choices[0]?.next).toBe("end");
  });

  it("generates bounded Lua nodes and game-specific lifecycle hooks", () => {
    const node = { ...createDialogueLine([]), text: 'A "quoted" line\nwith a slash \\' };
    const draft = { id: "intro", nodes: [node] };
    const source = buildDialogueSource(draft, "CroMagRally-Android");
    expect(source).toContain("onRaceStart = function()");
    expect(source).toContain('A \\"quoted\\" line\\010with a slash \\\\');
    expect(source).toContain("next=0");
    expect(buildDialogueSource(draft, "MightyMike-Android")).toContain("onAreaStart = function()");
  });

  it("creates a real workspace module without replacing existing assignments", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = ensureScriptWorkspace({}, context);
    const saved = saveDialogueModule(workspace, { id: "intro", nodes: [createDialogueLine([])] });
    expect(saved.isOk()).toBe(true);
    if (saved.isErr()) return;
    expect(saved.value.sourceFiles["Data/Scripts/src/dialogue_intro.lua"]?.content).toContain("pangea.dialogue.define");
    expect(saved.value.behaviorCatalog.some((behavior) => behavior.id === "dialogue.intro")).toBe(true);
    expect(saved.value.levels[context.levelKey]?.globalHooks).toEqual(workspace.levels[context.levelKey]?.globalHooks);
    expect(saveDialogueModule(saved.value, { id: "intro", nodes: [createDialogueLine([])] }).isErr()).toBe(true);
  });

  it("advertises dialogue results and presentation APIs for every game", () => {
    expect(AUTHORITATIVE_API_SCHEMA.apis.some((api) => api.name === "pangea.dialogue.start")).toBe(true);
    for (const game of AUTHORITATIVE_API_SCHEMA.games) expect(game.supportedHooks).toContain("onDialogueResult");
  });

  it("accepts expanded game sounds and rejects sounds from a different game", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = ensureScriptWorkspace({}, context);
    const node = createDialogueLine([]);
    expect(saveDialogueModule(workspace, { id: "intro", nodes: [{ ...node, voice: "checkpoint.activate" }] }).isOk()).toBe(true);
    expect(saveDialogueModule(workspace, { id: "intro", nodes: [{ ...node, voice: "weapon.reload" }] }).isErr()).toBe(true);
  });
});
