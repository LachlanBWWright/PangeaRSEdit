import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { lspRangeSchema } from "./scriptLspSchemas";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

export const scriptTextEditSchema = z.object({ range: lspRangeSchema, newText: z.string() });
const workspaceEditSchema = z.object({
  changes: z.record(z.string(), z.array(scriptTextEditSchema)).optional(),
  documentChanges: z.array(z.object({
    textDocument: z.object({ uri: z.string(), version: z.number().int().nullable().optional() }),
    edits: z.array(scriptTextEditSchema),
  })).optional(),
});

export interface ScriptWorkspaceFileEdit {
  readonly filePath: string;
  readonly expectedContent: string;
  readonly content: string;
}

function positionOffset(content: string, line: number, character: number): Result<number, string> {
  const lines = content.split("\n");
  const selectedLine = lines[line];
  if (selectedLine === undefined || character > selectedLine.replace(/\r$/, "").length) {
    return err("LuaLS returned an edit outside the source file.");
  }
  return ok(lines.slice(0, line).reduce((offset, text) => offset + text.length + 1, 0) + character);
}

export function applyScriptTextEdits(content: string, input: unknown): Result<string, string> {
  const parsed = z.array(scriptTextEditSchema).safeParse(input);
  if (!parsed.success) return err("LuaLS returned invalid text edits.");
  const edits: { start: number; end: number; text: string }[] = [];
  for (const edit of parsed.data) {
    const start = positionOffset(content, edit.range.start.line, edit.range.start.character);
    const end = positionOffset(content, edit.range.end.line, edit.range.end.character);
    if (start.isErr()) return err(start.error);
    if (end.isErr()) return err(end.error);
    if (end.value < start.value) return err("LuaLS returned a reversed edit range.");
    edits.push({ start: start.value, end: end.value, text: edit.newText });
  }
  edits.sort((left, right) => right.start - left.start || right.end - left.end);
  let output = content;
  let previousStart = content.length + 1;
  for (const edit of edits) {
    if (edit.end > previousStart) return err("LuaLS returned overlapping text edits.");
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    previousStart = edit.start;
  }
  return ok(output);
}

export function buildScriptWorkspaceEdits(
  workspace: ScriptWorkspaceState,
  input: unknown,
  resolvePath: (uri: string) => string | null,
  currentVersion: (path: string) => number | null,
): Result<readonly ScriptWorkspaceFileEdit[], string> {
  const parsed = workspaceEditSchema.safeParse(input);
  if (!parsed.success) return err("LuaLS returned an unsupported workspace edit.");
  const documents = [
    ...Object.entries(parsed.data.changes ?? {}).map(([uri, edits]) => ({ uri, edits, version: null })),
    ...(parsed.data.documentChanges ?? []).map((entry) => ({
      uri: entry.textDocument.uri, edits: entry.edits, version: entry.textDocument.version ?? null,
    })),
  ];
  const output: ScriptWorkspaceFileEdit[] = [];
  const seen = new Set<string>();
  for (const document of documents) {
    const path = resolvePath(document.uri);
    if (path === null || seen.has(path)) return err("LuaLS returned an invalid or duplicated source path.");
    const source = workspace.sourceFiles[path];
    if (!source || source.readOnly) return err(`Cannot edit generated or missing file: ${path}`);
    const version = currentVersion(path);
    if (document.version !== null && document.version !== version) return err(`Source changed during rename: ${path}`);
    const edited = applyScriptTextEdits(source.content, document.edits);
    if (edited.isErr()) return err(edited.error);
    seen.add(path);
    output.push({ filePath: path, expectedContent: source.content, content: edited.value });
  }
  return ok(output);
}
