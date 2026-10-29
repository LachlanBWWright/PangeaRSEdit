import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { getObjectDefinitionScope, getParameterInheritance } from "./scriptObjectScope";
import type { ScriptObjectParameter } from "./scriptObjectParameterTypes";

describe("definition scope", () => {
  it("counts valid overrides across levels and keeps replacement rules distinct from placements", () => {
    const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    const definition = workspace.customObjects[0];
    const level = workspace.levels[workspace.context.levelKey];
    const placement = level?.customPlacements[0];
    expect(placement).toBeDefined();
    if (!definition || !level || !placement) return;
    const parameter: ScriptObjectParameter = { kind: "number", id: "health", label: "Health", defaultValue: 10, min: 1 };
    const state = { ...workspace, levels: {
      [workspace.context.levelKey]: { ...level, customPlacements: [placement, { ...placement, id: "same-as-default", parameterOverrides: { health: 10 } }] },
      other: { ...level, customPlacements: [{ ...placement, id: "invalid", levelKey: "other", parameterOverrides: { health: "invalid" } }, { ...placement, id: "different", levelKey: "other", objectId: "other-object" }], terrainReplacements: [{ id: "rule", itemIndex: 0, nativeType: 1, x: 0, z: 0, customObjectId: definition.id, strict: false }] },
    } };
    expect(getObjectDefinitionScope(state, definition.id).placements).toHaveLength(3);
    expect(getParameterInheritance(state, definition, parameter)).toEqual({ inheriting: 2, overridden: 1, replacementRules: 1 });
  });
});
