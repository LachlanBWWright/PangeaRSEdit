import { describe, expect, it, vi } from "vitest";
import { lspCompletionItemSchema, lspSignatureHelpSchema } from "./scriptLspSchemas";
import { lspDocumentation, mapLspCompletionItem } from "./scriptLspMapping";
import { apiHoverAtPosition } from "./scriptApiAssistance";

vi.mock("monaco-editor", () => ({ languages: {
  CompletionItemKind: { Function: 1, Property: 9 },
  CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
} }));

describe("Lua language assistance", () => {
  const range = { start: { line: 1, character: 2 }, end: { line: 1, character: 6 } };
  const fallback = { startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 7 };
  it("preserves LuaLS snippet edits, import edits and completion ordering", () => {
    const item = lspCompletionItemSchema.parse({
      label: "after", kind: 3, insertTextFormat: 2, insertText: "ignored",
      textEdit: { range, newText: "after(${1:seconds}, ${2:callback})" },
      additionalTextEdits: [{ range, newText: 'local time = require("time")' }],
      filterText: "after", sortText: "001", preselect: true,
      documentation: { kind: "markdown", value: "Schedule a **callback**." },
    });
    expect(mapLspCompletionItem(item, fallback)).toMatchObject({
      kind: 1, insertText: "after(${1:seconds}, ${2:callback})", insertTextRules: 4,
      range: fallback, filterText: "after", sortText: "001", preselect: true,
      additionalTextEdits: [{ range: fallback, text: 'local time = require("time")' }],
      documentation: { value: "Schedule a **callback**." },
    });
  });
  it("supports distinct insert and replacement ranges", () => {
    const item = lspCompletionItemSchema.parse({ label: "after", textEdit: { insert: range, replace: { ...range, end: { line: 1, character: 10 } }, newText: "after" } });
    expect(mapLspCompletionItem(item, fallback).range).toEqual({ insert: fallback, replace: { ...fallback, endColumn: 11 } });
  });
  it("accepts server signature offsets and escapes plain documentation", () => {
    const parsed = lspSignatureHelpSchema.safeParse({ signatures: [{ label: "helper(value)", parameters: [{ label: [7, 12] }], activeParameter: 0 }], activeSignature: 0 });
    expect(parsed.success).toBe(true);
    expect(lspDocumentation({ kind: "plaintext", value: "<value> *required*" })?.value).toBe("\\<value\\> \\*required\\*");
  });
  it("provides contract hover documentation without LuaLS", () => {
    const line = "pangea.spawn.scripted(\"custom.example\", position)";
    expect(apiHoverAtPosition("OttoMatic-Android", line, 17)).toContain("Spawns a custom scripted object.");
    expect(apiHoverAtPosition("OttoMatic-Android", line, 43)).toBeNull();
  });
});
