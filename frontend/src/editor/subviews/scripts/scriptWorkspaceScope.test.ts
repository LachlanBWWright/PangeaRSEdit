import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import {
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  loadScriptSample,
  replaceTerrainItemWithCustomObject,
  replaceScriptWorkspace,
} from "./scriptWorkspaceState";
import { getWorkspaceWarnings } from "./scriptCapabilityMatrix";

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

  it("surfaces native replacement dependencies before preview", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const replacement = replaceTerrainItemWithCustomObject(workspace, {
      id: "replacement-1",
      itemIndex: 1,
      nativeType: 4,
      x: 10,
      z: 20,
      customObjectId: workspace.customObjects[0]?.id ?? "missing-object",
      strict: false,
    });

    expect(getWorkspaceWarnings(replacement)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("requires native dependency"),
      ]),
    );
  });
});
