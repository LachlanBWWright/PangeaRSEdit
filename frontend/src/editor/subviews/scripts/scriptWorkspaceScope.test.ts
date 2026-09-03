import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import {
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  loadScriptSample,
  replaceScriptWorkspace,
} from "./scriptWorkspaceState";

describe("script workspace scope", () => {
  it("shares custom object definitions across levels while keeping placements separate", () => {
    const levelOneContext = createScriptWorkspaceContext(OttoGlobals, 0);
    const levelTwoContext = createScriptWorkspaceContext(OttoGlobals, 1);
    const workspace = loadScriptSample(levelOneContext, "hover-beacon");
    const store = replaceScriptWorkspace({}, workspace);

    const levelTwoWorkspace = ensureScriptWorkspace(store, levelTwoContext);

    expect(levelTwoWorkspace.customObjects).toHaveLength(1);
    expect(
      levelTwoWorkspace.levels[levelTwoContext.levelKey]?.customPlacements,
    ).toHaveLength(0);
    expect(
      workspace.levels[levelOneContext.levelKey]?.customPlacements,
    ).toHaveLength(1);
  });
});
