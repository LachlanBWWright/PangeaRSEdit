import { describe, expect, it } from "vitest";
import { Bugdom2Globals } from "@/data/globals/globals";
import { compileScriptWorkspace, createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";
import { createCustomObjectFromStarter, OBJECT_STARTERS } from "./scriptObjectStarters";

describe("new scripted item starters", () => {
  it.each(OBJECT_STARTERS)("creates an editable definition and working Lua package for $label", ({ id }) => {
    const current = ensureScriptWorkspace({}, createScriptWorkspaceContext(Bugdom2Globals, 1));
    const result = createCustomObjectFromStarter(current, id, "New item");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const definition = result.value.customObjects.at(-1);
    expect(definition).toBeDefined();
    if (!definition) return;
    const source = result.value.sourceFiles[definition.sourceFilePath];
    expect(source?.readOnly).toBe(false);
    expect(source?.content).toContain(`return { ${definition.exportName} = item }`);
    expect(source?.content).not.toContain("__PANGEA_CUSTOM_OBJECT_EXPORT__");
    expect(definition.collision.kind).toBe(id === "decoration" ? "none" : "preset");
    expect(compileScriptWorkspace(result.value).isOk()).toBe(true);
  });

  it("creates independent objects without duplicating their starter catalog entry", () => {
    const current = ensureScriptWorkspace({}, createScriptWorkspaceContext(Bugdom2Globals, 1));
    const first = createCustomObjectFromStarter(current, "enemy", "Robot");
    expect(first.isOk()).toBe(true);
    if (first.isErr()) return;
    const second = createCustomObjectFromStarter(first.value, "enemy", "Robot");
    expect(second.isOk()).toBe(true);
    if (second.isErr()) return;
    const robots = second.value.customObjects.filter((definition) => definition.label === "Robot");
    expect(new Set(robots.map((definition) => definition.id)).size).toBe(2);
    expect(new Set(robots.map((definition) => definition.sourceFilePath)).size).toBe(2);
    expect(second.value.behaviorCatalog.filter((behavior) => behavior.id === "starter.enemy")).toHaveLength(1);
  });

  it("rejects an empty label without changing the workspace", () => {
    const current = ensureScriptWorkspace({}, createScriptWorkspaceContext(Bugdom2Globals, 1));
    expect(createCustomObjectFromStarter(current, "pickup", "  ").isErr()).toBe(true);
    expect(current.customObjects).toHaveLength(0);
  });
});
