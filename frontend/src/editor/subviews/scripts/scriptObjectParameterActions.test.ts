// @vitest-environment node
import "../../../../tests/setup/scriptLuaValidation";
import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample, updateCustomObjectDefinition } from "./scriptWorkspaceState";
import { removeObjectParameter, saveObjectParameter } from "./scriptObjectParameterActions";
import { createParameterDraft, parseParameterDraft } from "./scriptObjectParameterDraft";
import type { ScriptObjectParameter } from "./scriptObjectParameterTypes";

const interval: ScriptObjectParameter = { id: "interval", label: "Spawn interval", kind: "number", min: 1, max: 60, defaultValue: 5 };

function fixture() {
  const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
  const definition = workspace.customObjects[0];
  const level = workspace.levels[workspace.context.levelKey];
  const placement = level?.customPlacements[0];
  expect(definition).toBeDefined();
  expect(placement).toBeDefined();
  if (!definition || !level || !placement) return workspace;
  const updated = updateCustomObjectDefinition(workspace, { ...definition, parameterDefinitions: [interval] });
  return { ...updated, levels: {
    ...updated.levels,
    [workspace.context.levelKey]: { ...level, customPlacements: [{ ...placement, parameterOverrides: { interval: 2 } }] },
    other: { ...level, customPlacements: [{ ...placement, id: "other", levelKey: "other", parameterOverrides: { interval: 30, unrelated: true } }] },
  } };
}

describe("authoring behavior setting definitions", () => {
  it("adds a named setting and rejects duplicate identifiers and invalid defaults", () => {
    const workspace = fixture();
    const id = workspace.customObjects[0]?.id ?? "";
    const added = saveObjectParameter(workspace, id, { id: "active", label: "Active", kind: "boolean", defaultValue: true })._unsafeUnwrap();
    expect(added.customObjects[0]?.parameterDefinitions).toHaveLength(2);
    expect(saveObjectParameter(workspace, id, interval).isErr()).toBe(true);
    expect(saveObjectParameter(workspace, id, { ...interval, id: "invalid", defaultValue: 100 }).isErr()).toBe(true);
    expect(workspace.customObjects[0]?.parameterDefinitions).toEqual([interval]);
  });

  it("retains valid overrides and resets incompatible overrides across levels after a range edit", () => {
    const workspace = fixture();
    const result = saveObjectParameter(workspace, workspace.customObjects[0]?.id ?? "", { ...interval, max: 10 }, "interval")._unsafeUnwrap();
    expect(result.levels[workspace.context.levelKey]?.customPlacements[0]?.parameterOverrides).toEqual({ interval: 2 });
    expect(result.levels.other?.customPlacements[0]?.parameterOverrides).toEqual({ unrelated: true });
    expect(workspace.levels.other?.customPlacements[0]?.parameterOverrides?.interval).toBe(30);
  });

  it("protects identifiers used by Lua and removes deleted setting overrides everywhere", () => {
    const workspace = fixture();
    const id = workspace.customObjects[0]?.id ?? "";
    expect(saveObjectParameter(workspace, id, { ...interval, id: "renamed" }, "interval").isErr()).toBe(true);
    const removed = removeObjectParameter(workspace, id, "interval")._unsafeUnwrap();
    expect(removed.customObjects[0]?.parameterDefinitions).toEqual([]);
    expect(removed.levels[workspace.context.levelKey]?.customPlacements[0]?.parameterOverrides).toEqual({});
    expect(removed.levels.other?.customPlacements[0]?.parameterOverrides).toEqual({ unrelated: true });
    expect(removeObjectParameter(removed, id, "interval").isErr()).toBe(true);
  });

  it("clears incompatible values when changing a setting to a choice", () => {
    const workspace = fixture();
    const choice: ScriptObjectParameter = { id: "interval", label: "Speed", kind: "enum", defaultValue: "slow", options: [{ label: "Slow", value: "slow" }] };
    const updated = saveObjectParameter(workspace, workspace.customObjects[0]?.id ?? "", choice, "interval")._unsafeUnwrap();
    expect(updated.levels.other?.customPlacements[0]?.parameterOverrides).toEqual({ unrelated: true });
    expect(updated.customObjects[0]?.parameterDefinitions?.[0]).toEqual(choice);
  });

  it("parses draft numbers without turning a missing default into zero", () => {
    const draft = createParameterDraft(interval);
    expect(parseParameterDraft(draft)._unsafeUnwrap()).toEqual(interval);
    expect(parseParameterDraft({ ...draft, numberDefault: "" }).isErr()).toBe(true);
    expect(parseParameterDraft({ ...draft, step: "0" }).isErr()).toBe(true);
    expect(parseParameterDraft({ ...draft, min: "" })._unsafeUnwrap()).toEqual({ ...interval, min: undefined });
  });
});
