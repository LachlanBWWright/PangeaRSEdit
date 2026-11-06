import { describe, expect, it } from "vitest";
import { Game, OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { objectPlayback, objectPreviewSelection } from "./scriptObjectPreview";

describe("applied appearance preview", () => {
  const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
  it("uses the full native level bank and preserves the selected object", () => {
    const definition = workspace.customObjects[0];
    if (!definition) return expect.fail("Missing sample definition");
    const selected = { ...definition, visual: { kind: "nativeDisplayGroup", group: "levelSpecific", modelObject: 36, scale: 3, slot: 450 } } satisfies typeof definition;
    expect(objectPreviewSelection(Game.OTTO_MATIC, workspace, selected)).toEqual({ modelPath: "Models/level1_farm.bg3d", skeletonPath: "", modelObject: 36 });
    expect(selected.visual.scale).toBe(3);
  });
  it("uses native skeleton animation and speed instead of browser defaults", () => {
    const definition = workspace.customObjects[0];
    if (!definition) return expect.fail("Missing sample definition");
    const selected = { ...definition, visual: { kind: "nativeSkeleton", skeletonType: 3, initialAnimation: 2, animationSpeed: 1.75, scale: 3, slot: 450 } } satisfies typeof definition;
    expect(objectPreviewSelection(Game.OTTO_MATIC, workspace, selected)).toEqual({ modelPath: "Skeletons/Onion.bg3d", skeletonPath: "Skeletons/Onion.skeleton", modelObject: 0 });
    expect(objectPlayback(selected)).toEqual({ initialClip: 2, speed: 1.75 });
  });
});
