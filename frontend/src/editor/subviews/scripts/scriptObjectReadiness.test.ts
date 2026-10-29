import { describe, expect, it } from "vitest";
import { Game, OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { getObjectReadiness } from "./scriptObjectReadiness";
import { getScriptWorkspaceRevision } from "./scriptWorkflowEvidence";
import { getNativeModelAvailability } from "./scriptNativeModelAvailability";

const context = createScriptWorkspaceContext(OttoGlobals, 0);
const workspace = loadScriptSample(context, "hover-beacon");

describe("object readiness", () => {
  it("keeps logic-only objects valid without an appearance asset", () => {
    const object = workspace.customObjects[0];
    if (!object) return expect.fail("Sample must contain an object");
    const labels = getObjectReadiness(workspace, { ...object, visual: { kind: "none" } }).map((issue) => issue.label);
    expect(labels).not.toContain("Missing asset");
    expect(labels).toContain("Not validated");
    expect(labels).toContain("Not launched for this draft");
  });

  it("identifies missing source and physical skeleton resource bytes", () => {
    const object = workspace.customObjects[0];
    if (!object) return expect.fail("Sample must contain an object");
    const issues = getObjectReadiness(workspace, { ...object, sourceFilePath: "missing.lua", visual: { kind: "customSkeleton", modelPath: "Data/Scripts/assets/skeletons/crate.bg3d", skeletonPath: "Data/Scripts/assets/skeletons/crate.skeleton", animations: {}, initialAnimation: "idle", animationSpeed: 1, scale: 1, slot: 0 } });
    expect(issues.filter((issue) => issue.label === "Missing asset").map((issue) => issue.detail)).toEqual(["Data/Scripts/assets/skeletons/crate.bg3d", "Data/Scripts/assets/skeletons/crate.skeleton.rsrc"]);
    expect(issues.some((issue) => issue.label === "Missing source")).toBe(true);
  });

  it("distinguishes unused definitions from usage in a different level", () => {
    const object = workspace.customObjects[0];
    if (!object) return expect.fail("Sample must contain an object");
    expect(getObjectReadiness({ ...workspace, levels: {} }, object).map((issue) => issue.label)).toContain("No instances");
    const level = { globalHooks: [], terrainBindings: [], splineBindings: [], mapItemBindings: [], customPlacements: [], terrainReplacements: [{ id: "replacement", itemIndex: 0, nativeType: 1, x: 0, z: 0, customObjectId: object.id, strict: false }], mapReplacements: [], splineReplacements: [] };
    const issues = getObjectReadiness({ ...workspace, levels: { other: level } }, object);
    expect(issues.map((issue) => issue.label)).toContain("No instances in this level");
    expect(issues.map((issue) => issue.label)).not.toContain("No instances");
  });

  it("does not mistake lazily resolved project assets for missing uploaded bytes", () => {
    const object = workspace.customObjects[0];
    if (!object) return expect.fail("Sample must contain an object");
    const issues = getObjectReadiness(workspace, { ...object, assetId: "project-crate", visual: { kind: "customDisplayGroup", modelPath: "Data/Scripts/assets/models/crate.bg3d", modelObject: 0, scale: 1, slot: 0 } });
    expect(issues.some((issue) => issue.label === "Missing asset")).toBe(false);
  });

  it("invalidates launch and validation evidence after a draft changes", () => {
    const object = workspace.customObjects[0];
    if (!object) return expect.fail("Sample must contain an object");
    const revision = getScriptWorkspaceRevision(workspace);
    const evidence = { validatedRevision: revision, launchedRevision: revision };
    expect(getObjectReadiness(workspace, object, evidence).some((issue) => issue.label.includes("validation") || issue.label.includes("launched"))).toBe(false);
    const changed = { ...workspace, customObjects: [...workspace.customObjects, { ...object, id: "new-object" }] };
    expect(getObjectReadiness(changed, object, evidence).map((issue) => issue.label)).toContain("Changed since validation");
  });
});

describe("native model availability", () => {
  it("uses zero-based gameplay levels and actual bank bounds", () => {
    const object = workspace.customObjects[0];
    if (!object) return expect.fail("Sample must contain an object");
    const result = getNativeModelAvailability(Game.OTTO_MATIC, { ...object, visual: { kind: "nativeDisplayGroup", group: "levelSpecific", modelObject: 999999, scale: 1, slot: 0 } }, 6);
    expect(result?.status).toBe("Unavailable");
    expect(result?.detail).toContain("level6_jungle.bg3d");
  });

  it("checks classic games and prompts for unselected levels", () => {
    const object = workspace.customObjects[0];
    if (!object) return expect.fail("Sample must contain an object");
    const visual = { kind: "nativeDisplayGroup", group: "global", modelObject: 1, scale: 1, slot: 0 } satisfies import("./scriptWorkspaceStateTypes").ScriptCustomObjectDefinition["visual"];
    expect(getNativeModelAvailability(Game.BUGDOM, { ...object, visual }, 0)?.status).toBe("Available");
    expect(getNativeModelAvailability(Game.OTTO_MATIC, { ...object, visual }, null)?.status).toBe("Choose level");
    expect(getNativeModelAvailability(Game.OTTO_MATIC, { ...object, visual }, 10)?.status).toBe("Unavailable");
    expect(getNativeModelAvailability(Game.OTTO_MATIC, { ...object, visual }, 0)?.status).toBe("Available");
  });

  it.each([Game.OTTO_MATIC, Game.BUGDOM, Game.BUGDOM_2, Game.NANOSAUR, Game.NANOSAUR_2, Game.CRO_MAG, Game.BILLY_FRONTIER, Game.MIGHTY_MIKE])("checks real model index bounds for game %s", (game) => {
    const object = workspace.customObjects[0];
    if (!object) return expect.fail("Sample must contain an object");
    for (const group of ["global", "levelSpecific"] satisfies readonly ("global" | "levelSpecific")[]) {
      const visual = { kind: "nativeDisplayGroup", group, modelObject: 0, scale: 1, slot: 0 } satisfies import("./scriptWorkspaceStateTypes").ScriptCustomObjectDefinition["visual"];
      expect(getNativeModelAvailability(game, { ...object, visual }, 0)?.status).toBe("Available");
      expect(getNativeModelAvailability(game, { ...object, visual: { ...visual, modelObject: 9999 } }, 0)?.status).toBe("Unavailable");
    }
  });

  it("uses edited level metadata to select native banks", () => {
    const object = workspace.customObjects[0];
    if (!object) return expect.fail("Sample must contain an object");
    const definition = { ...object, visual: { kind: "nativeDisplayGroup", group: "levelSpecific", modelObject: 10, scale: 1, slot: 0 } } satisfies import("./scriptWorkspaceStateTypes").ScriptCustomObjectDefinition;
    expect(getNativeModelAvailability(Game.BILLY_FRONTIER, definition, 0)?.status).toBe("Available");
    expect(getNativeModelAvailability(Game.BILLY_FRONTIER, definition, 0, { "area.mode": "target-practice" })?.status).toBe("Unavailable");
    expect(getNativeModelAvailability(Game.NANOSAUR_2, definition, 0, { "level.biome": "desert" })?.detail).toContain("desert.bg3d");
    expect(getNativeModelAvailability(Game.BUGDOM_2, { ...definition, visual: { ...definition.visual, group: "global" } }, 0, { "level.bugdom2Area": "plumbing" })?.status).toBe("Unavailable");
  });
});
