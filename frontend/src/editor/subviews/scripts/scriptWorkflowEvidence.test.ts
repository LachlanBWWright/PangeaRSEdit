import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { compileScriptWorkspace, createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { getScriptWorkspaceRevision } from "./scriptWorkflowEvidence";
import { getScriptDiagnosticTarget } from "./scriptDiagnosticTarget";

const sample = () => loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");

describe("scripting workflow evidence", () => {
  it("ignores validation, selection and checkpoint metadata, including compilation", () => {
    const workspace = sample();
    const revision = getScriptWorkspaceRevision(workspace);
    expect(getScriptWorkspaceRevision({ ...workspace, activeFilePath: "elsewhere", statusLog: ["validated"], sourceFiles: Object.fromEntries(Object.entries(workspace.sourceFiles).reverse().map(([path, source]) => [path, { ...source, savedContent: "checkpoint" }])) })).toBe(revision);
    const compiled = compileScriptWorkspace(workspace);
    expect(compiled.isOk()).toBe(true);
    if (compiled.isOk()) expect(getScriptWorkspaceRevision(compiled.value)).toBe(revision);
  });

  it("invalidates evidence for definition, placement, source and asset changes", () => {
    const workspace = sample();
    const revision = getScriptWorkspaceRevision(workspace);
    expect(getScriptWorkspaceRevision({ ...workspace, customObjects: workspace.customObjects.map((object) => ({ ...object, exportName: "Changed" })) })).not.toBe(revision);
    expect(getScriptWorkspaceRevision({ ...workspace, sourceFiles: { ...workspace.sourceFiles, added: { path: "added", content: "return {}", savedContent: "return {}", language: "lua", role: "user", readOnly: false } } })).not.toBe(revision);
    const withAsset = { ...workspace, assets: { asset: { path: "asset", sourceName: "asset", bytes: new Uint8Array([1, 2]) } } };
    expect(getScriptWorkspaceRevision(withAsset)).not.toBe(getScriptWorkspaceRevision({ ...withAsset, assets: { asset: { ...withAsset.assets.asset, bytes: new Uint8Array([1, 3]) } } }));
    expect(getScriptWorkspaceRevision({ ...workspace, levels: {} })).not.toBe(revision);
  });

  it("maps generated diagnostics back to source and preserves exact location", () => {
    const result = compileScriptWorkspace(sample());
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const file = Object.values(result.value.compiledFiles)[0];
    expect(file).toBeDefined();
    if (!file) return;
    expect(getScriptDiagnosticTarget(result.value, { category: "source-validation", severity: "error", code: "syntax", filePath: file.path, line: 17, column: 4, message: "unexpected symbol" })).toEqual({ kind: "source", path: file.sourcePath, line: 17, column: 4 });
  });

  it("locates explicit object and placement errors without guessing ambiguous config references", () => {
    const workspace = sample();
    const object = workspace.customObjects[0];
    const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
    expect(object).toBeDefined();
    expect(placement).toBeDefined();
    if (!object || !placement) return;
    const diagnostic = { category: "packaging", severity: "error", code: "package.action", filePath: "Data/Scripts/config", line: 0, column: 0, message: `Custom object '${object.id}' references missing model asset` } satisfies Parameters<typeof getScriptDiagnosticTarget>[1];
    expect(getScriptDiagnosticTarget(workspace, diagnostic)).toEqual({ kind: "definition", objectId: object.id });
    expect(getScriptDiagnosticTarget(workspace, { ...diagnostic, message: `Placement '${placement.id}' has invalid parameters` })).toEqual({ kind: "placement", placementId: placement.id });
    expect(getScriptDiagnosticTarget(workspace, { ...diagnostic, message: "Could not read package" })).toBeNull();
  });
});
