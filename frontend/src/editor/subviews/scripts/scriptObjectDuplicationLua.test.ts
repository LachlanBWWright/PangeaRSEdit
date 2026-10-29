// @vitest-environment node
import "../../../../tests/setup/scriptLuaValidation";
import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { compileScriptWorkspaceAsync, createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { duplicateScriptObject } from "./scriptObjectDuplication";

describe("duplicated behavior execution", () => {
  it("validates original and copied exports in the real Lua engine", async () => {
    const state = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    const original = state.customObjects[0];
    if (!original) { expect.fail("Missing bundled object"); return; }
    const copy = duplicateScriptObject(state, original.id);
    if (copy.isErr()) { expect.fail(copy.error); return; }
    const output = await compileScriptWorkspaceAsync(copy.value.state);
    expect(output.isErr() ? output.error : null).toBeNull();
  });
});
