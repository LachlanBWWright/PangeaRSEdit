import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { compileScriptWorkspace, createScriptWorkspaceContext, ensureScriptWorkspace, type ScriptDiagnostic } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { filterScriptDiagnostics, resolveScriptDiagnosticLocation, scriptDiagnosticStatusMessage } from "@/editor/subviews/scripts/scriptDiagnosticsView";

const workspace = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 1));
const diagnostic: ScriptDiagnostic = {category: "source-validation", severity: "error", message: "Unknown callback name", code: "unknown-hook", filePath: "Data/Scripts/src/example.lua", line: 4, column: 2};

describe("script diagnostic view", () => {
  it("combines severity and case-insensitive searches across message, file, category and code", () => {
    const warnings: ScriptDiagnostic = {...diagnostic, severity: "warning", category: "luals", message: "Unused local speed", code: 101};
    expect(filterScriptDiagnostics([diagnostic, warnings], "warning", " SPEED ")).toEqual([warnings]);
    expect(filterScriptDiagnostics([diagnostic, warnings], "error", "example.lua")).toEqual([diagnostic]);
    expect(filterScriptDiagnostics([diagnostic, warnings], "all", "language server")).toEqual([warnings]);
    expect(filterScriptDiagnostics([diagnostic, warnings], "all", "101")).toEqual([warnings]);
    expect(filterScriptDiagnostics([diagnostic, warnings], "error", "speed")).toEqual([]);
  });
  it("does not imply that missing, external or unknown workspace locations are navigable", () => {
    expect(resolveScriptDiagnosticLocation(workspace, diagnostic)).toBeNull();
    expect(resolveScriptDiagnosticLocation(workspace, {...diagnostic, filePath: "runtime"})).toBeNull();
    expect(resolveScriptDiagnosticLocation(undefined, diagnostic)).toBeNull();
  });
  it("normalizes absent line numbers only for available sources and identifies generated sources as read-only", () => {
    const source = Object.values(workspace.sourceFiles).find(file => !file.readOnly);
    const generated = Object.values(workspace.sourceFiles).find(file => file.readOnly);
    expect(source).toBeDefined();
    expect(generated).toBeDefined();
    if (!source || !generated) return;
    const resolved = resolveScriptDiagnosticLocation(workspace, {...diagnostic, filePath: source.path, line: 0, column: 0});
    expect(resolved?.diagnostic.line).toBe(1);
    expect(resolved?.diagnostic.column).toBe(1);
    expect(resolved?.readOnly).toBe(false);
    expect(resolveScriptDiagnosticLocation(workspace, {...diagnostic, filePath: generated.path})?.readOnly).toBe(true);
  });
  it("maps matching build output to source and keeps stale build output read-only", () => {
    const compiled = compileScriptWorkspace(workspace);
    expect(compiled.isOk()).toBe(true);
    if (compiled.isErr()) return;
    const source = Object.values(compiled.value.sourceFiles).find(file => !file.readOnly);
    const output = Object.values(compiled.value.compiledFiles).find(file => file.sourcePath === source?.path);
    expect(source).toBeDefined();
    expect(output).toBeDefined();
    if (!source || !output) return;
    const issue = {...diagnostic, filePath: output.path};
    expect(resolveScriptDiagnosticLocation(compiled.value, issue)?.diagnostic.filePath).toBe(source.path);
    expect(resolveScriptDiagnosticLocation(compiled.value, issue)?.readOnly).toBe(false);
    const stale = {...compiled.value, sourceFiles: {...compiled.value.sourceFiles, [source.path]: {...source, content: `${source.content}\n-- changed`}}};
    expect(resolveScriptDiagnosticLocation(stale, issue)?.diagnostic.filePath).toBe(output.path);
    expect(resolveScriptDiagnosticLocation(stale, issue)?.readOnly).toBe(true);
  });
  it("distinguishes never validated, current validated, stale and errored workspaces", () => {
    expect(scriptDiagnosticStatusMessage(workspace, [])).toContain("Not validated yet");
    expect(scriptDiagnosticStatusMessage(undefined, [])).not.toContain("validated");
    const compiled = compileScriptWorkspace(workspace);
    expect(compiled.isOk()).toBe(true);
    if (compiled.isErr()) return;
    expect(scriptDiagnosticStatusMessage(compiled.value, [])).toBe("Current code validated with no reported issues.");
    const source = Object.values(compiled.value.sourceFiles).find(file => !file.readOnly);
    if (!source) return;
    const stale = {...compiled.value, sourceFiles: {...compiled.value.sourceFiles, [source.path]: {...source, content: `${source.content}\n-- changed`}}};
    expect(scriptDiagnosticStatusMessage(stale, [])).toContain("Code changed since validation");
    expect(scriptDiagnosticStatusMessage({...compiled.value, diagnostics: [diagnostic]}, [diagnostic])).toContain("validation errors");
    expect(scriptDiagnosticStatusMessage(compiled.value, [{...diagnostic, category: "runtime-traceback"}])).toContain("Review the reported issues");
  });
});
