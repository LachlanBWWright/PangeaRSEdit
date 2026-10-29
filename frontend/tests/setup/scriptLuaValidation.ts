import { vi } from "vitest";

// Node unit tests run controlled fixtures through the same Lua engine; browser
// acceptance tests retain the production worker and its termination boundary.
vi.mock("../../src/editor/subviews/scripts/scriptLuaValidation", async () => {
  const { validateLuaWorkspaceEngine } = await import("../../src/editor/subviews/scripts/scriptLuaValidationEngine");
  return { validateLuaWorkspace: validateLuaWorkspaceEngine };
});
