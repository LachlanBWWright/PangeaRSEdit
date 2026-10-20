import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";
import { buildScriptReferenceTypes, referenceTypeFields } from "./scriptReferenceTypes";
import { buildModuleHookSnippets } from "./scriptHookSnippets";

describe("Lua authoring reference", () => {
  it("shows inherited context fields once and preserves native ID aliases", () => {
    const workspace = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
    const types = buildScriptReferenceTypes(workspace);
    const fields = referenceTypeFields(types, "DamageContext");
    expect(fields.filter((field) => field === "gameId string")).toHaveLength(1);
    expect(fields).toContain("damage number");
    expect(fields).toContain("levelNum number");
    expect(types.get("NativeSpawnId")?.alias).toContain("Numeric terrain item type ID");
    expect(referenceTypeFields(types, "DamageResult")).toContain("applyDamage boolean|nil");
  });

  it("inserts module hooks and object methods on their exported tables", () => {
    const module = buildModuleHookSnippets("local entry = {}\nreturn entry", ["onDamage"]);
    expect(module[0]?.insertText).toContain("function entry.onDamage(ctx)");
    expect(module[0]?.insertText).not.toContain("handled = false");
    const object = buildModuleHookSnippets("local beacon = {}\nreturn { Beacon = beacon }", ["onFrame"]);
    expect(object.find((snippet) => snippet.name === "onDestroy")?.insertText).toContain("function beacon.onDestroy(self, ctx)");
    expect(object.some((snippet) => snippet.name === "onFrame")).toBe(false);
    expect(object.find((snippet) => snippet.name === "onAnimationEvent")?.insertText).toContain("---@param ctx AnimationMarkerObjectFrameContext");
    expect(buildModuleHookSnippets("return {}", ["onFrame"])).toEqual([]);
  });
});
