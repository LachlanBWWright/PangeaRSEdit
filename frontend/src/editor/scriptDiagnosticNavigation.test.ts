// @vitest-environment node
import { describe, expect, it } from "vitest";
import { inspectorFixture } from "../../../packages/desktop-contracts/tests/scriptInspectorFixture";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample } from "./subviews/scripts/scriptWorkspaceState";
import type { ScriptSourceFile } from "./subviews/scripts/scriptWorkspaceStateTypes";
import { diagnosticPlacement, diagnosticSourceLocation, inspectorNavigationSnapshot } from "./scriptDiagnosticNavigation";

const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
const path = "Data/Scripts/src/diagnostic.lua";
const compiledPath = "Data/Scripts/dist/modules/diagnostic.lua";
const source = { path, content: "return {}", savedContent: "return {}", language: "lua", readOnly: false, role: "user" } satisfies ScriptSourceFile;
const withSource = { ...workspace, sourceFiles: { ...workspace.sourceFiles, [path]: source }, compiledFiles: { [compiledPath]: { path: compiledPath, content: source.content, sourcePath: path } } };

describe("runtime diagnostic navigation", () => {
  it("includes queried objects in navigation without changing runtime totals", () => {
    const object = inspectorFixture.objects[0];
    const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
    if (!object || !placement) return;
    const live = { ...object, id: 100, definition: placement.objectId, state: { __pangeaPlacementId: placement.id, __pangeaPlacementLevel: workspace.context.levelKey } };
    const initial = { ...inspectorFixture, registeredObjects: 130, truncated: true };
    const merged = inspectorNavigationSnapshot(initial, [live]);
    expect(diagnosticPlacement(workspace, merged, live)).toEqual({ target: placement.id });
    expect(merged?.registeredObjects).toBe(130);
    expect(merged?.truncated).toBe(true);
    expect(initial.objects).not.toContain(live);
  });
  it("resolves copied runtime modules to their editable source with the same line", () => {
    expect(diagnosticSourceLocation(withSource, `@/snapshot/${compiledPath}`, 14)).toEqual({ target: { path, line: 14 } });
    expect(diagnosticSourceLocation(withSource, compiledPath.replaceAll("/", "\\"), 14)).toEqual({ target: { path, line: 14 } });
  });
  it("opens changed drafts without claiming runtime line accuracy", () => {
    expect(diagnosticSourceLocation({ ...withSource, sourceFiles: { [path]: { ...source, content: "-- new line\nreturn {}" } } }, compiledPath, 14)).toEqual({ target: { path, line: 0 } });
  });
  it("does not guess source mappings for generated dispatchers, missing files, or unrelated basenames", () => {
    for (const location of ["Data/Scripts/dist/main.lua", "Data/Scripts/dist/modules/missing.lua", "diagnostic.lua", ""]) expect(diagnosticSourceLocation(withSource, location, 1).target).toBeUndefined();
    expect(diagnosticSourceLocation(withSource, path, -1)).toEqual({ target: { path, line: 0 } });
  });
  it("selects only an exact live handle with authored placement and definition provenance in the current level", () => {
    const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
    const object = inspectorFixture.objects[0];
    expect(placement).toBeDefined();
    expect(object).toBeDefined();
    if (!placement || !object) return;
    const live = { ...object, definition: placement.objectId, state: { __pangeaPlacementId: placement.id, __pangeaPlacementLevel: workspace.context.levelKey } };
    const snapshot = { ...inspectorFixture, objects: [live] };
    expect(diagnosticPlacement(workspace, snapshot, live)).toEqual({ target: placement.id });
    expect(diagnosticPlacement(workspace, { ...snapshot, objects: [{ ...live, definition: "", type: placement.objectId }] }, live)).toEqual({ target: placement.id });
    expect(diagnosticPlacement(workspace, { ...snapshot, objects: [{ ...live, definition: "other", type: placement.objectId }] }, live).target).toBeUndefined();
    expect(diagnosticPlacement(workspace, snapshot, { ...live, generation: live.generation + 1 }).target).toBeUndefined();
    expect(diagnosticPlacement(workspace, { ...snapshot, objects: [] }, live).target).toBeUndefined();
    expect(diagnosticPlacement(workspace, { ...snapshot, objects: [{ ...live, definition: "different" }] }, live).target).toBeUndefined();
    expect(diagnosticPlacement(workspace, { ...snapshot, objects: [{ ...live, state: { ...live.state, __pangeaPlacementLevel: "1" } }] }, live).target).toBeUndefined();
    expect(diagnosticPlacement(workspace, { ...snapshot, objects: [{ ...live, state: {} }] }, live).unavailable).toContain("native, dynamic");
  });
});
