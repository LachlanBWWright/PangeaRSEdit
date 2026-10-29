import { describe, expect, it } from "vitest";
import { OttoGlobals, NanosaurGlobals } from "@/data/globals/globals";
import { createObjectDefinition } from "./scriptObjectActions";
import { OTTO_OBJECT_STARTERS } from "./scriptOttoObjectStarters";
import { validateObjectParameters } from "./scriptObjectParameters";
import { buildScriptDefinitionBundle, importScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { createScriptWorkspaceContext, ensureScriptWorkspace, compileScriptWorkspace } from "./scriptWorkspaceState";

describe("Otto gameplay object starters", () => {
  it.each(OTTO_OBJECT_STARTERS)("materializes $label with actual configurable behavior and preserves its editable definition", (starter) => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const result = createObjectDefinition(ensureScriptWorkspace({}, context), "My new object", starter.id);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const definition = result.value.state.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    expect(definition.controllerOwnership).toBe("script");
    expect(definition.collision.kind).toBe("preset");
    expect(validateObjectParameters(definition.parameterDefinitions ?? []).isOk()).toBe(true);
    const source = result.value.state.sourceFiles[definition.sourceFilePath]?.content ?? "";
    expect(source).toContain(`${definition.exportName} = object`);
    expect(source).not.toContain("__PANGEA_CUSTOM_OBJECT_EXPORT__");
    expect(source).not.toMatch(/Earth|Farm|levelNum\s*==/);
    for (const parameter of definition.parameterDefinitions ?? []) {
      expect(source).toMatch(new RegExp(`(?:settings|self.parameters)\\.${parameter.id}\\b`));
    }
    expect(compileScriptWorkspace(result.value.state).isOk()).toBe(true);
    const bundle = buildScriptDefinitionBundle(result.value.state);
    expect(bundle.isOk()).toBe(true);
    if (bundle.isErr()) return;
    const imported = importScriptDefinitionBundle(bundle.value, context);
    expect(imported.isOk()).toBe(true);
    if (imported.isOk()) expect(imported.value.definitions).toEqual([definition]);
  });

  it("offers the four gameplay starters for Otto without changing other games' catalogs", () => {
    const otto = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
    const nanosaur = ensureScriptWorkspace({}, createScriptWorkspaceContext(NanosaurGlobals, 0));
    expect(otto.behaviorCatalog.filter((entry) => entry.id.startsWith("otto.custom."))).toHaveLength(4);
    expect(nanosaur.behaviorCatalog.some((entry) => entry.id.startsWith("otto.custom."))).toBe(false);
  });
});
